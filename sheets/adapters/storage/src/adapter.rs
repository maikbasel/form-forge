use crate::config::StorageConfig;
use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::SheetStoragePort;
use sheets_core::sheet::SheetReference;
use std::fs::{copy, create_dir_all};
use std::path::PathBuf;

pub struct SheetFileStorage {
    data_dir: PathBuf,
}

impl SheetFileStorage {
    pub fn new(cfg: StorageConfig) -> Self {
        Self {
            data_dir: cfg.data_dir,
        }
    }
}

#[async_trait]
impl SheetStoragePort for SheetFileStorage {
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError> {
        let sheet_dir = self
            .data_dir
            .join("sheets")
            .join(sheet_reference.id.to_string());

        create_dir_all(&sheet_dir).map_err(|e| SheetError::StorageError(e))?;

        let file_name = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.name, ext),
            None => sheet_reference.name.clone(),
        };

        let target_path = sheet_dir.join(file_name);

        copy(&sheet_reference.path, &target_path).map_err(|e| SheetError::StorageError(e))?;

        Ok(SheetReference::new(
            sheet_reference.id,
            sheet_reference.original_name,
            sheet_reference.name,
            sheet_reference.extension,
            target_path,
        ))
    }
}
