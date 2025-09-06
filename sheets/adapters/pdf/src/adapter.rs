use async_trait::async_trait;
use sheets_core::ports::driven::SheetPdfPort;
use sheets_core::sheet::Sheet;
use std::fs;
use tracing::{debug, instrument};

#[derive(Default)]
pub struct SheetsPdf;

#[async_trait]
impl SheetPdfPort for SheetsPdf {
    #[instrument(name = "pdf.validate", skip(self, sheet_reference), level = "debug", fields(path = %sheet_reference.path.display()))]
    async fn is_valid_pdf(&self, sheet_reference: &Sheet) -> bool {
        if !sheet_reference.path.exists() {
            return false;
        }

        match fs::read(&sheet_reference.path) {
            Ok(bytes) => {
                // PDF files start with "%PDF-" followed by a version number
                let valid_header = bytes.len() >= 5 && bytes.starts_with(b"%PDF-");

                debug!(valid = valid_header, "checked pdf magic header");

                valid_header
            }
            Err(_) => false,
        }
    }
}
