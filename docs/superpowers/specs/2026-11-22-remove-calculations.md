# Removing and retargeting calculations

Status: proposed. Backend only; the editor gets a Remove button once this lands.

## Problem

Players can attach a calculation and overwrite it by attaching again to the same
result field. They can't remove one, and they can't move one to a different
result field. Both need the calculate script taken back out of the PDF.

The PDF can't be cleaned up reliably today, because `attach_calculation_script`
(`crates/actions_core/src/ports/driving.rs`) edits the one stored PDF in place:

1. It reads the stored file. The original upload is not kept.
2. `add_doc_level_js` replaces `Catalog /Names /JavaScript` with a new name tree
   on every attach.
3. `attach_calculation_js` finds the field with `find_form_field_by_name` (a
   partial `/T` match, first depth-first hit), sets `/AA /C` to a new JS
   object, and rebuilds `/CO` as a `BTreeSet<ObjectId>`.
4. It writes the file back, then upserts `attached_action` on
   `UNIQUE(sheet_id, target_field)`. A failed upsert only logs a warning.

That flow has these defects, which removal would make worse:

| # | Defect | Effect |
| --- | --- | --- |
| 1 | The doc-level name tree is replaced, not merged | The sheet author's own document scripts are deleted. If `/Names` is inline, other name trees go too. |
| 2 | `/CO` is sorted by object id, not by dependency | A skill can be calculated before the ability modifier it reads, so it shows a stale value until the next change. |
| 3 | Attach resolves `AcroForm`/`Fields` with `as_reference`, while listing uses `get_deref` | Sheets with inline `Fields` show their fields but can't have calculations attached. |
| 4 | Fields match on a partial `/T` name | With repeated partial names, the script can land on the wrong field. |
| 5 | The PDF is written before the DB row, and a DB failure is ignored | The PDF and the list in the editor can disagree. |
| 6 | Overwritten JS objects are orphaned, not deleted | The file grows with every attach. |

## Proposal: rebuild from the original

Treat the uploaded PDF as read-only input and the `attached_action` rows as the
source of truth. Every change rebuilds the exported PDF from those two.

```
original.pdf ─┐
              ├─ build() ─▶ built.pdf  (what Export returns)
DB rows ──────┘
```

### Storage

- Store the upload once, unchanged, as `sheets/{id}/original.pdf`.
- Store the build output as `sheets/{id}/built.pdf`. Export and the editor
  preview read this file. If it is missing, they read `original.pdf`.
- `SheetStoragePort` gains a way to address both keys. Use an enum argument
  (`SheetFile::Original | SheetFile::Built`), not a second port.

### Build

`ActionPdfPort` gets one operation that replaces the two current ones:

```rust
fn build(
    &self,
    original: &Path,
    actions: &[CalculationAction],
    out: &Path,
) -> Result<(), ActionError>;
```

`build` does the following:

1. Load `original`.
2. Merge the helper script into the existing document JavaScript name tree
   under a fixed key (`FormForgeHelpers`). Dereference `/Names` if it is
   inline. Leave all other entries alone. (Fixes 1.)
3. Resolve `AcroForm` and `Fields` with dereferencing in both lookups. (Fixes 3.)
4. Find each target by its fully qualified name (`parent.child` from `/T`
   segments), exactly as listing reports it. Reject an action whose target is
   not found or matches more than one field. (Fixes 4.)
5. Set `/AA /C` on each target.
6. Write `/CO` in dependency order: a calculation goes after every calculation
   whose target it reads. Sort the mapping graph topologically. If there is a
   cycle, return `InvalidAction` and name the fields in it. (Fixes 2.)
7. Set `/NeedAppearances true` and save to `out`. Old scripts are never in the
   input, so nothing is orphaned. (Fixes 6.)

`build` is a pure function of its inputs, so it can be tested with fixtures
and no storage.

### Service operations

All three run in one DB transaction. The transaction commits only after the
build has been written to storage. (Fixes 5.)

| Operation | Steps |
| --- | --- |
| Attach | Upsert the row by `(sheet_id, target_field)`, build, write `built.pdf`, commit |
| Update | Update the row by `id` (the target may change), build, write, commit |
| Remove | Delete the row by `id`, build, write, commit. If no rows remain, delete `built.pdf` |

If the build or the write fails, roll back and return the error. The stored
`built.pdf` is then still the previous good build.

### HTTP API

Rows are addressed by `id`, because field names can contain `/` and spaces.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `PUT` | `/dnd5e/{sheet_id}/actions` | the action (unchanged) | `204` |
| `PUT` | `/dnd5e/{sheet_id}/actions/{action_id}` | the action | `204`, `404` if the row doesn't exist, `409` if the new target already has a calculation |
| `DELETE` | `/dnd5e/{sheet_id}/actions/{action_id}` | none | `204`, `404` if the row doesn't exist |

Update the OpenAPI spec in `packages/api-spec` and regenerate the client.

### Desktop app

`crates/actions_pdf` and `crates/actions_core` are shared, so the build logic
comes for free. `sheets_fs` stores `original.pdf` and `built.pdf` next to each
other. `sheets_libsql` gets the same transaction rule.

### Existing sheets

Sheets uploaded before this change have no original. A migration step creates
one from the stored file by removing exactly what Form Forge added:

- the `/AA /C` entry on every field named by that sheet's rows,
- those fields in `/CO`,
- the helper script entry in the document name tree.

The migration then saves the result as `original.pdf`, runs a build to produce
`built.pdf`, and marks the sheet as migrated. Run it lazily, on first access
after the upgrade, so the upgrade doesn't wait on every sheet. If stripping
fails, log it and leave the sheet without a migrated original. For that sheet,
Remove returns `409` with a message asking the player to upload the sheet again.

## Editor changes once the backend exists

- Each card gets a Remove button. Removal can be undone by attaching the stored
  mapping again, so use an Undo action on the toast, not a confirmation dialog.
- Editing unlocks the result field. Saving calls the `PUT …/{action_id}` route.

## Tests

- `build` against `DnD_5E_CharacterSheet_FormFillable.pdf`, plus fixtures with
  inline `/Names`, inline `Fields`, existing author document scripts, and
  repeated partial names.
- `/CO` order for an ability modifier → skill chain, and the error for a cycle.
- Service: attach, update and remove each roll back when the build or the
  write fails (mock the ports).
- Migration: a sheet attached with the old code strips back to a file whose
  `/AA /C`, `/CO` and name tree match the upload.
- E2E: attach three calculations, remove one, export, and check that
  `readFieldCalculationJS` returns nothing for the removed field and the other
  two scripts are unchanged.
