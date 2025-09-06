use crate::error::{PdfValidationError, SheetError};
use crate::sheet::{Sheet, SheetReference};
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
use std::path::PathBuf;
use uuid::Uuid;

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError>;
    async fn read(&self, sheet_reference: &SheetReference) -> Result<PathBuf, SheetError>;
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
    async fn is_valid_pdf(&self, sheet_reference: &Sheet) -> Result<(), PdfValidationError>;
}
