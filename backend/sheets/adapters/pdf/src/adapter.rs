use async_trait::async_trait;
use lopdf::Document;
use sheets_core::error::{PdfError, SheetError};
use sheets_core::ports::driven::SheetPdfPort;
use sheets_core::sheet::{Sheet, SheetField, SheetFieldKind};
use std::fs;
use tracing::{debug, error, instrument};

#[derive(Default)]
pub struct SheetsPdf;

#[async_trait]
impl SheetPdfPort for SheetsPdf {
    #[instrument(name = "pdf.validate", skip(self, sheet_reference), level = "debug", fields(path = %sheet_reference.path.display()
    ))]
    async fn is_valid_pdf(&self, sheet_reference: &Sheet) -> Result<(), PdfError> {
        if !sheet_reference.path.exists() {
            return Err(PdfError::FileNotFound);
        }

        let valid_header = match fs::read(&sheet_reference.path) {
            Ok(bytes) => {
                // PDF files start with "%PDF-" followed by a version number
                let valid_header = bytes.len() >= 5 && bytes.starts_with(b"%PDF-");

                debug!(valid = valid_header, "checked pdf magic header");

                valid_header
            }
            Err(e) => return Err(PdfError::ReadError(e)),
        };

        if !valid_header {
            return Err(PdfError::InvalidHeader);
        }

        self.is_compatible_pdf_sheet(&sheet_reference.path).await
    }

    #[instrument(name = "pdf.list_form_fields", skip(self, sheet_reference), level = "debug", fields(path = %sheet_reference.path.display()
    ))]
    async fn list_form_fields(
        &self,
        sheet_reference: &Sheet,
    ) -> Result<Vec<SheetField>, SheetError> {
        let doc = Document::load(&sheet_reference.path).map_err(|e| {
            error!(error = %e, "failed to load PDF document");
            PdfError::ParseError(e.to_string())
        })?;

        let catalog = doc.catalog().map_err(|e| {
            error!(error = %e, "failed to load catalog from PDF sheet");
            PdfError::NotSupported(e.to_string())
        })?;

        let acroform_dict = doc.get_dict_in_dict(catalog, b"AcroForm").map_err(|e| {
            error!(error = ?e, "failed to get AcroForm dictionary");
            PdfError::NotSupported(e.to_string())
        })?;

        let fields_array = acroform_dict
            .get_deref(b"Fields", &doc)
            .and_then(|obj| obj.as_array())
            .map_err(|e| {
                error!(error = ?e, "failed to get Fields array reference from AcroForm");
                PdfError::NotSupported(e.to_string())
            })?;

        let mut sheet_fields: Vec<SheetField> = vec![];
        for field_obj in fields_array {
            Self::collect_fields(&doc, field_obj, &mut sheet_fields)?;
        }

        Ok(sheet_fields)
    }
}

impl SheetsPdf {
    #[instrument(name = "pdf.is_compatible_pdf_sheet", skip(self), level = "debug")]
    async fn is_compatible_pdf_sheet(&self, path: &std::path::Path) -> Result<(), PdfError> {
        match Document::load(path) {
            Ok(doc) => {
                // Not encrypted
                if doc.trailer.get(b"Encrypt").is_ok() {
                    return Err(PdfError::NotSupported("PDF sheet is encrypted".to_string()));
                }

                // Catalog
                let catalog_id = match doc.trailer.get(b"Root").and_then(|o| o.as_reference()) {
                    Ok(id) => id,
                    Err(_) => {
                        return Err(PdfError::NotSupported(
                            "PDF sheet does not have a catalog".to_string(),
                        ));
                    }
                };
                let catalog = match doc.get_object(catalog_id).and_then(|o| o.as_dict()) {
                    Ok(c) => c,
                    Err(_) => {
                        return Err(PdfError::NotSupported(
                            "PDF sheet catalog is not a dictionary".to_string(),
                        ));
                    }
                };

                // AcroForm
                let acroform_dict = doc.get_dict_in_dict(catalog, b"AcroForm").map_err(|e| {
                    error!(error = ?e, "failed to get AcroForm dictionary");
                    PdfError::NotSupported("PDF sheet does not have an AcroForm".to_string())
                })?;

                // Skip XFA forms — they use XML instead of /AA /C
                if acroform_dict.get(b"XFA").is_ok() {
                    return Err(PdfError::NotSupported(
                        "PDF sheet has an XFA form".to_string(),
                    ));
                }

                // Must have /Fields array
                acroform_dict
                    .get_deref(b"Fields", &doc)
                    .and_then(|obj| obj.as_array())
                    .map_err(|e| {
                        error!(error = ?e, "failed to get Fields array reference from AcroForm");
                        PdfError::NotSupported("PDF sheet does not have a Fields array".to_string())
                    })?;

                // Disallow DocMDP permissions (locked PDF)
                if let Ok(perms_ref) = catalog.get(b"Perms").and_then(|o| o.as_reference())
                    && let Ok(perms) = doc.get_object(perms_ref).and_then(|o| o.as_dict())
                    && perms.get(b"DocMDP").is_ok()
                {
                    return Err(PdfError::NotSupported("PDF sheet is locked".to_string()));
                }

                Ok(())
            }
            Err(e) => {
                error!(error = %e, "failed to load PDF document");
                Err(PdfError::ParseError(e.to_string()))
            }
        }
    }

    #[instrument(
        name = "pdf.collect_fields",
        skip(doc, field_obj, fields),
        level = "debug"
    )]
    fn collect_fields(
        doc: &Document,
        field_obj: &lopdf::Object,
        fields: &mut Vec<SheetField>,
    ) -> Result<(), PdfError> {
        use lopdf::Object;

        let fields_dict = match field_obj {
            Object::Dictionary(dict) => dict,
            Object::Reference(id) => {
                doc.get_object(*id)
                    .and_then(|obj| obj.as_dict())
                    .map_err(|e| {
                        error!(error = ?e, "failed to get field dictionary");
                        PdfError::ParseError(e.to_string())
                    })?
            }
            other => {
                debug!(?other, "unexpected object in Fields array; skipping");
                return Ok(());
            }
        };

        if let Ok(kids) = fields_dict.get(b"Kids").and_then(|o| o.as_array()) {
            for kid in kids {
                // Best-effort: skip on error, continue with others
                if let Err(e) = Self::collect_fields(doc, kid, fields) {
                    error!(error = ?e, "failed to collect child field; skipping");
                }
            }
            return Ok(());
        }

        let field_type_bytes = fields_dict
            .get(b"FT")
            .and_then(|obj| obj.as_name())
            .map_err(|e| {
                error!(error = ?e, "failed to get field type");
                PdfError::ParseError(e.to_string())
            })?;

        let field_type = std::str::from_utf8(field_type_bytes).map_err(|e| {
            error!(error = ?e, "field type is not valid UTF-8");
            PdfError::ParseError(e.to_string())
        })?;

        let supports_calculation = matches!(field_type, "Tx" | "Ch");

        // This heuristic is okay for now, though real-world widgets
        // are sometimes separate annotations with /Parent.
        let has_widget =
            fields_dict.has(b"Subtype") || fields_dict.has(b"Rect") || fields_dict.has(b"AP");

        debug!(field_type = ?field_type, has_widget = ?has_widget, "check is supported field");

        if !supports_calculation || !has_widget {
            return Ok(());
        }

        let type_name = if field_type == "Tx" {
            SheetFieldKind::Text
        } else {
            SheetFieldKind::Choice
        };

        let field_name_bytes = fields_dict
            .get(b"T")
            .and_then(|obj| obj.as_str())
            .map_err(|e| {
                error!(error = ?e, "failed to get field name");
                PdfError::ParseError(e.to_string())
            })?;

        let field_name = str::from_utf8(field_name_bytes).map_err(|e| {
            error!(error = ?e, "field name is not valid UTF-8");
            PdfError::ParseError(e.to_string())
        })?;

        fields.push(SheetField::new(field_name, type_name));

        Ok(())
    }
}
