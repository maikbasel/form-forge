import {
  PDFArray,
  type PDFContext,
  PDFDict,
  PDFDocument,
  PDFName,
  type PDFObject,
  type PDFString,
} from "pdf-lib";

/**
 * Extracts the JavaScript names array from the PDF Names tree.
 */
function getJavaScriptNamesArray(
  context: PDFContext,
  catalog: PDFDict
): PDFArray | null {
  const names = catalog.lookup(PDFName.of("Names"));
  if (!names) {
    return null;
  }

  const namesDict = context.lookup(names, PDFDict);
  if (!namesDict) {
    return null;
  }

  const javaScriptRef = namesDict.lookup(PDFName.of("JavaScript"));
  if (!javaScriptRef) {
    return null;
  }

  const javaScriptDict = context.lookup(javaScriptRef, PDFDict);
  if (!javaScriptDict) {
    return null;
  }

  const namesArrayRef = javaScriptDict.lookup(PDFName.of("Names"));
  if (!namesArrayRef) {
    return null;
  }

  return context.lookup(namesArrayRef, PDFArray) ?? null;
}

/**
 * Extracts JavaScript code from a name/action pair in the names array.
 */
function extractScriptFromAction(
  context: PDFContext,
  nameObj: PDFObject,
  actionRef: PDFObject
): [string, string] | null {
  if (!(nameObj && actionRef)) {
    return null;
  }

  const nameStr = context.lookup(nameObj) as PDFString;
  const actionDict = context.lookup(actionRef, PDFDict);

  if (!(nameStr && actionDict)) {
    return null;
  }

  const name = nameStr.decodeText();
  const jsRef = actionDict.lookup(PDFName.of("JS"));

  if (!jsRef) {
    return null;
  }

  const jsObj = context.lookup(jsRef) as PDFString;
  if (!jsObj) {
    return null;
  }

  const jsCode = jsObj.decodeText();
  return [name, jsCode];
}

/**
 * Reads document-level JavaScript from a PDF file.
 * Returns an array of tuples containing [name, jsCode].
 */
export async function readDocumentJavaScript(
  pdfBytes: Uint8Array
): Promise<[string, string][]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const context = pdfDoc.context;
  const catalog = context.lookup(pdfDoc.catalog) as PDFDict;

  const namesArray = getJavaScriptNamesArray(context, catalog);
  if (!namesArray) {
    return [];
  }

  const scripts: [string, string][] = [];

  // Names array contains pairs: [name1, action_ref1, name2, action_ref2, ...]
  for (let i = 0; i < namesArray.size(); i += 2) {
    const nameObj = namesArray.lookup(i);
    const actionRef = namesArray.lookup(i + 1);

    const script = extractScriptFromAction(context, nameObj, actionRef);
    if (script) {
      scripts.push(script);
    }
  }

  return scripts;
}

/**
 * Finds a form field by name in the fields array.
 */
function findFieldByName(
  context: PDFContext,
  fieldsArray: PDFArray,
  fieldName: string
): PDFDict | null {
  for (let i = 0; i < fieldsArray.size(); i++) {
    const fieldRef = fieldsArray.get(i);
    const field = context.lookup(fieldRef, PDFDict);
    if (!field) {
      continue;
    }

    const fieldNameObj = field.lookup(PDFName.of("T"));
    if (!fieldNameObj) {
      continue;
    }

    const fieldNameStr = context.lookup(fieldNameObj) as PDFString;
    if (fieldNameStr?.decodeText() === fieldName) {
      return field;
    }
  }

  return null;
}

/**
 * Extracts calculation JavaScript from a field's Additional Actions dictionary.
 */
function extractCalculationJS(context: PDFContext, fieldDict: PDFDict): string {
  const aaRef = fieldDict.lookup(PDFName.of("AA"));
  if (!aaRef) {
    throw new Error("No AA (Additional Actions) found on field");
  }

  const aaDict = context.lookup(aaRef, PDFDict);
  if (!aaDict) {
    throw new Error("AA is not a dictionary");
  }

  const calcActionRef = aaDict.lookup(PDFName.of("C"));
  if (!calcActionRef) {
    throw new Error("No 'C' calculation action found in AA dictionary");
  }

  const calcActionDict = context.lookup(calcActionRef, PDFDict);
  if (!calcActionDict) {
    throw new Error("Calculation action is not a dictionary");
  }

  const jsRef = calcActionDict.lookup(PDFName.of("JS"));
  if (!jsRef) {
    throw new Error("No 'JS' found in calculation action");
  }

  const jsObj = context.lookup(jsRef) as PDFString;
  if (!jsObj) {
    throw new Error("JS is not a string");
  }

  return jsObj.decodeText();
}

/**
 * Reads the calculation JavaScript attached to a specific form field.
 * @param pdfBytes - The PDF file as a byte array
 * @param fieldName - The name of the form field to read
 * @returns The JavaScript code attached to the field's calculation action
 */
export async function readFieldCalculationJS(
  pdfBytes: Uint8Array,
  fieldName: string
): Promise<string> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const context = pdfDoc.context;
  const catalog = context.lookup(pdfDoc.catalog) as PDFDict;

  const acroFormRef = catalog.lookup(PDFName.of("AcroForm"));
  if (!acroFormRef) {
    throw new Error("No AcroForm found");
  }

  const acroForm = context.lookup(acroFormRef, PDFDict);
  if (!acroForm) {
    throw new Error("AcroForm is not a dictionary");
  }

  const fieldsRef = acroForm.lookup(PDFName.of("Fields"));
  if (!fieldsRef) {
    throw new Error("No Fields array found");
  }

  const fieldsArray = context.lookup(fieldsRef, PDFArray);
  if (!fieldsArray) {
    throw new Error("Fields is not an array");
  }

  const fieldDict = findFieldByName(context, fieldsArray, fieldName);
  if (!fieldDict) {
    throw new Error(`Field "${fieldName}" not found`);
  }

  return extractCalculationJS(context, fieldDict);
}
