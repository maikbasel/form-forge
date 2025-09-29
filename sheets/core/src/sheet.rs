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
