use crate::error::SheetError;
use crate::sheet::SheetReference;
use async_trait::async_trait;
use std::path::PathBuf;
use uuid::Uuid;

#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError>;
    async fn read(&self, sheet_reference: &SheetReference) -> Result<PathBuf, SheetError>;
}

#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn create(&self, sheet_reference: &SheetReference) -> Result<(), SheetError>;
    async fn find_by_id(&self, sheet_id: &Uuid) -> Result<SheetReference, SheetError>;
}
