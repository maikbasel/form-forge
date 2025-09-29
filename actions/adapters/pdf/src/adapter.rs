use actions_core::error::ActionError;
use actions_core::ports::driven::ActionPdfPort;
use async_trait::async_trait;
use std::path::PathBuf;

#[derive(Default)]
pub struct PdfActionAdapter;

#[async_trait]
impl ActionPdfPort for PdfActionAdapter {
    fn add_doc_level_js(&self, js: &str, sheet_path: &PathBuf) -> Result<(), ActionError> {
        todo!()
    }

    fn attach_calculation_js(
        &self,
        js: &str,
        sheet_path: &PathBuf,
        target_field: &str,
    ) -> Result<(), ActionError> {
        todo!()
    }

    fn set_calculation_order(
        &self,
        field_order: &[String],
        sheet_path: &PathBuf,
    ) -> Result<(), ActionError> {
        todo!()
    }
}
