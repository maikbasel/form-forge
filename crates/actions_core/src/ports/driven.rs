use crate::action::AttachedAction;
use crate::error::ActionError;
use async_trait::async_trait;
#[cfg(test)]
use mockall::automock;
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

#[cfg_attr(test, automock)]
#[async_trait]
pub trait ActionPdfPort: Send + Sync {
    fn add_doc_level_js(&self, js: &str, sheet_path: &Path) -> Result<(), ActionError>;

    fn attach_calculation_js(
        &self,
        js: &str,
        sheet_path: &Path,
        target_field: &str,
    ) -> Result<(), ActionError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetReferencePort: Send + Sync {
    async fn find_by_id(&self, id: &Uuid) -> Result<SheetReference, ActionError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait SheetStoragePort: Send + Sync {
    /// Downloads the sheet from storage and returns a local path to the file.
    async fn read(&self, path: PathBuf) -> Result<PathBuf, ActionError>;

    /// Uploads the modified local file back to the storage path.
    async fn write(&self, local_path: PathBuf, storage_path: PathBuf) -> Result<(), ActionError>;
}

#[cfg_attr(test, automock)]
#[async_trait]
pub trait AttachedActionPort: Send + Sync {
    async fn save(&self, action: &AttachedAction) -> Result<(), ActionError>;
    async fn list_by_sheet_id(&self, sheet_id: &Uuid) -> Result<Vec<AttachedAction>, ActionError>;
}
