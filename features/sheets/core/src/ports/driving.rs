use crate::error::SheetError;
use crate::ports::driven::{MetadataPort, StoragePort};
use crate::sheet::Sheet;
use std::sync::Arc;
use uuid::Uuid;

pub async fn import_sheet(
    storage_port: Arc<dyn StoragePort>,
    metadata_port: Arc<dyn MetadataPort>,
    sheet: Sheet,
) -> Result<Uuid, SheetError> {
    todo!()
}
