#[cfg(test)]
mod tests {
    use sheets_core::ports::driven::SheetPdfPort;
    use sheets_core::sheet::Sheet;
    use sheets_pdf::adapter::SheetsPdf;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_should_validate_pdf_file_with_valid_pdf_header() {
        let adapter = SheetsPdf::new();
        let temp_file = NamedTempFile::with_suffix(".pdf").unwrap();
        fs::write(temp_file.path(), b"%PDF-1.4\nvalid content").unwrap();
        let sheet = Sheet::new(temp_file.path().to_path_buf(), Some("test.pdf".to_string()));

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual);
    }

    #[tokio::test]
    async fn test_fail_validating_pdf_file_with_invalid_pdf_header() {
        let adapter = SheetsPdf::new();
        let temp_file = NamedTempFile::with_suffix(".pdf").unwrap();
        fs::write(temp_file.path(), b"not a pdf file").unwrap();
        let sheet = Sheet::new(
            temp_file.path().to_path_buf(),
            Some("invalid.pdf".to_string()),
        );

        assert!(!adapter.is_valid_pdf(&sheet).await);
    }

    #[tokio::test]
    async fn test_fail_validating_non_existent_file() {
        let adapter = SheetsPdf::new();
        let sheet = Sheet::new(
            PathBuf::from("/does/not/exist.pdf"),
            Some("missing.pdf".to_string()),
        );

        assert!(!adapter.is_valid_pdf(&sheet).await);
    }
}
