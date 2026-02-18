use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::sheet::SheetReference;
use std::path::{Path, PathBuf};
use tokio::fs;
use tracing::{debug, info, instrument};

pub struct SheetFsStorage {
    base_dir: PathBuf,
}

impl SheetFsStorage {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    fn build_object_path(&self, sheet_reference: &SheetReference) -> PathBuf {
        let file_name = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.name, ext),
            None => sheet_reference.name.clone(),
        };
        self.base_dir
            .join(sheet_reference.id.to_string())
            .join(file_name)
    }
}

#[async_trait]
impl sheets_core::ports::driven::SheetStoragePort for SheetFsStorage {
    #[instrument(name = "fs.create", skip(self), level = "info", fields(sheet_id = %sheet_reference.id))]
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError> {
        let target_path = self.build_object_path(&sheet_reference);

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(SheetError::StorageError)?;
        }

        debug!(from = %sheet_reference.path.display(), to = %target_path.display(), "copying sheet to local storage");

        fs::copy(&sheet_reference.path, &target_path)
            .await
            .map_err(SheetError::StorageError)?;

        info!(path = %target_path.display(), "stored sheet on filesystem");

        Ok(SheetReference::new(
            sheet_reference.id,
            sheet_reference.original_name,
            sheet_reference.name,
            sheet_reference.extension,
            target_path,
        ))
    }

    #[instrument(name = "fs.read", skip(self), level = "info", fields(path = %path.display()))]
    async fn read(&self, path: PathBuf) -> Result<PathBuf, SheetError> {
        if !fs::try_exists(&path)
            .await
            .map_err(SheetError::StorageError)?
        {
            return Err(SheetError::NotFound(path.display().to_string()));
        }
        debug!(path = %path.display(), "local file exists");
        Ok(path)
    }

    #[instrument(name = "fs.get_download_url", skip(self), level = "info")]
    async fn get_download_url(
        &self,
        path: &Path,
        _filename: &str,
        _expires_in_secs: u64,
    ) -> Result<String, SheetError> {
        Ok(path.display().to_string())
    }

    #[instrument(name = "fs.exists", skip(self), level = "info", fields(path = %path.display()))]
    async fn exists(&self, path: &Path) -> Result<bool, SheetError> {
        fs::try_exists(path).await.map_err(SheetError::StorageError)
    }
}

#[async_trait]
impl actions_core::ports::driven::SheetStoragePort for SheetFsStorage {
    #[instrument(name = "fs.read.action_port", skip(self), level = "info", err, fields(path = %path.display()))]
    async fn read(&self, path: PathBuf) -> Result<PathBuf, actions_core::error::ActionError> {
        <SheetFsStorage as sheets_core::ports::driven::SheetStoragePort>::read(self, path)
            .await
            .map_err(|_| actions_core::error::ActionError::FileNotFound)
    }

    #[instrument(name = "fs.write.action_port", skip(self), level = "info", err, fields(local_path = %local_path.display(), storage_path = %storage_path.display()))]
    async fn write(
        &self,
        local_path: PathBuf,
        storage_path: PathBuf,
    ) -> Result<(), actions_core::error::ActionError> {
        if local_path != storage_path {
            fs::copy(&local_path, &storage_path).await.map_err(|_| {
                actions_core::error::ActionError::InvalidAction(
                    "failed to copy modified file back to storage".to_string(),
                )
            })?;
        }

        info!(path = %storage_path.display(), "wrote modified sheet to filesystem");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sheets_core::ports::driven::SheetStoragePort;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_create_and_read() {
        let tmp = tempfile::tempdir().unwrap();
        let storage = SheetFsStorage::new(tmp.path().to_path_buf());

        let source = tmp.path().join("source.pdf");
        fs::write(&source, b"%PDF-1.4 test content").await.unwrap();

        let sheet_ref = SheetReference::new(
            Uuid::new_v4(),
            "test_sheet",
            "abcdef1234",
            Some("pdf"),
            source,
        );

        let result = storage.create(sheet_ref).await.unwrap();
        assert!(result.path.exists());

        let read_path = storage.read(result.path.clone()).await.unwrap();
        assert_eq!(read_path, result.path);
    }

    #[tokio::test]
    async fn test_read_nonexistent_returns_error() {
        let tmp = tempfile::tempdir().unwrap();
        let storage = SheetFsStorage::new(tmp.path().to_path_buf());

        let result = storage.read(PathBuf::from("/nonexistent/path.pdf")).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_exists() {
        let tmp = tempfile::tempdir().unwrap();
        let storage = SheetFsStorage::new(tmp.path().to_path_buf());

        let file = tmp.path().join("exists.pdf");
        fs::write(&file, b"content").await.unwrap();

        assert!(storage.exists(&file).await.unwrap());
        assert!(!storage.exists(Path::new("/nonexistent")).await.unwrap());
    }
}
