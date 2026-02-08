use crate::error::SheetError;
use crate::ports::driven::{
    FailedSheetDeletionPort, SheetPdfPort, SheetReferencePort, SheetStoragePort,
};
use crate::sheet::{Sheet, SheetField, SheetReference};
use async_trait::async_trait;
use chrono::{Duration, Utc};
#[cfg(test)]
use mockall::automock;
use std::path::Path;
use std::sync::Arc;
use tracing::{debug, error, info, instrument, warn};
use uuid::Uuid;

#[derive(Clone)]
pub struct SheetService {
    sheet_pdf_port: Arc<dyn SheetPdfPort>,
    sheet_storage_port: Arc<dyn SheetStoragePort>,
    sheet_reference_port: Arc<dyn SheetReferencePort>,
}

impl SheetService {
    pub fn new(
        sheet_pdf_port: Arc<dyn SheetPdfPort>,
        sheet_storage_port: Arc<dyn SheetStoragePort>,
        sheet_reference_port: Arc<dyn SheetReferencePort>,
    ) -> Self {
        Self {
            sheet_pdf_port,
            sheet_storage_port,
            sheet_reference_port,
        }
    }

    #[instrument(name = "sheets.import", skip(self, sheet), level = "info")]
    pub async fn import_sheet(&self, sheet: Sheet) -> Result<SheetReference, SheetError> {
        debug!("validating uploaded sheet path exists and is valid pdf");

        self.sheet_pdf_port
            .is_valid_pdf(&sheet)
            .await
            .map_err(SheetError::InvalidPdfFile)?;

        let original_name_and_extension = sheet.name.ok_or(SheetError::InvalidFileName)?;
        let path = Path::new(&original_name_and_extension);
        let original_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&original_name_and_extension)
            .to_string();
        let extension = path.extension().and_then(|e| e.to_str());

        let sheet_id = Uuid::new_v4();
        let name = Uuid::new_v4().simple().to_string(); // 32 hex chars, no hyphens

        info!(%sheet_id, original_name = %original_name, generated_name = %name, "creating sheet reference and persisting");

        let sheet_reference =
            SheetReference::new(sheet_id, original_name, name, extension, sheet.path);

        let sheet_reference = self.sheet_storage_port.create(sheet_reference).await?;

        info!(%sheet_id, path = %sheet_reference.path.display(), "stored sheet file on disk");

        self.sheet_reference_port.create(&sheet_reference).await?;

        info!(%sheet_id, "stored sheet reference in database");

        Ok(sheet_reference)
    }

    #[instrument(name = "sheets.export", skip(self), level = "info", fields(%sheet_id))]
    pub async fn export_sheet(&self, sheet_id: Uuid) -> Result<Sheet, SheetError> {
        let sheet_reference = self.sheet_reference_port.find_by_id(&sheet_id).await?;

        info!(path = %sheet_reference.path.display(), "found sheet reference");

        let file_path = self.sheet_storage_port.read(sheet_reference.path).await?;

        info!(path = %file_path.display(), "read sheet file from storage");

        let filename = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.original_name, ext),
            None => sheet_reference.original_name.clone(),
        };

        Ok(Sheet::new(file_path, Some(filename)))
    }

    #[instrument(name = "sheets.list_form_fields", skip(self), level = "info", fields(%sheet_id))]
    pub async fn list_sheet_form_fields(
        &self,
        sheet_id: Uuid,
    ) -> Result<Vec<SheetField>, SheetError> {
        let sheet_reference = self.sheet_reference_port.find_by_id(&sheet_id).await?;

        info!(path = %sheet_reference.path.display(), "found sheet reference");

        let file_path = self.sheet_storage_port.read(sheet_reference.path).await?;

        info!(path = %file_path.display(), "read sheet file from storage");

        self.sheet_pdf_port
            .list_form_fields(&Sheet::new(file_path, None))
            .await
    }

    /// Get sheet reference without downloading the file.
    #[instrument(name = "sheets.find", skip(self), level = "info", fields(%sheet_id))]
    pub async fn find_sheet(&self, sheet_id: Uuid) -> Result<SheetReference, SheetError> {
        self.sheet_reference_port.find_by_id(&sheet_id).await
    }

    /// Generate a pre-signed download URL for a sheet.
    #[instrument(name = "sheets.get_download_url", skip(self), level = "info")]
    pub async fn get_download_url(
        &self,
        path: &Path,
        filename: &str,
        expires_in_secs: u64,
    ) -> Result<String, SheetError> {
        self.sheet_storage_port
            .get_download_url(path, filename, expires_in_secs)
            .await
    }
}

/// Port for webhook-triggered cleanup operations.
#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetCleanupPort: Send + Sync {
    /// Delete a sheet reference from the database.
    /// Called when S3 object is deleted via lifecycle rule.
    async fn delete_reference(&self, sheet_id: &Uuid) -> Result<(), SheetError>;

    /// Record a failed deletion for later retry.
    async fn record_failed_deletion(
        &self,
        sheet_id: &Uuid,
        s3_key: &str,
        error: &str,
    ) -> Result<(), SheetError>;

    /// Reconcile orphaned sheet references where S3 object no longer exists.
    /// Returns the number of references cleaned up.
    async fn reconcile_orphaned_references(&self, ttl_days: i64) -> Result<u64, SheetError>;

    /// Process failed deletions from the dead letter table.
    /// Returns the number of successfully retried deletions.
    async fn process_failed_deletions(&self, max_retries: i32) -> Result<u64, SheetError>;
}

/// Service implementation for cleanup operations.
#[derive(Clone)]
pub struct SheetCleanupService {
    sheet_reference_port: Arc<dyn SheetReferencePort>,
    sheet_storage_port: Arc<dyn SheetStoragePort>,
    failed_deletion_port: Arc<dyn FailedSheetDeletionPort>,
}

impl SheetCleanupService {
    pub fn new(
        sheet_reference_port: Arc<dyn SheetReferencePort>,
        sheet_storage_port: Arc<dyn SheetStoragePort>,
        failed_deletion_port: Arc<dyn FailedSheetDeletionPort>,
    ) -> Self {
        Self {
            sheet_reference_port,
            sheet_storage_port,
            failed_deletion_port,
        }
    }
}

#[async_trait]
impl SheetCleanupPort for SheetCleanupService {
    #[instrument(name = "cleanup.delete_reference", skip(self), level = "info", fields(%sheet_id))]
    async fn delete_reference(&self, sheet_id: &Uuid) -> Result<(), SheetError> {
        self.sheet_reference_port.delete(sheet_id).await?;
        info!(%sheet_id, "deleted sheet reference from database");
        Ok(())
    }

    #[instrument(name = "cleanup.record_failed_deletion", skip(self), level = "warn", fields(%sheet_id))]
    async fn record_failed_deletion(
        &self,
        sheet_id: &Uuid,
        s3_key: &str,
        error: &str,
    ) -> Result<(), SheetError> {
        self.failed_deletion_port
            .record_failure(sheet_id, s3_key, error)
            .await?;
        warn!(%sheet_id, %s3_key, "recorded failed deletion for retry");
        Ok(())
    }

    #[instrument(name = "cleanup.reconcile_orphaned", skip(self), level = "info")]
    async fn reconcile_orphaned_references(&self, ttl_days: i64) -> Result<u64, SheetError> {
        // Query sheets older than TTL + 1 day buffer
        let buffer_days = 1;
        let cutoff = Utc::now() - Duration::days(ttl_days + buffer_days);
        let candidates = self.sheet_reference_port.find_older_than(cutoff).await?;

        let mut deleted = 0u64;
        for sheet in candidates {
            // Check if S3 object still exists
            match self.sheet_storage_port.exists(&sheet.path).await {
                Ok(true) => {
                    debug!(sheet_id = %sheet.id, "S3 object still exists, skipping");
                }
                Ok(false) => {
                    // Object gone, safe to delete reference
                    if let Err(e) = self.sheet_reference_port.delete(&sheet.id).await {
                        error!(sheet_id = %sheet.id, error = %e, "failed to delete orphaned reference");
                    } else {
                        deleted += 1;
                        info!(sheet_id = %sheet.id, "reconciled orphaned sheet reference");
                    }
                }
                Err(e) => {
                    warn!(sheet_id = %sheet.id, error = %e, "failed to check S3 object existence");
                }
            }
        }

        info!(deleted, "reconciliation complete");
        Ok(deleted)
    }

    #[instrument(name = "cleanup.process_failed", skip(self), level = "info")]
    async fn process_failed_deletions(&self, max_retries: i32) -> Result<u64, SheetError> {
        const BATCH_SIZE: i64 = 100;
        let failures = self
            .failed_deletion_port
            .get_pending_failures(max_retries, BATCH_SIZE)
            .await?;

        let mut successful = 0u64;
        for failure in failures {
            match self.sheet_reference_port.delete(&failure.sheet_id).await {
                Ok(()) => {
                    // Success - remove from dead letter table
                    if let Err(e) = self.failed_deletion_port.remove(&failure.id).await {
                        warn!(id = %failure.id, error = %e, "failed to remove processed failure record");
                    }
                    successful += 1;
                    info!(sheet_id = %failure.sheet_id, "successfully retried failed deletion");
                }
                Err(e) => {
                    // Still failing - increment retry count
                    error!(sheet_id = %failure.sheet_id, error = %e, retry_count = failure.retry_count + 1, "deletion retry failed");
                    if let Err(e) = self.failed_deletion_port.increment_retry(&failure.id).await {
                        warn!(id = %failure.id, error = %e, "failed to increment retry count");
                    }
                }
            }
        }

        info!(successful, "failed deletion processing complete");
        Ok(successful)
    }
}

#[cfg(test)]
mod tests {
    use crate::ports::driven::{MockSheetPdfPort, MockSheetReferencePort, MockSheetStoragePort};
    use crate::ports::driving::SheetService;
    use crate::sheet::Sheet;
    use pretty_assertions::{assert_eq, assert_ne};
    use std::path::PathBuf;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_should_rename_imported_sheet() {
        let mut storage_port = MockSheetStoragePort::new();
        storage_port.expect_create().returning(Ok);
        let mut reference_port = MockSheetReferencePort::new();
        reference_port.expect_create().returning(|_| Ok(()));
        let mut pdf_port = MockSheetPdfPort::new();
        pdf_port.expect_is_valid_pdf().returning(|_| Ok(()));
        let service = SheetService::new(
            Arc::new(pdf_port),
            Arc::new(storage_port),
            Arc::new(reference_port),
        );
        let original_filename = "character_sheet.pdf";
        let sheet = Sheet::new(
            PathBuf::from("/tmp/uploaded_file.pdf"),
            Some(original_filename.to_string()),
        );

        let actual = service.import_sheet(sheet).await;

        assert!(actual.is_ok());
        let sheet_reference = actual.unwrap();
        assert_eq!(sheet_reference.original_name, "character_sheet");
        assert_ne!(sheet_reference.name, "character_sheet");
    }
}
