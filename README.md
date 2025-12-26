# Form Forge

## TODO

- [ ] Restructure Monorepo
- [ ] Fix Biome issues
- [ ] Pre-commit hooks for frontend
- [ ] CI for frontend
- [ ] Generate ApiClient from OpenAPI spec
- [ ] Refactor backend
- [ ] Return field type from BE and stop user from mapping fields with different type

## Using qpdf to flatten and “de-binary” a PDF file

`qpdf --qdf --object-streams=disable --stream-data=uncompress <input.pdf> <output.pdf>`

## Structure

The root object of the PDF file contains a reference `/AcroForm 3 0 R` to the AcroForm dictionary:

```
1 0 obj
<<
  /AcroForm 3 0 R
  ...
>>
endobj
```

The actual AcroForm dictionary lives in object `3 0 obj`. That dictionary references an indirect `/Fields` object:

```
3 0 obj
<<
  ...
  /Fields 26 0 R
>>
endobj
```

The `/Fields` is a big array if field references:

```
26 0 obj
[
  41 0 R
  ...
]
endobj
```

A typical entry (e.g. `41 0 obj`) is a terminal[^1] text field:

```
41 0 obj
<<
  ...
  /FT /Tx
  ...
  /Subtype /Widget
  /T (CharacterName 2)
  ...
  /V ()
>>
endobj
```

There’s no `/AA` (Additional Actions) or /CO (calculation order) on the field, so no per-field JS hook yet.

[^1]: A terminal field is one that does not contain any children that are fields. A non-terminal field is one that has
children that are fields.