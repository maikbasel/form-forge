use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SheetError {
    #[error("invalid file name")]
    InvalidFileName,
    #[error("failed to save sheet")]
    StorageError(#[source] io::Error),
}
