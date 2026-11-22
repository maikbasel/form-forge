# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

One shared UI (`packages/ui`) ships in two shells: the Next.js web app (`apps/web`) and the Tauri desktop app (`apps/native`). Tauri renders the same web UI on Windows, macOS and Linux, so the design language is web, not per-OS native.

## Users

- **Players (primary):** non-technical D&D 5e players with a fillable PDF character sheet. They want the sheet to work out modifiers, saving throws and skill checks so they stop redoing the math by hand every time a value changes.
- **DMs and table hosts:** people who prepare sheets for a group, or self-host the web version with Docker for their table.

## Product Purpose

Form Forge adds automatic calculations to fillable D&D 5e character sheets. The user uploads a fillable PDF, Form Forge extracts its form fields, the user maps calculations between fields, and Form Forge embeds the generated JavaScript in the PDF's AcroForm. Success: the downloaded sheet fills in its own derived values (for example, Strength score to Strength modifier, saving throw and Athletics check) in any PDF reader.

## Positioning

The user never writes code or touches PDF internals. Calculations are presets mapped onto the sheet's own fields, and the output is a plain PDF that keeps working without Form Forge. Form Forge is a one-time setup tool, not a place players stay.

## Operating Context

- Flow: upload sheet, view it with its fields, select fields, configure a calculation, download the modified PDF.
- Input must be a fillable PDF. Scans or photos of printed sheets have no fields and cannot work.
- Form Forge must handle any fillable character sheet. Never assume a naming pattern or structure: field names are whatever the sheet's author chose (for example "Check Box 23"). The way to tell a player what a field is: show a snippet of the sheet where it sits (`FieldSnippet` hover preview).
- The calculations run only in PDF viewers that execute AcroForm JavaScript, such as Adobe Acrobat/Reader. Browser PDF viewers do not run them, so the result cannot be previewed in the web UI.
- Web: self-hosted via Docker Compose (Next.js + Rust API, PostgreSQL, S3-compatible storage). Desktop: offline, embedded libSQL and filesystem storage, auto-update.

## Capabilities and Constraints

- Calculation types today: Ability Modifier, Saving Throw Modifier, Skill Modifier (see `docs/reference/index.md`).
- No accounts and no cloud dependency. Desktop works fully offline.
- Every UI string exists in English and German (`packages/i18n/locales`). Layouts must fit the longer German strings.
- Terminology: "sheet" (the PDF), "field" (a box you can click into and type), "calculation" / "action" (a rule that fills one field from others).
- Attaching a calculation writes JavaScript into the target field's actions and overwrites any calculation already on that field.
- Mobile editing is out of scope for now. It would need a different way to view and edit the sheet.
- Undecided (later): detecting well-known sheets and applying a full calculation set automatically. This must not become a requirement that restricts which sheets work.
- Undecided: support for TTRPG systems other than D&D 5e. It may come later, and it is unclear whether it makes sense outside D&D. Do not design for it yet.

## Brand Commitments

- Name: Form Forge.
- App icon: `apps/native/src-tauri/app-icon.svg` (also used by the web app).
- Voice (from the docs): plain, second person, no jargon. "No math, no scripting."

## Evidence on Hand

- Usage walkthrough screenshots and video: `docs/assets/usage/` (`01-upload.png` to `05-download.png`, `usage-flow.webm`).
- User docs: `docs/` (published at maikbasel.github.io/form-forge).
- No testimonials, user counts, or press exist. Do not invent them.

## Product Principles

1. **No code shown.** Hide JavaScript, AcroForm and field IDs behind D&D terms the player already knows.
2. **The PDF is the product.** Every decision serves a sheet that works on its own in any reader after download.
3. **Get in, set up, get out.** Optimize for finishing a sheet quickly, not for time spent in the app.
4. **Local and private.** Nothing requires an account or a third-party service.
5. **Bilingual by default.** English and German are equal citizens in every surface.
