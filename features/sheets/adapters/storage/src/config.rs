use anyhow::Result;
use std::env::temp_dir;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct StorageConfig {
    pub data_dir: PathBuf,
}

impl StorageConfig {
    pub async fn initialize() -> Result<Self> {
        Ok(Self {
            data_dir: temp_dir(),
        })
    }
}
