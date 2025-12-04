mod test_utils;

#[cfg(test)]
mod tests {
    use crate::test_utils::TestContext;
    use pretty_assertions::assert_eq;
    use rstest::{fixture, rstest};
    use sheets_core::error::PdfError;
    use sheets_core::ports::driven::SheetPdfPort;
    use sheets_core::sheet::{Sheet, SheetField};
    use sheets_pdf::adapter::SheetsPdf;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::NamedTempFile;

    #[fixture]
    fn ctx() -> TestContext {
        TestContext::setup()
    }

    #[rstest]
    #[tokio::test]
    async fn test_should_validate_pdf_file_with_valid_pdf_header(_ctx: TestContext) {
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

    #[rstest]
    #[tokio::test]
    async fn test_fail_validating_pdf_file_with_invalid_pdf_header(_ctx: TestContext) {
        let adapter = SheetsPdf;
        let temp_file = NamedTempFile::with_suffix(".pdf").unwrap();
        fs::write(temp_file.path(), b"not a pdf file").unwrap();
        let sheet = Sheet::new(
            temp_file.path().to_path_buf(),
            Some("invalid.pdf".to_string()),
        );

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_err());
        assert!(matches!(actual, Err(PdfError::InvalidHeader)));
    }

    #[rstest]
    #[tokio::test]
    async fn test_fail_validating_non_existent_file(_ctx: TestContext) {
        let adapter = SheetsPdf;
        let sheet = Sheet::new(
            PathBuf::from("/does/not/exist.pdf"),
            Some("missing.pdf".to_string()),
        );

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_err());
        assert!(matches!(actual, Err(PdfError::FileNotFound)));
    }

    #[rstest]
    #[tokio::test]
    async fn test_should_fail_validating_non_form_fillable_pdf(_ctx: TestContext) {
        let adapter = SheetsPdf;
        let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let sheet_path = here.join("tests/fixtures/empty_pdf.pdf");
        let sheet = Sheet::new(sheet_path, Some("empty_pdf.pdf".to_string()));

        let actual = adapter.is_valid_pdf(&sheet).await;

        assert!(actual.is_err());
        assert!(matches!(actual, Err(PdfError::NotSupported(_))));
    }

    #[rstest]
    #[tokio::test]
    async fn test_list_terminal_text_and_choice_form_fields_returns_expected_fields(
        _ctx: TestContext,
    ) {
        let adapter = SheetsPdf;
        let here = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let sheet_path = here.join("tests/fixtures/list_fields_test.pdf");
        let sheet = Sheet::new(sheet_path, Some("list_fields_test.pdf".to_string()));
        let mut expected: Vec<SheetField> = vec![
            SheetField::new("Text Field"),
            SheetField::new("Combo Box"),
            SheetField::new("List Box"),
        ];
        expected.sort_by_key(|field| field.name.clone());

        let actual = adapter.list_form_fields(&sheet).await;

        assert!(actual.is_ok());
        let mut fields = actual.unwrap();
        assert_eq!(fields.len(), 3);
        fields.sort_by_key(|field| field.name.clone());
        assert_eq!(fields, expected);
    }
}
