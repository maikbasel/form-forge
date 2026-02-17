import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FileUpload,
  FileUploadClear,
  FileUploadDropzone,
  FileUploadTrigger,
} from "./file-upload.tsx";

function createFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function triggerFileChange(input: HTMLInputElement, files: File[]) {
  // Create a minimal FileList-like object since DataTransfer is not available in jsdom
  const fileList = Object.create(null);
  for (let i = 0; i < files.length; i++) {
    fileList[i] = files[i];
  }
  fileList.length = files.length;
  fileList.item = (index: number) => files[index] ?? null;
  fileList[Symbol.iterator] = function* () {
    for (const file of files) {
      yield file;
    }
  };

  Object.defineProperty(input, "files", {
    value: fileList,
    writable: true,
    configurable: true,
  });
  fireEvent.change(input);
}

function TestUpload({
  accept,
  maxSize,
  maxFiles,
  multiple,
  onValueChange,
  onFileReject,
  onFileValidate,
}: {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  onValueChange?: (files: File[]) => void;
  onFileReject?: (file: File, message: string) => void;
  onFileValidate?: (file: File) => string | null | undefined;
}) {
  return (
    <FileUpload
      accept={accept}
      maxFiles={maxFiles}
      maxSize={maxSize}
      multiple={multiple}
      onFileReject={onFileReject}
      onFileValidate={onFileValidate}
      onValueChange={onValueChange}
    >
      <FileUploadDropzone>
        <p>Drop files here</p>
        <FileUploadTrigger>Browse</FileUploadTrigger>
      </FileUploadDropzone>
      <FileUploadClear>Clear</FileUploadClear>
    </FileUpload>
  );
}

describe("FileUpload", () => {
  it("accepts a valid file (correct type, under max size)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const file = createFile("test.pdf", 1024, "application/pdf");

    render(
      <TestUpload
        accept="application/pdf"
        maxSize={5000}
        onValueChange={onValueChange}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(onValueChange).toHaveBeenCalledWith([file]);
  });

  it("rejects file exceeding maxSize", async () => {
    const user = userEvent.setup();
    const onFileReject = vi.fn();
    const file = createFile("big.pdf", 10_000, "application/pdf");

    render(
      <TestUpload
        accept="application/pdf"
        maxSize={5000}
        onFileReject={onFileReject}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(onFileReject).toHaveBeenCalledWith(file, "File too large");
  });

  it("rejects wrong file type", () => {
    const onFileReject = vi.fn();
    const file = createFile("image.png", 1024, "image/png");

    render(<TestUpload accept="application/pdf" onFileReject={onFileReject} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Use fireEvent to bypass userEvent's accept attribute filter
    triggerFileChange(input, [file]);

    expect(onFileReject).toHaveBeenCalledWith(file, "File type not accepted");
  });

  it("rejects files beyond maxFiles limit", () => {
    const onFileReject = vi.fn();
    const file1 = createFile("a.pdf", 100, "application/pdf");
    const file2 = createFile("b.pdf", 100, "application/pdf");

    render(
      <TestUpload
        accept="application/pdf"
        maxFiles={1}
        multiple
        onFileReject={onFileReject}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Use fireEvent to send multiple files at once
    triggerFileChange(input, [file1, file2]);

    expect(onFileReject).toHaveBeenCalled();
  });

  it("calls onValueChange with file array when files are added", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const file = createFile("doc.pdf", 512, "application/pdf");

    render(
      <TestUpload accept="application/pdf" onValueChange={onValueChange} />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(onValueChange).toHaveBeenCalledWith([file]);
  });

  it("clear button clears all files and calls onValueChange([])", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const file = createFile("doc.pdf", 512, "application/pdf");

    render(
      <TestUpload accept="application/pdf" onValueChange={onValueChange} />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    onValueChange.mockClear();

    const clearButton = screen.getByText("Clear");
    await user.click(clearButton);

    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it("custom onFileValidate rejections work", async () => {
    const user = userEvent.setup();
    const onFileReject = vi.fn();
    const onFileValidate = (file: File) =>
      file.name.includes("bad") ? "Invalid filename" : null;
    const file = createFile("bad-file.pdf", 100, "application/pdf");

    render(
      <TestUpload
        accept="application/pdf"
        onFileReject={onFileReject}
        onFileValidate={onFileValidate}
      />
    );

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(onFileReject).toHaveBeenCalledWith(file, "Invalid filename");
  });
});
