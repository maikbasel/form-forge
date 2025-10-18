use std::io;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SheetError {
    #[error("invalid sheet name")]
    InvalidFileName,
    #[error("invalid sheet path")]
    InvalidFilePath,
    #[error("invalid pdf file: {0}")]
    InvalidPdfFile(#[from] PdfValidationError),
    #[error("sheet not found: {0}")]
    NotFound(String),
    #[error("failed to save sheet")]
    StorageError(#[source] io::Error),
    #[error("failed to save sheet reference")]
    DatabaseError(#[source] anyhow::Error),
}

#[derive(Debug, Error)]
pub enum PdfValidationError {
    #[error("file does not exist")]
    FileNotFound,
    #[error("failed to read file: {0}")]
    ReadError(#[source] io::Error),
    #[error("invalid PDF header - file is not a PDF")]
    InvalidHeader,
    #[error("failed to parse PDF document: {0}")]
    ParseError(String),
    #[error("PDF sheet is not supported: {0}")]
    NotSupported(String),
}
