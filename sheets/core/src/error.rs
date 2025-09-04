use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SheetError {
    #[error("invalid sheet name")]
    InvalidFileName,
    #[error("invalid sheet path")]
    InvalidFilePath,
    #[error("sheet not found: {0}")]
    NotFound(String),
    #[error("failed to save sheet")]
    StorageError(#[source] io::Error),
    #[error("failed to save sheet reference")]
    DatabaseError(#[source] anyhow::Error),
}
