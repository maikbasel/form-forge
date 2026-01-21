use crate::error::{PdfError, SheetError};
use crate::sheet::{Sheet, SheetField, SheetReference};
use async_trait::async_trait;
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
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn create(&self, sheet_reference: &SheetReference) -> Result<(), SheetError>;
    async fn find_by_id(&self, sheet_id: &Uuid) -> Result<SheetReference, SheetError>;
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
