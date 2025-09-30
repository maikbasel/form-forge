use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum ActionError {
    #[error("sheet not found: {0}")]
    NotFound(Uuid),
    #[error("file does not exist")]
    FileNotFound,
}

pub type SheetError = ActionError;
