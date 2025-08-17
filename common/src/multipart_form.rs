use std::path::{Path, PathBuf};
use uuid::Uuid;

struct FilePart {
    name: String,
    file_name: String,
    content_type: String,
    path: PathBuf,
}

#[derive(Default)]
pub struct MultipartFormDataBuilder {
    files: Vec<FilePart>,
}

impl MultipartFormDataBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_file(
        &mut self,
        path: impl AsRef<Path>,
        name: impl Into<String>,
        content_type: impl Into<String>,
        file_name: impl Into<String>,
    ) -> &mut Self {
        self.files.push(FilePart {
            name: name.into(),
            file_name: file_name.into(),
            content_type: content_type.into(),
            path: path.as_ref().to_path_buf(),
        });
        self
    }

    pub fn build(&self) -> ((String, String), Vec<u8>) {
        let boundary = Uuid::new_v4().to_string();

        let mut body = vec![];

        for file in &self.files {
            body.extend(format!("--{}\r\n", boundary).as_bytes());
            body.extend(
                format!(
                    "Content-Disposition: form-data; name=\"{}\"; filename=\"{}\"\r\n",
                    file.name, file.file_name
                )
                .as_bytes(),
            );
            body.extend(format!("Content-Type: {}\r\n", file.content_type).as_bytes());
            let data = std::fs::read(&file.path).unwrap();
            body.extend(format!("Content-Length: {}\r\n\r\n", data.len()).as_bytes());
            body.extend(data);
            body.extend("\r\n".as_bytes());
        }

        body.extend(format!("--{}--\r\n", boundary).as_bytes());

        let header_value = format!("multipart/form-data; boundary={}", boundary);
        let header = ("Content-Type".to_string(), header_value);

        (header, body)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_should_build_multipart_form_with_file() {
        let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let parent_path = here.parent().expect("has parent dir");
        let path = parent_path.join("tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf");
        let mut builder = MultipartFormDataBuilder::new();
        builder.with_file(
            path,
            "file",
            "application/pdf",
            "DnD_5E_CharacterSheet_FormFillable.pdf",
        );

        let (header, body) = builder.build();

        assert_eq!(header.0, "Content-Type");
        assert!(header.1.starts_with("multipart/form-data; boundary="));
        assert!(!body.is_empty());
    }
}
