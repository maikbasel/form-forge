use crate::error::SheetError;
use crate::sheet::SheetReference;
use async_trait::async_trait;

#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError>;
}

#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn create(&self, sheet_reference: &SheetReference) -> Result<(), SheetError>;
}
