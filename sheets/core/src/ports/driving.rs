use crate::error::SheetError;
use crate::ports::driven::{SheetReferencePort, SheetStoragePort};
use crate::sheet::{Sheet, SheetReference};
use std::path::Path;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct SheetService {
    sheet_storage_port: Arc<dyn SheetStoragePort>,
    sheet_reference_port: Arc<dyn SheetReferencePort>,
}

impl SheetService {
    pub fn new(
        sheet_storage_port: Arc<dyn SheetStoragePort>,
        sheet_reference_port: Arc<dyn SheetReferencePort>,
    ) -> Self {
        Self {
            sheet_storage_port,
            sheet_reference_port,
        }
    }

    pub async fn import_sheet(&self, sheet: Sheet) -> Result<SheetReference, SheetError> {
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
        let sheet_reference =
            SheetReference::new(sheet_id, original_name, name, extension, sheet.path);

        let sheet_reference = self.sheet_storage_port.create(sheet_reference).await?;

        self.sheet_reference_port.create(&sheet_reference).await?;

        Ok(sheet_reference)
    }

    pub async fn export_sheet(&self, sheet_id: Uuid) -> Result<Sheet, SheetError> {
        let sheet_reference = self.sheet_reference_port.find_by_id(&sheet_id).await?;
        let file_path = self.sheet_storage_port.read(&sheet_reference).await?;

        let filename = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.original_name, ext),
            None => sheet_reference.original_name.clone(),
        };

        Ok(Sheet::new(file_path, Some(filename)))
    }
}
