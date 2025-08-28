use crate::config::StorageConfig;
use async_trait::async_trait;
use sheets_core::error::SheetError;
use sheets_core::ports::driven::StoragePort;
use sheets_core::sheet::SheetMetadata;
use std::path::PathBuf;

pub struct FileStorage {
    data_dir: PathBuf,
}

impl FileStorage {
    pub fn new(cfg: StorageConfig) -> Self {
        Self {
            data_dir: cfg.data_dir,
        }
    }
}

#[async_trait]
impl StoragePort for FileStorage {
    async fn create(&self, sheet_metadata: SheetMetadata) -> Result<SheetMetadata, SheetError> {
        todo!()
    }
}
