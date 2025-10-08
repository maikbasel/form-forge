use actions_core::error::ActionError;
use actions_core::ports::driven::ActionPdfPort;
use async_trait::async_trait;
use lopdf::{Dictionary, Document, Object, ObjectId};
use std::path::Path;
use tracing::{error, instrument};

#[derive(Default)]
pub struct PdfActionAdapter;

#[async_trait]
impl ActionPdfPort for PdfActionAdapter {
    #[instrument(name = "pdf.add_doc_level_js", skip(self, js), fields(path = %sheet_path.display()))]
    fn add_doc_level_js(&self, js: &str, sheet_path: &Path) -> Result<(), ActionError> {
        // Load the PDF document
        let mut doc = Document::load(sheet_path).map_err(|e| {
            let msg = "failed to get Root reference from PDF trailer";
            error!(error = ?e, msg);
            ActionError::InvalidPdfSheet(msg.to_string())
        })?;

        // Get the catalog ObjectId from the document trailer
        let catalog_id = doc
            .trailer
            .get(b"Root")
            .and_then(|root| root.as_reference())
            .map_err(|e| {
                let msg = "failed to get Root reference from PDF trailer";
                error!(error = ?e, msg);
                ActionError::InvalidPdfSheet(msg.to_string())
            })?;

        // Create a JavaScript action dictionary
        let mut js_dict = Dictionary::new();
        js_dict.set("S", Object::Name(b"JavaScript".to_vec()));
        js_dict.set(
            "JS",
            Object::String(js.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );

        // Create Names dictionary for JavaScript
        let mut js_name_tree = Dictionary::new();
        let js_action_id = doc.add_object(Object::Dictionary(js_dict));
        js_name_tree.set(
            "Names",
            Object::Array(vec![
                Object::String(b"HelpersJS".to_vec(), lopdf::StringFormat::Literal),
                Object::Reference(js_action_id),
            ]),
        );

        // Add JavaScript name tree to document
        let js_name_tree_id = doc.add_object(Object::Dictionary(js_name_tree));

        // Get or create the Names dictionary in catalog
        let catalog = doc
            .get_object_mut(catalog_id)
            .and_then(|obj| obj.as_dict_mut())
            .map_err(|e| {
                let msg = "failed to get Catalog object from PDF trailer";
                error!(error = ?e, msg);
                ActionError::InvalidPdfSheet(msg.to_string())
            })?;

        // Check if Names dictionary already exists
        let names_dict_id = if let Ok(names_ref) = catalog.get(b"Names") {
            if let Ok(existing_names_id) = names_ref.as_reference() {
                // Update the existing Names dictionary
                let names_dict = doc
                    .get_object_mut(existing_names_id)
                    .and_then(|obj| obj.as_dict_mut())
                    .map_err(|e| {
                        let msg = "failed to get Names dictionary from PDF trailer";
                        error!(error = ?e, msg);
                        ActionError::InvalidPdfSheet(msg.to_string())
                    })?;
                names_dict.set("JavaScript", Object::Reference(js_name_tree_id));
                existing_names_id
            } else {
                // Create a new Names dictionary
                let mut names_dict = Dictionary::new();
                names_dict.set("JavaScript", Object::Reference(js_name_tree_id));
                doc.add_object(Object::Dictionary(names_dict))
            }
        } else {
            // Create a new Names dictionary
            let mut names_dict = Dictionary::new();
            names_dict.set("JavaScript", Object::Reference(js_name_tree_id));
            doc.add_object(Object::Dictionary(names_dict))
        };

        // Update catalog with Names dictionary reference
        let catalog = doc
            .get_object_mut(catalog_id)
            .and_then(|obj| obj.as_dict_mut())
            .map_err(|e| {
                let msg = "failed to get Catalog object from PDF trailer";
                error!(error = ?e, msg);
                ActionError::InvalidPdfSheet(msg.to_string())
            })?;
        catalog.set("Names", Object::Reference(names_dict_id));

        doc.save(sheet_path).map_err(|e| {
            error!(error = ?e, "failed to save PDF");
            ActionError::SavePdfError
        })?;

        Ok(())
    }

    fn attach_calculation_js(
        &self,
        js: &str,
        sheet_path: &Path,
        target_field: &str,
    ) -> Result<(), ActionError> {
        todo!()
    }

    fn set_calculation_order(
        &self,
        field_order: &[String],
        sheet_path: &Path,
    ) -> Result<(), ActionError> {
        todo!()
    }
}

impl PdfActionAdapter {}
