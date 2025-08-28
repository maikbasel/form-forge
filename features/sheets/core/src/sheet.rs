use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub struct Sheet {
    pub file: BufReader<File>,
}

impl Sheet {
    pub fn new(file: BufReader<File>) -> Self {
        Self { file }
    }
}

#[derive(Clone, Debug)]
pub struct SheetMetadata {
    pub sheet_id: Uuid,
    pub original_name: String,
    pub name: String,
    pub path: PathBuf,
}

impl SheetMetadata {
    pub fn new(sheet_id: Uuid, original_name: String) -> Self {
        let name = Self::make_safe_name_for(sheet_id, &original_name);
        let path = Self::make_path_for(sheet_id, &name);

        Self {
            sheet_id,
            original_name,
            name,
            path,
        }
    }

    fn make_safe_name_for(id: Uuid, original_name: &str) -> String {
        let id_hex = id.simple().to_string(); // 32 hex chars, no hyphens
        let ext = Path::new(original_name)
            .extension()
            .and_then(|e| e.to_str())
            .filter(|e| !e.is_empty());

        match ext {
            Some(e) => format!("{id_hex}.{e}"),
            None => id_hex,
        }
    }

    fn make_path_for(id: Uuid, name: &str) -> PathBuf {
        let id_hex = id.simple().to_string();
        PathBuf::from(id_hex).join(name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixed_uuid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    #[test]
    fn should_init_sheet_metadata() {
        let id = fixed_uuid();
        let original = "sheet.pdf".to_string();
        let metadata = SheetMetadata::new(id, original.clone());
        let id_hex = id.simple().to_string();
        let expected_name = format!("{id_hex}.pdf");
        let expected_path: PathBuf = PathBuf::from(&id_hex).join(&expected_name);

        assert_eq!(metadata.sheet_id, id);
        assert_eq!(metadata.original_name, original);
        assert_eq!(metadata.name, expected_name);
        assert_eq!(metadata.path, expected_path);
    }

    #[test]
    fn should_init_sheet_metadata_without_extension() {
        let id = fixed_uuid();
        let original = "sheet".to_string();
        let metadata = SheetMetadata::new(id, original.clone());
        let id_hex = id.simple().to_string();
        let expected_name = id_hex.clone();
        let expected_path: PathBuf = PathBuf::from(&id_hex).join(&expected_name);

        assert_eq!(metadata.sheet_id, id);
        assert_eq!(metadata.original_name, original);
        assert_eq!(metadata.name, expected_name);
        assert_eq!(metadata.path, expected_path);
    }

    #[test]
    fn should_init_sheet_metadata_with_multi_dot_filename() {
        let id = fixed_uuid();
        let original = "archive.tar.gz".to_string();

        let meta = SheetMetadata::new(id, original);

        let id_hex = id.simple().to_string();
        let expected_name = format!("{id_hex}.gz");
        let expected_path: PathBuf = PathBuf::from(&id_hex).join(&expected_name);

        assert_eq!(meta.name, expected_name);
        assert_eq!(meta.path, expected_path);
    }
}
