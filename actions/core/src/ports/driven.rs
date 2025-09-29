use crate::error::ActionError;
use async_trait::async_trait;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct SheetReference {
    pub id: Uuid,
    pub path: PathBuf,
}

#[async_trait]
pub trait ActionPdfPort: Send + Sync {
    fn add_doc_level_js(&self, js: &str, sheet_path: &PathBuf) -> Result<(), ActionError>;

    fn attach_calculation_js(
        &self,
        js: &str,
        sheet_path: &PathBuf,
        target_field: &str,
    ) -> Result<(), ActionError>;

    fn set_calculation_order(
        &self,
        field_order: &[String],
        sheet_path: &PathBuf,
    ) -> Result<(), ActionError>;
}

#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn find_by_id(&self, id: &Uuid) -> Result<SheetReference, ActionError>;
}

#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    async fn read(&self, sheet_reference: &SheetReference) -> Result<PathBuf, ActionError>;
}
