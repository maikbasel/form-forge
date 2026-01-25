use chrono::{DateTime, Utc};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug)]
pub struct Sheet {
    pub name: Option<String>,
    pub path: PathBuf,
}

impl Sheet {
    pub fn new(path: PathBuf, name: Option<String>) -> Self {
        Self { path, name }
    }
}

#[derive(Clone, Debug)]
pub struct SheetReference {
    pub id: Uuid,
    pub original_name: String,
    pub name: String,
    pub extension: Option<String>,
    pub path: PathBuf,
}

impl SheetReference {
    pub fn new(
        id: Uuid,
        original_name: impl Into<String>,
        name: impl Into<String>,
        extension: Option<impl Into<String>>,
        path: PathBuf,
    ) -> Self {
        let original_name = original_name.into();
        let name = name.into();
        let extension = extension.map(|e| e.into());
        Self {
            id,
            original_name,
            name,
            extension,
            path,
        }
    }
}

#[derive(Debug, PartialEq)]
pub struct SheetField {
    pub name: String,
}

impl SheetField {
    pub fn new(name: impl Into<String>) -> Self {
        let name = name.into();
        Self { name }
    }
}

/// Record of a failed sheet reference deletion for retry processing.
#[derive(Debug)]
pub struct FailedSheetDeletion {
    pub id: Uuid,
    pub sheet_id: Uuid,
    pub s3_key: String,
    pub error_message: Option<String>,
    pub retry_count: i32,
    pub created_at: DateTime<Utc>,
    pub last_retry_at: Option<DateTime<Utc>>,
}

impl FailedSheetDeletion {
    pub fn new(
        id: Uuid,
        sheet_id: Uuid,
        s3_key: impl Into<String>,
        error_message: Option<impl Into<String>>,
        retry_count: i32,
        created_at: DateTime<Utc>,
        last_retry_at: Option<DateTime<Utc>>,
    ) -> Self {
        Self {
            id,
            sheet_id,
            s3_key: s3_key.into(),
            error_message: error_message.map(Into::into),
            retry_count,
            created_at,
            last_retry_at,
        }
    }
}
