#[cfg(test)]
mod tests {
    use sheets_core::error::PdfValidationError;
    use sheets_core::ports::driven::SheetPdfPort;
    use sheets_core::sheet::Sheet;
    use sheets_pdf::adapter::SheetsPdf;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_should_validate_pdf_file_with_valid_pdf_header() {
        let adapter = SheetsPdf;
        let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let sheet_path = here.join("tests/fixtures/DnD_5E_CharacterSheet_FormFillable.pdf");
        let sheet = Sheet::new(
            sheet_path,
            Some("DnD_5E_CharacterSheet_FormFillable.pdf".to_string()),
        );

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_ok());
    }

    #[tokio::test]
    async fn test_fail_validating_pdf_file_with_invalid_pdf_header() {
        let adapter = SheetsPdf;
        let temp_file = NamedTempFile::with_suffix(".pdf").unwrap();
        fs::write(temp_file.path(), b"not a pdf file").unwrap();
        let sheet = Sheet::new(
            temp_file.path().to_path_buf(),
            Some("invalid.pdf".to_string()),
        );

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_err());
        assert!(matches!(actual, Err(PdfValidationError::InvalidHeader)));
    }

    #[tokio::test]
    async fn test_fail_validating_non_existent_file() {
        let adapter = SheetsPdf;
        let sheet = Sheet::new(
            PathBuf::from("/does/not/exist.pdf"),
            Some("missing.pdf".to_string()),
        );

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_err());
        assert!(matches!(actual, Err(PdfValidationError::FileNotFound)));
    }

    #[tokio::test]
    async fn test_should_fail_validating_non_form_fillable_pdf() {
        let adapter = SheetsPdf;
        let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let sheet_path = here.join("tests/fixtures/empty_pdf.pdf");
        let sheet = Sheet::new(sheet_path, Some("empty_pdf.pdf".to_string()));

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_err());
        assert!(matches!(actual, Err(PdfValidationError::NotSupported(_))));
    }
}
