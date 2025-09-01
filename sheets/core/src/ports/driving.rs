use crate::error::SheetError;
use crate::ports::driven::{SheetReferencePort, SheetStoragePort};
use crate::sheet::{Sheet, SheetReference};
use std::path::Path;
use std::sync::Arc;
use uuid::Uuid;

pub async fn import_sheet(
    storage_port: Arc<dyn SheetStoragePort>,
    reference_port: Arc<dyn SheetReferencePort>,
    sheet: Sheet,
) -> Result<SheetReference, SheetError> {
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
    let sheet_reference = SheetReference::new(sheet_id, original_name, name, extension, sheet.path);

    let sheet_reference = storage_port.create(sheet_reference).await?;

    reference_port.create(&sheet_reference).await?;
    
    Ok(sheet_reference)
}
