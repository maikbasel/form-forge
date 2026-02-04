use crate::config::S3Config;
use async_trait::async_trait;
use aws_config::BehaviorVersion;
use aws_sdk_s3::Client;
use aws_sdk_s3::config::{Credentials, Region};
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::primitives::ByteStream;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::SheetStoragePort;
use sheets_core::sheet::SheetReference;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tempfile::NamedTempFile;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tracing::{debug, info, instrument};
use url::Url;

pub struct SheetS3Storage {
    client: Client,
    /// Separate client configured with the public endpoint, used only for
    /// presigned URL generation so the signature matches the host the browser
    /// will actually connect to.
    presign_client: Client,
    bucket: String,
    /// Path prefix extracted from `S3_PUBLIC_ENDPOINT` (e.g. `/s3`). Re-inserted
    /// into presigned URLs after signing so the browser routes through the
    /// reverse proxy while the signature covers the path the storage backend sees.
    public_path_prefix: String,
}

impl SheetS3Storage {
    pub async fn new(cfg: S3Config) -> anyhow::Result<Self> {
        let credentials = Credentials::new(
            &cfg.access_key,
            &cfg.secret_key,
            None,
            None,
            "form-forge-s3",
        );

        let s3_config = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new(cfg.region.clone()))
            .endpoint_url(&cfg.endpoint)
            .credentials_provider(credentials.clone())
            .force_path_style(true)
            .build();

        let client = Client::from_conf(s3_config);

        // Build a second client whose endpoint matches the public URL so that
        // presigned-URL signatures are computed against the host the browser
        // will actually connect to (avoids SignatureDoesNotMatch).
        let presign_config = aws_sdk_s3::Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new(cfg.region))
            .endpoint_url(&cfg.public_endpoint)
            .credentials_provider(credentials)
            .force_path_style(true)
            .build();

        let presign_client = Client::from_conf(presign_config);

        info!(
            bucket = %cfg.bucket,
            endpoint = %cfg.endpoint,
            public_endpoint = %cfg.public_endpoint,
            public_path_prefix = %cfg.public_path_prefix,
            "S3 storage adapter initialized"
        );

        Ok(Self {
            client,
            presign_client,
            bucket: cfg.bucket,
            public_path_prefix: cfg.public_path_prefix,
        })
    }

    fn build_object_key(sheet_reference: &SheetReference) -> String {
        let file_name = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.name, ext),
            None => sheet_reference.name.clone(),
        };
        format!("sheets/{}/{}", sheet_reference.id, file_name)
    }

    /// Prepend `self.public_path_prefix` to the path component of a presigned
    /// URL. This is necessary when the public endpoint sits behind a reverse
    /// proxy that strips a path prefix before forwarding to the storage backend.
    /// The SDK signs the URL without the prefix (matching what the backend
    /// sees), and we re-insert it so the browser routes through the proxy.
    fn insert_path_prefix(&self, presigned_url: &str) -> Result<String, SheetError> {
        let mut parsed = Url::parse(presigned_url).map_err(|e| {
            SheetError::StorageError(std::io::Error::other(format!(
                "failed to parse presigned URL: {e}"
            )))
        })?;
        let new_path = format!("{}{}", self.public_path_prefix, parsed.path());
        parsed.set_path(&new_path);
        Ok(parsed.to_string())
    }
}

#[async_trait]
impl SheetStoragePort for SheetS3Storage {
    #[instrument(name = "s3.create", skip(self), level = "info", fields(sheet_id = %sheet_reference.id))]
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError> {
        let object_key = Self::build_object_key(&sheet_reference);

        debug!(?object_key, "uploading sheet to S3");

        let body = ByteStream::from_path(&sheet_reference.path)
            .await
            .map_err(|e| {
                SheetError::StorageError(std::io::Error::other(format!(
                    "failed to read file for upload: {e}"
                )))
            })?;

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&object_key)
            .content_type("application/pdf")
            .body(body)
            .send()
            .await
            .map_err(|e| {
                SheetError::StorageError(std::io::Error::other(format!("S3 upload failed: {e}")))
            })?;

        info!(%object_key, "uploaded sheet to S3");

        Ok(SheetReference::new(
            sheet_reference.id,
            sheet_reference.original_name,
            sheet_reference.name,
            sheet_reference.extension,
            PathBuf::from(&object_key),
        ))
    }

    #[instrument(name = "s3.read", skip(self), level = "info", fields(object_key = %path.display()))]
    async fn read(&self, path: PathBuf) -> Result<PathBuf, SheetError> {
        let object_key = path.to_string_lossy().to_string();

        debug!(%object_key, "downloading sheet from S3");

        let response = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&object_key)
            .send()
            .await
            .map_err(|e| SheetError::NotFound(format!("S3 object not found: {e}")))?;

        let data = response.body.collect().await.map_err(|e| {
            SheetError::StorageError(std::io::Error::other(format!(
                "failed to read S3 response body: {e}"
            )))
        })?;

        let temp_file = NamedTempFile::new().map_err(SheetError::StorageError)?;
        let temp_path = temp_file.into_temp_path().to_path_buf();

        let mut file = File::create(&temp_path)
            .await
            .map_err(SheetError::StorageError)?;
        file.write_all(&data.into_bytes())
            .await
            .map_err(SheetError::StorageError)?;
        file.flush().await.map_err(SheetError::StorageError)?;

        info!(temp_path = %temp_path.display(), "downloaded sheet from S3 to temp file");

        Ok(temp_path)
    }

    #[instrument(name = "s3.get_download_url", skip(self), level = "info")]
    async fn get_download_url(
        &self,
        path: &Path,
        filename: &str,
        expires_in_secs: u64,
    ) -> Result<String, SheetError> {
        let object_key = path.to_string_lossy().to_string();

        let presigning_config = PresigningConfig::builder()
            .expires_in(Duration::from_secs(expires_in_secs))
            .build()
            .map_err(|e| {
                SheetError::StorageError(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    format!("invalid presigning config: {e}"),
                ))
            })?;

        let content_disposition = format!("attachment; filename=\"{}\"", filename);

        let presigned_request = self
            .presign_client
            .get_object()
            .bucket(&self.bucket)
            .key(&object_key)
            .response_content_disposition(&content_disposition)
            .response_content_type("application/pdf")
            .presigned(presigning_config)
            .await
            .map_err(|e| {
                SheetError::StorageError(std::io::Error::other(format!(
                    "failed to generate presigned URL: {e}"
                )))
            })?;

        let mut url = presigned_request.uri().to_string();

        if !self.public_path_prefix.is_empty() {
            url = self.insert_path_prefix(&url)?;
        }

        info!(%url, "generated presigned download URL");

        Ok(url)
    }

    #[instrument(name = "s3.exists", skip(self), level = "info", fields(path = %path.display()))]
    async fn exists(&self, path: &Path) -> Result<bool, SheetError> {
        let object_key = path.to_string_lossy().to_string();

        match self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(&object_key)
            .send()
            .await
        {
            Ok(_) => {
                debug!(%object_key, "S3 object exists");
                Ok(true)
            }
            Err(sdk_err) => {
                // Check if it's a 404 Not Found error
                if let Some(service_err) = sdk_err.as_service_error()
                    && service_err.is_not_found()
                {
                    debug!(%object_key, "S3 object not found");
                    return Ok(false);
                }
                // Other errors are propagated
                Err(SheetError::StorageError(std::io::Error::other(format!(
                    "failed to check S3 object existence: {sdk_err}"
                ))))
            }
        }
    }
}

#[async_trait]
impl actions_core::ports::driven::SheetStoragePort for SheetS3Storage {
    #[instrument(name = "s3.read.action_port", skip(self, path), level = "info", err, fields(path = %path.display()))]
    async fn read(&self, path: PathBuf) -> Result<PathBuf, actions_core::error::ActionError> {
        <SheetS3Storage as SheetStoragePort>::read(self, path)
            .await
            .map_err(|_| actions_core::error::ActionError::FileNotFound)
    }

    #[instrument(name = "s3.write.action_port", skip(self), level = "info", err, fields(local_path = %local_path.display(), storage_path = %storage_path.display()))]
    async fn write(
        &self,
        local_path: PathBuf,
        storage_path: PathBuf,
    ) -> Result<(), actions_core::error::ActionError> {
        let object_key = storage_path.to_string_lossy().to_string();

        debug!(%object_key, "uploading modified sheet to S3");

        let body = ByteStream::from_path(&local_path).await.map_err(|e| {
            actions_core::error::ActionError::InvalidAction(format!(
                "failed to read file for upload: {e}"
            ))
        })?;

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&object_key)
            .content_type("application/pdf")
            .body(body)
            .send()
            .await
            .map_err(|e| {
                actions_core::error::ActionError::InvalidAction(format!("S3 upload failed: {e}"))
            })?;

        info!(%object_key, "uploaded modified sheet to S3");

        Ok(())
    }
}
