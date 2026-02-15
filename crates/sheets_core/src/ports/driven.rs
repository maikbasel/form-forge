use crate::error::{PdfError, SheetError};
use crate::sheet::{FailedSheetDeletion, Sheet, SheetField, SheetReference};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
#[cfg(test)]
use mockall::automock;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError>;
    async fn read(&self, path: PathBuf) -> Result<PathBuf, SheetError>;

    /// Generate a pre-signed download URL with response headers for content disposition and type.
    async fn get_download_url(
        &self,
        path: &Path,
        filename: &str,
        expires_in_secs: u64,
    ) -> Result<String, SheetError>;

    /// Check if an object exists in storage (HEAD request).
    async fn exists(&self, path: &Path) -> Result<bool, SheetError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn create(&self, sheet_reference: &SheetReference) -> Result<(), SheetError>;
    async fn find_by_id(&self, sheet_id: &Uuid) -> Result<SheetReference, SheetError>;

    /// Delete a sheet reference by ID. Idempotent - succeeds even if record doesn't exist.
    async fn delete(&self, sheet_id: &Uuid) -> Result<(), SheetError>;

    /// Find sheet references created before the given timestamp.
    async fn find_older_than(
        &self,
        before: DateTime<Utc>,
    ) -> Result<Vec<SheetReference>, SheetError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetPdfPort: Send + Sync {
    async fn is_valid_pdf(&self, sheet_reference: &Sheet) -> Result<(), PdfError>;
    async fn list_form_fields(
        &self,
        sheet_reference: &Sheet,
    ) -> Result<Vec<SheetField>, SheetError>;
}

/// Port for managing failed sheet deletion records (dead letter table).
#[cfg_attr(test, automock)]
#[async_trait]
pub trait FailedSheetDeletionPort: Send + Sync {
    /// Record a failed deletion attempt for later retry.
    async fn record_failure(
        &self,
        sheet_id: &Uuid,
        s3_key: &str,
        error_message: &str,
    ) -> Result<(), SheetError>;

    /// Get pending failures for retry processing.
    async fn get_pending_failures(
        &self,
        max_retry_count: i32,
        limit: i64,
    ) -> Result<Vec<FailedSheetDeletion>, SheetError>;

    /// Update retry count and timestamp after a retry attempt.
    async fn increment_retry(&self, id: &Uuid) -> Result<(), SheetError>;

    /// Remove a failure record after successful retry.
    async fn remove(&self, id: &Uuid) -> Result<(), SheetError>;
}
