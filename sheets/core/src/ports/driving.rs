use crate::error::SheetError;
use crate::ports::driven::{SheetPdfPort, SheetReferencePort, SheetStoragePort};
use crate::sheet::{Sheet, SheetReference};
use std::path::Path;
use std::sync::Arc;
use tracing::{debug, info, instrument};
use uuid::Uuid;

#[derive(Clone)]
pub struct SheetService {
    sheet_pdf_port: Arc<dyn SheetPdfPort>,
    sheet_storage_port: Arc<dyn SheetStoragePort>,
    sheet_reference_port: Arc<dyn SheetReferencePort>,
}

impl SheetService {
    pub fn new(
        sheet_pdf_port: Arc<dyn SheetPdfPort>,
        sheet_storage_port: Arc<dyn SheetStoragePort>,
        sheet_reference_port: Arc<dyn SheetReferencePort>,
    ) -> Self {
        Self {
            sheet_pdf_port,
            sheet_storage_port,
            sheet_reference_port,
        }
    }

    #[instrument(name = "sheets.import", skip(self, sheet), level = "info")]
    pub async fn import_sheet(&self, sheet: Sheet) -> Result<SheetReference, SheetError> {
        debug!("validating uploaded sheet path exists and is valid pdf");

        self.sheet_pdf_port
            .is_valid_pdf(&sheet)
            .await
            .map_err(SheetError::InvalidPdfFile)?;

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

        info!(%sheet_id, original_name = %original_name, generated_name = %name, "creating sheet reference and persisting");

        let sheet_reference =
            SheetReference::new(sheet_id, original_name, name, extension, sheet.path);

        let sheet_reference = self.sheet_storage_port.create(sheet_reference).await?;

        info!(%sheet_id, path = %sheet_reference.path.display(), "stored sheet file on disk");

        self.sheet_reference_port.create(&sheet_reference).await?;

        info!(%sheet_id, "stored sheet reference in database");

        Ok(sheet_reference)
    }

    #[instrument(name = "sheets.export", skip(self), level = "info", fields(%sheet_id))]
    pub async fn export_sheet(&self, sheet_id: Uuid) -> Result<Sheet, SheetError> {
        let sheet_reference = self.sheet_reference_port.find_by_id(&sheet_id).await?;

        info!(path = %sheet_reference.path.display(), "found sheet reference");

        let file_path = self.sheet_storage_port.read(sheet_reference.path).await?;

        info!(path = %file_path.display(), "read sheet file from storage");

        let filename = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.original_name, ext),
            None => sheet_reference.original_name.clone(),
        };

        Ok(Sheet::new(file_path, Some(filename)))
    }
}

#[cfg(test)]
mod tests {
    use crate::ports::driven::{MockSheetPdfPort, MockSheetReferencePort, MockSheetStoragePort};
    use crate::ports::driving::SheetService;
    use crate::sheet::Sheet;
    use pretty_assertions::{assert_eq, assert_ne};
    use std::path::PathBuf;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_should_rename_imported_sheet() {
        let mut storage_port = MockSheetStoragePort::new();
        storage_port.expect_create().returning(Ok);
        let mut reference_port = MockSheetReferencePort::new();
        reference_port.expect_create().returning(|_| Ok(()));
        let mut pdf_port = MockSheetPdfPort::new();
        pdf_port.expect_is_valid_pdf().returning(|_| Ok(()));
        let service = SheetService::new(
            Arc::new(pdf_port),
            Arc::new(storage_port),
            Arc::new(reference_port),
        );
        let original_filename = "character_sheet.pdf";
        let sheet = Sheet::new(
            PathBuf::from("/tmp/uploaded_file.pdf"),
            Some(original_filename.to_string()),
        );

        let actual = service.import_sheet(sheet).await;

        assert!(actual.is_ok());
        let sheet_reference = actual.unwrap();
        assert_eq!(sheet_reference.original_name, "character_sheet");
        assert_ne!(sheet_reference.name, "character_sheet");
    }
}
