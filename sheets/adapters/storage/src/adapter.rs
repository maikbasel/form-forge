use crate::config::StorageConfig;
use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::SheetStoragePort;
use sheets_core::sheet::SheetReference;
use std::fs::{copy, create_dir_all};
use std::path::PathBuf;
use tracing::instrument;

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
    #[instrument(name = "storage.create", skip(self), level = "info", fields(sheet_id = %sheet_reference.id))]
    async fn create(&self, sheet_reference: SheetReference) -> Result<SheetReference, SheetError> {
        let sheet_dir = self
            .data_dir
            .join("sheets")
            .join(sheet_reference.id.to_string());

        create_dir_all(&sheet_dir).map_err(SheetError::StorageError)?;

        let file_name = match &sheet_reference.extension {
            Some(ext) => format!("{}.{}", sheet_reference.name, ext),
            None => sheet_reference.name.clone(),
        };

        let target_path = sheet_dir.join(file_name);

        copy(&sheet_reference.path, &target_path).map_err(SheetError::StorageError)?;

        Ok(SheetReference::new(
            sheet_reference.id,
            sheet_reference.original_name,
            sheet_reference.name,
            sheet_reference.extension,
            target_path,
        ))
    }

    #[instrument(name = "storage.read", skip(self, sheet_reference), level = "info", fields(sheet_id = %sheet_reference.id))]
    async fn read(&self, sheet_reference: &SheetReference) -> Result<PathBuf, SheetError> {
        if sheet_reference.path.exists() {
            Ok(sheet_reference.path.clone())
        } else {
            Err(SheetError::NotFound("file not found".to_string()))
        }
    }
}

#[async_trait]
impl actions_core::ports::driven::SheetStoragePort for SheetFileStorage {
    async fn read(
        &self,
        sheet_reference: &actions_core::ports::driven::SheetReference,
    ) -> Result<PathBuf, actions_core::error::SheetError> {
        todo!()
    }
}
