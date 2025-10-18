use lopdf::{Document, Object, ObjectId};

/// Recursively search /Fields (and /Kids) for a field whose /T equals `name`.
pub fn find_form_field_by_name(
    doc: &Document,
    fields_array_id: ObjectId,
    name: &str,
) -> Option<ObjectId> {
    let arr_obj = doc.get_object(fields_array_id).ok()?;
    let arr = arr_obj.as_array().ok()?;

    for item in arr {
        if let Ok(fid) = item.as_reference()
            && let Some(found) = search_form_field_node(doc, fid, name)
        {
            return Some(found);
        }
    }

    None
}

/// Depth-first search of a field node (which may have /Kids).
fn search_form_field_node(doc: &Document, field_id: ObjectId, name: &str) -> Option<ObjectId> {
    let obj = doc.get_object(field_id).ok()?;
    let dict = obj.as_dict().ok()?;

    // Read /T if present
    if let Ok(t_obj) = dict.get(b"T")
        && let Ok(t) = t_obj.as_str()
        && let Ok(t_str) = std::str::from_utf8(t)
        && t_str == name
    {
        return Some(field_id);
    }

    // Recurse into /Kids (some forms store names across a hierarchy)
    if let Ok(kids) = dict.get(b"Kids").and_then(Object::as_array) {
        for kid in kids {
            if let Ok(kid_id) = kid.as_reference()
                && let Some(found) = search_form_field_node(doc, kid_id, name)
            {
                return Some(found);
            }
        }
    }

    None
}
