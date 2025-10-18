use actions_core::error::ActionError;
use actions_core::ports::driven::ActionPdfPort;
use async_trait::async_trait;
use common::pdf::find_form_field_by_name;
use lopdf::{Dictionary, Document, Object, ObjectId, StringFormat, dictionary};
use std::collections::BTreeSet;
use std::path::Path;
use tracing::{error, instrument};

pub struct PdfActionAdapter;

#[async_trait]
impl ActionPdfPort for PdfActionAdapter {
    #[instrument(name = "pdf.add_doc_level_js", skip(self, js), fields(path = %sheet_path.display()))]
    fn add_doc_level_js(&self, js: &str, sheet_path: &Path) -> Result<(), ActionError> {
        let mut doc = Document::load(sheet_path).map_err(|e| {
            error!(error = ?e, "failed to load PDF sheet");
            ActionError::LoadPdfError
        })?;

        let catalog_id = doc
            .trailer
            .get(b"Root")
            .and_then(|root| root.as_reference())
            .map_err(|e| {
                let msg = "failed to get Root reference from PDF trailer";
                error!(error = ?e, msg);
                ActionError::InvalidPdfSheet(msg.to_string())
            })?;

        let mut js_dict = Dictionary::new();
        js_dict.set("S", Object::Name(b"JavaScript".to_vec()));
        js_dict.set(
            "JS",
            Object::String(js.as_bytes().to_vec(), lopdf::StringFormat::Literal),
        );

        let mut js_name_tree = Dictionary::new();
        let js_action_id = doc.add_object(Object::Dictionary(js_dict));
        js_name_tree.set(
            "Names",
            Object::Array(vec![
                Object::String(b"HelpersJS".to_vec(), lopdf::StringFormat::Literal),
                Object::Reference(js_action_id),
            ]),
        );

        let js_name_tree_id = doc.add_object(Object::Dictionary(js_name_tree));

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

    #[instrument(name = "pdf.attach_calculation_js", skip(self, js, sheet_path), fields(path = %sheet_path.display(), target_field))]
    fn attach_calculation_js(
        &self,
        js: &str,
        sheet_path: &Path,
        target_field: &str,
    ) -> Result<(), ActionError> {
        let mut doc = Document::load(sheet_path).map_err(|e| {
            error!(error = ?e, "failed to load PDF sheet");
            ActionError::LoadPdfError
        })?;

        let catalog_id = doc
            .trailer
            .get(b"Root")
            .and_then(|root| root.as_reference())
            .map_err(|e| {
                let msg = "failed to get Root reference from PDF trailer";
                error!(error = ?e, msg);
                ActionError::InvalidPdfSheet(msg.to_string())
            })?;

        let acroform_id = {
            let catalog_dict = doc
                .get_object(catalog_id)
                .and_then(|obj| obj.as_dict())
                .map_err(|e| {
                    let msg = "failed to get Catalog dictionary";
                    error!(error = ?e, msg);
                    ActionError::InvalidPdfSheet(msg.to_string())
                })?;

            catalog_dict
                .get(b"AcroForm")
                .and_then(|obj| obj.as_reference())
                .map_err(|e| {
                    let msg = "failed to get AcroForm reference";
                    error!(error = ?e, msg);
                    ActionError::InvalidPdfSheet(msg.to_string())
                })?
        };

        let fields_array_id = {
            let acroform_dict = doc
                .get_object(acroform_id)
                .and_then(|obj| obj.as_dict())
                .map_err(|e| {
                    let msg = "failed to get AcroForm dictionary";
                    error!(error = ?e, msg);
                    ActionError::InvalidPdfSheet(msg.to_string())
                })?;

            acroform_dict
                .get(b"Fields")
                .and_then(|obj| obj.as_reference())
                .map_err(|e| {
                    let msg = "failed to get Fields array reference from AcroForm";
                    error!(error = ?e, msg);
                    ActionError::InvalidPdfSheet(msg.to_string())
                })?
        };

        // Find the target field object by its /T (partial name), searching the hierarchy
        let target_field_id = find_form_field_by_name(&doc, fields_array_id, target_field)
            .ok_or(ActionError::FieldNotFound(target_field.to_string()))?;

        let js_action_id = {
            let js_action = dictionary! {
                b"S" => Object::Name(b"JavaScript".to_vec()),
                b"JS" => Object::String(js.as_bytes().to_vec(), StringFormat::Literal),
            };
            doc.add_object(Object::Dictionary(js_action))
        };

        {
            let field_obj = doc.get_object_mut(target_field_id).map_err(|e| {
                let msg = format!(
                    "failed to get field dictionary for field \"{}\"",
                    target_field
                );
                error!(error = ?e, msg);
                ActionError::FieldNotFound(msg)
            })?;
            let field_dict = field_obj.as_dict_mut().map_err(|e| {
                let msg = format!("field \"{}\" is not a dictionary", target_field);
                error!(error = ?e, msg);
                ActionError::InvalidPdfSheet(msg.to_string())
            })?;

            // Ensure /AA dictionary exists
            match field_dict.get_mut(b"AA") {
                Ok(Object::Dictionary(_)) => {}
                _ => {
                    field_dict.set(b"AA", dictionary! {});
                }
            };

            let aa_dict = field_dict
                .get_mut(b"AA")
                .expect("AA dictionary should exist") // AA dictionary will be created above if it doesn't exist
                .as_dict_mut()
                .expect("AA dictionary should be a dictionary"); // AA object will be created above as a dictionary
            aa_dict.set(b"C", Object::Reference(js_action_id));
        }

        // Ensure /AcroForm /CO array includes the target field (calculation order)
        {
            let acroform_dict = doc
                .get_object_mut(acroform_id)
                .and_then(|obj| obj.as_dict_mut())
                .map_err(|e| {
                    let msg = "failed to get AcroForm dictionary";
                    error!(error = ?e, msg);
                    ActionError::InvalidPdfSheet(msg.to_string())
                })?;

            // Build a set so we don't duplicate
            let mut existing: BTreeSet<ObjectId> = BTreeSet::new();
            if let Ok(co) = acroform_dict.get(b"CO")
                && let Ok(co_arr) = co.as_array()
            {
                for field in co_arr {
                    if let Ok(field_ref) = field.as_reference() {
                        existing.insert(field_ref);
                    }
                }
            }

            if !existing.contains(&target_field_id) {
                existing.insert(target_field_id);
                let co_arr: Vec<Object> = existing.into_iter().map(Object::Reference).collect();
                acroform_dict.set(b"CO", Object::Array(co_arr));
            }
        }

        // Ask viewers to regenerate appearances
        {
            let acroform_dict = doc
                .get_object_mut(acroform_id)
                .and_then(|obj| obj.as_dict_mut())
                .map_err(|e| {
                    let msg = "failed to get AcroForm dictionary";
                    error!(error = ?e, msg);
                    ActionError::InvalidPdfSheet(msg.to_string())
                })?;
            acroform_dict.set(b"NeedAppearances", Object::Boolean(true));
        }

        doc.save(sheet_path).map_err(|e| {
            error!(error = ?e, "failed to save PDF");
            ActionError::SavePdfError
        })?;

        Ok(())
    }
}
