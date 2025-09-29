use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum ActionError {
    #[error("sheet not found: {0}")]
    NotFound(Uuid),
}

pub type SheetError = ActionError;
