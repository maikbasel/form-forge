use async_trait::async_trait;
use sheets_core::ports::driven::SheetPdfPort;
use sheets_core::sheet::Sheet;
use std::fs;

pub struct SheetsPdf;

impl SheetsPdf {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl SheetPdfPort for SheetsPdf {
    async fn is_valid_pdf(&self, sheet_reference: &Sheet) -> bool {
        if !sheet_reference.path.exists() {
            return false;
        }

        match fs::read(&sheet_reference.path) {
            Ok(bytes) => {
                // PDF files start with "%PDF-" followed by a version number
                if bytes.len() >= 5 {
                    bytes.starts_with(b"%PDF-")
                } else {
                    false
                }
            }
            Err(_) => false,
        }
    }
}
