use async_trait::async_trait;
use lopdf::Document;
use sheets_core::error::PdfValidationError;
use sheets_core::ports::driven::SheetPdfPort;
use sheets_core::sheet::Sheet;
use std::fs;
use tracing::{debug, instrument};

#[derive(Default)]
pub struct SheetsPdf;

#[async_trait]
impl SheetPdfPort for SheetsPdf {
    #[instrument(name = "pdf.validate", skip(self, sheet_reference), level = "debug", fields(path = %sheet_reference.path.display()))]
    async fn is_valid_pdf(&self, sheet_reference: &Sheet) -> Result<(), PdfValidationError> {
        if !sheet_reference.path.exists() {
            return Err(PdfValidationError::FileNotFound);
        }

        let valid_header = match fs::read(&sheet_reference.path) {
            Ok(bytes) => {
                // PDF files start with "%PDF-" followed by a version number
                let valid_header = bytes.len() >= 5 && bytes.starts_with(b"%PDF-");

                debug!(valid = valid_header, "checked pdf magic header");

                valid_header
            }
            Err(e) => return Err(PdfValidationError::ReadError(e)),
        };

        if !valid_header {
            return Err(PdfValidationError::InvalidHeader);
        }

        self.is_compatible_pdf_sheet(&sheet_reference.path).await
    }
}

impl SheetsPdf {
    #[instrument(name = "pdf.is_compatible_pdf_sheet", skip(self), level = "debug")]
    async fn is_compatible_pdf_sheet(
        &self,
        path: &std::path::Path,
    ) -> Result<(), PdfValidationError> {
        match Document::load(path) {
            Ok(doc) => {
                // Not encrypted
                if doc.trailer.get(b"Encrypt").is_ok() {
                    return Err(PdfValidationError::NotSupported(
                        "PDF sheet is encrypted".to_string(),
                    ));
                }

                // Catalog
                let catalog_id = match doc.trailer.get(b"Root").and_then(|o| o.as_reference()) {
                    Ok(id) => id,
                    Err(_) => {
                        return Err(PdfValidationError::NotSupported(
                            "PDF sheet does not have a catalog".to_string(),
                        ));
                    }
                };
                let catalog = match doc.get_object(catalog_id).and_then(|o| o.as_dict()) {
                    Ok(c) => c,
                    Err(_) => {
                        return Err(PdfValidationError::NotSupported(
                            "PDF sheet catalog is not a dictionary".to_string(),
                        ));
                    }
                };

                // AcroForm
                let acroform_id = match catalog.get(b"AcroForm").and_then(|o| o.as_reference()) {
                    // TODO: handle AcroForm that are direct objects and not indirect object references
                    Ok(id) => id,
                    Err(_) => {
                        return Err(PdfValidationError::NotSupported(
                            "PDF sheet does not have an AcroForm".to_string(),
                        ));
                    }
                };
                let acroform = match doc.get_object(acroform_id).and_then(|o| o.as_dict()) {
                    Ok(a) => a,
                    Err(_) => {
                        return Err(PdfValidationError::NotSupported(
                            "PDF sheet AcroForm is not a dictionary".to_string(),
                        ));
                    }
                };

                // Skip XFA forms — they use XML instead of /AA /C
                if acroform.get(b"XFA").is_ok() {
                    return Err(PdfValidationError::NotSupported(
                        "PDF sheet has an XFA form".to_string(),
                    ));
                }

                // Must have /Fields array
                let fields_arr_ref = match acroform.get(b"Fields").and_then(|o| o.as_reference()) {
                    Ok(id) => id,
                    Err(_) => {
                        return Err(PdfValidationError::NotSupported(
                            "PDF sheet does not have a Fields array".to_string(),
                        ));
                    }
                };
                if doc
                    .get_object(fields_arr_ref)
                    .and_then(|o| o.as_array())
                    .is_err()
                {
                    return Err(PdfValidationError::NotSupported(
                        "PDF sheet Fields object is not an array".to_string(),
                    ));
                }

                // Disallow DocMDP permissions (locked PDF)
                if let Ok(perms_ref) = catalog.get(b"Perms").and_then(|o| o.as_reference())
                    && let Ok(perms) = doc.get_object(perms_ref).and_then(|o| o.as_dict())
                    && perms.get(b"DocMDP").is_ok()
                {
                    return Err(PdfValidationError::NotSupported(
                        "PDF sheet is locked".to_string(),
                    ));
                }

                Ok(())
            }
            Err(e) => {
                debug!(error = %e, "failed to load PDF document");
                Err(PdfValidationError::ParseError(e.to_string()))
            }
        }
    }
}
