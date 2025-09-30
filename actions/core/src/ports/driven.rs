use crate::error::ActionError;
use async_trait::async_trait;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct SheetReference {
    pub id: Uuid,
    pub path: PathBuf,
}

impl SheetReference {
    pub fn new(id: Uuid, path: PathBuf) -> Self {
        Self { id, path }
    }
}

#[async_trait]
pub trait ActionPdfPort: Send + Sync {
    fn add_doc_level_js(&self, js: &str, sheet_path: &Path) -> Result<(), ActionError>;

    fn attach_calculation_js(
        &self,
        js: &str,
        sheet_path: &Path,
        target_field: &str,
    ) -> Result<(), ActionError>;

    fn set_calculation_order(
        &self,
        field_order: &[String],
        sheet_path: &Path,
    ) -> Result<(), ActionError>;
}

#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn find_by_id(&self, id: &Uuid) -> Result<SheetReference, ActionError>;
}

#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    async fn read(&self, path: PathBuf) -> Result<PathBuf, ActionError>;
}
