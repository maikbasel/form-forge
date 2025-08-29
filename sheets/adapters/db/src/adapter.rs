use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::SheetReferencePort;
use sheets_core::sheet::SheetReference;

pub struct SheetReferenceDb;

impl SheetReferenceDb {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl SheetReferencePort for SheetReferenceDb {
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError> {
        todo!()
    }
}
