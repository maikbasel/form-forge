use crate::error::SheetError;
use crate::sheet::SheetMetadata;
use async_trait::async_trait;

#[async_trait]
pub trait StoragePort: Send + Sync {
    async fn create(&self, sheet_metadata: SheetMetadata) -> Result<SheetMetadata, SheetError>;
}

#[async_trait]
pub trait MetadataPort: Send + Sync {
    async fn create(&self, sheet_metadata: SheetMetadata) -> Result<SheetMetadata, SheetError>;
}
