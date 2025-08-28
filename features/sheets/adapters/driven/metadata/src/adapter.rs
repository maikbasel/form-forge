use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::MetadataPort;
use sheets_core::sheet::SheetMetadata;

pub struct SheetMetadataDb;

impl SheetMetadataDb {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl MetadataPort for SheetMetadataDb {
    async fn create(&self, sheet_metadata: SheetMetadata) -> Result<SheetMetadata, SheetError> {
        todo!()
    }
}
