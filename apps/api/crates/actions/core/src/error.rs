use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum ActionError {
    #[error("sheet not found: {0}")]
    NotFound(Uuid),
    #[error("file does not exist")]
    FileNotFound,
    #[error("failed to load PDF sheet")]
    LoadPdfError,
    #[error("invalid PDF sheet: {0}")]
    InvalidPdfSheet(String),
    #[error("failed to save PDF sheet")]
    SavePdfError,
    #[error("field not found in PDF sheet: {0}")]
    FieldNotFound(String),
    #[error("invalid action: {0}")]
    InvalidAction(String),
}

pub type SheetError = ActionError;
