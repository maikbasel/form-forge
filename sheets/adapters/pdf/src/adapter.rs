use async_trait::async_trait;
use lopdf::Document;
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

        let is_pdf = match fs::read(&sheet_reference.path) {
            Ok(bytes) => {
                // PDF files start with "%PDF-" followed by a version number
                let valid_header = bytes.len() >= 5 && bytes.starts_with(b"%PDF-");

                debug!(valid = valid_header, "checked pdf magic header");

                valid_header
            }
            Err(_) => false,
        };

        if !is_pdf {
            return false;
        }

        self.is_form_fillable(&sheet_reference.path).await
    }
}

impl SheetsPdf {
    #[instrument(name = "pdf.is_form_fillable", skip(self), level = "debug")]
    async fn is_form_fillable(&self, path: &std::path::Path) -> bool {
        match Document::load(path) {
            Ok(doc) => {
                if self.has_acroform_fields(&doc) {
                    debug!("found form fields in AcroForm");
                    return true;
                }
                if self.has_page_widgets(&doc) {
                    debug!("found form widgets on pages");
                    return true;
                }
                debug!("no form fields or widgets found");
                false
            }
            Err(e) => {
                debug!(error = %e, "failed to load PDF document");
                false
            }
        }
    }

    fn has_acroform_fields(&self, doc: &Document) -> bool {
        // Attempt to traverse to the Fields array, early-returning on failures
        let Ok(catalog) = doc.catalog() else {
            return false;
        };
        let Ok(acroform_val) = catalog.get(b"AcroForm") else {
            return false;
        };
        let Ok(acroform_ref) = acroform_val.as_reference() else {
            debug!("AcroForm entry is not a reference");
            return false;
        };
        let Ok(acroform_obj) = doc.get_object(acroform_ref) else {
            return false;
        };
        let Ok(acroform_dict) = acroform_obj.as_dict() else {
            return false;
        };
        let Ok(fields_val) = acroform_dict.get(b"Fields") else {
            return false;
        };
        let Ok(fields_ref) = fields_val.as_reference() else {
            debug!("Fields entry is not a reference");
            return false;
        };
        let Ok(fields_obj) = doc.get_object(fields_ref) else {
            return false;
        };
        let Ok(fields_array) = fields_obj.as_array() else {
            return false;
        };
        !fields_array.is_empty()
    }

    fn has_page_widgets(&self, doc: &Document) -> bool {
        let Ok(catalog) = doc.catalog() else {
            return false;
        };
        let Ok(pages_ref) = catalog.get(b"Pages") else {
            return false;
        };
        self.check_pages_for_widgets(doc, pages_ref)
    }

    fn check_pages_for_widgets(&self, doc: &Document, pages_ref: &lopdf::Object) -> bool {
        let Ok(pages_ref) = pages_ref.as_reference() else {
            debug!("Pages reference is not a valid reference");
            return false;
        };
        let Ok(pages_obj) = doc.get_object(pages_ref) else {
            return false;
        };
        let Ok(pages_dict) = pages_obj.as_dict() else {
            return false;
        };

        // If Kids exists, it's a page tree node; traverse children
        if let Ok(kids_val) = pages_dict.get(b"Kids") {
            let Ok(kids_ref) = kids_val.as_reference() else {
                debug!("Kids entry is not a reference");
                return false;
            };
            let Ok(kids_obj) = doc.get_object(kids_ref) else {
                return false;
            };
            let Ok(kids_array) = kids_obj.as_array() else {
                return false;
            };
            for kid_ref in kids_array {
                if self.check_pages_for_widgets(doc, kid_ref) {
                    return true;
                }
            }
            return false;
        }

        // Leaf page – check for widgets
        self.page_has_widgets(doc, pages_dict)
    }

    fn page_has_widgets(&self, doc: &Document, page_dict: &lopdf::Dictionary) -> bool {
        // Check for Annots (annotations) which include form widgets
        let Ok(annots_val) = page_dict.get(b"Annots") else {
            return false;
        };
        let Ok(annots_ref) = annots_val.as_reference() else {
            debug!("Annotations entry is not a reference");
            return false;
        };
        let Ok(annots_obj) = doc.get_object(annots_ref) else {
            return false;
        };
        let Ok(annots_array) = annots_obj.as_array() else {
            return false;
        };

        for annot_ref_obj in annots_array {
            let Ok(annot_ref) = annot_ref_obj.as_reference() else {
                debug!("Annotation reference is not a valid reference");
                continue;
            };
            let Ok(annot_obj) = doc.get_object(annot_ref) else {
                continue;
            };
            let Ok(annot_dict) = annot_obj.as_dict() else {
                continue;
            };

            // Check if it's a widget annotation (form field)
            if let Ok(subtype) = annot_dict.get(b"Subtype")
                && let Ok(subtype_name) = subtype.as_name()
                && subtype_name == b"Widget"
            {
                debug!("found Widget annotation");
                return true;
            }

            // Also check for form field types in FT entry
            if let Ok(ft) = annot_dict.get(b"FT")
                && let Ok(field_type) = ft.as_name()
            {
                match field_type {
                    b"Tx" | b"Ch" | b"Btn" | b"Sig" => {
                        debug!(field_type = ?field_type, "found form field type");
                        return true;
                    }
                    _ => {}
                }
            }
        }
        false
    }
}
