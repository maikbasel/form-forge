# How it works

This page explains what Form Forge actually changes inside your PDF. You don't
need any of it to use the app, but it helps to understand why the calculations
behave the way they do, and why they work in some PDF readers and not others.

## Fillable PDFs can run JavaScript

A fillable PDF isn't just an image with boxes drawn on it. The boxes are real
form fields, defined by a part of the PDF format called AcroForm. AcroForm
fields can carry small pieces of JavaScript that a PDF reader runs while you
fill the form in. A field can have a "calculate" script that recomputes its
value whenever another field changes.

Form Forge uses exactly this mechanism. It doesn't convert your sheet, call
out to a server while you play, or lock you into its own app. It writes plain
AcroForm JavaScript into the file, and standard PDF readers do the rest.

## What Form Forge writes into the file

When you attach calculations and export, Form Forge adds two kinds of script
to your PDF.

**A shared helper script.** Form Forge embeds one document-level script,
named `HelpersJS`, that holds the D&D math: functions like
`calculateModifierFromScore`, `calculateSaveFromFields`, and
`calculateSkillFromFields`. It is written once per document, no matter how many
calculations you attach.

**A per-field calculate script.** For each calculation you attach, Form Forge
puts a short calculate script on the target field that calls the right helper
with the fields you chose. Attaching an Ability Modifier to `STRmod`, for
example, gives that field a calculate action equivalent to
`calculateModifierFromScore("STR")`.

## What happens when you open the sheet

Open the exported PDF in a JavaScript-capable reader and type a value into a
source field, such as your Strength score. The reader runs the calculate
scripts on the fields that depend on it. The target field reads the values it
needs, applies the D&D 5e formula (see the
[calculation reference](../reference/index.md)), and writes the result back
into itself. Change the score again and the numbers update again. Nothing
leaves the file.

## Why some readers don't calculate

Running AcroForm JavaScript is optional for a PDF reader, and many skip it.
Adobe Acrobat Reader runs it. A lot of in-browser previewers and phone PDF
apps do not, so the fields just sit at whatever value they were last saved
with. If your calculations don't update, open the file in Acrobat Reader.

Because the logic lives inside the PDF as standard AcroForm JavaScript, a sheet
you export keeps working on its own. You don't need Form Forge running to use
it later.
