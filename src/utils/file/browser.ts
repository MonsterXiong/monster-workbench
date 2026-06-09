import { firstFile } from "./list";
import { getFileLikeMimeType, getMimeTypeByPath } from "./mime";
import { getNativeAcceptValue } from "./accept";
import type { BrowserDownloadResult, BrowserFileReadResult, FileLike } from "./types";

export function createTextBlob(contents: string, mimeType = "text/plain"): Blob {
  return new Blob([contents], { type: mimeType });
}

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export function createBrowserDownloadResult(
  success: boolean,
  fileName: string,
  blob: Blob,
  error?: unknown
): BrowserDownloadResult {
  return {
    success,
    fileName,
    size: blob.size,
    mimeType: blob.type || getMimeTypeByPath(fileName, ""),
    ...(error === undefined ? {} : { error }),
  };
}

export function downloadBlobResult(fileName: string, blob: Blob): BrowserDownloadResult {
  try {
    downloadBlob(fileName, blob);
    return createBrowserDownloadResult(true, fileName, blob);
  } catch (error) {
    return createBrowserDownloadResult(false, fileName, blob, error);
  }
}

export function downloadTextFile(fileName: string, contents: string, mimeType = "text/plain"): void {
  downloadBlob(fileName, createTextBlob(contents, mimeType));
}

export function downloadTextFileResult(fileName: string, contents: string, mimeType = "text/plain"): BrowserDownloadResult {
  return downloadBlobResult(fileName, createTextBlob(contents, mimeType));
}

export function readFileAsText(file: Blob, failedMessage = "Failed to read file"): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      resolve(String(event.target?.result ?? ""));
    };
    reader.onerror = () => reject(new Error(failedMessage));
    reader.readAsText(file);
  });
}

export async function readFileAsTextResult<T extends FileLike & Blob>(
  file: T,
  failedMessage = "Failed to read file"
): Promise<BrowserFileReadResult> {
  try {
    const text = await readFileAsText(file, failedMessage);
    return {
      success: true,
      text,
      fileName: file.name,
      size: file.size,
      mimeType: getFileLikeMimeType(file),
    };
  } catch (error) {
    return {
      success: false,
      text: "",
      fileName: file.name,
      size: file.size,
      mimeType: getFileLikeMimeType(file),
      error,
    };
  }
}

export function readBrowserTextFile(
  accept: string | readonly string[] | null | undefined,
  failedMessage = "Failed to read file"
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getNativeAcceptValue(accept) ?? "";
    input.onchange = (event: Event) => {
      const file = firstFile((event.target as HTMLInputElement).files);
      if (!file) return;

      readFileAsText(file, failedMessage).then(resolve, reject);
    };
    input.click();
  });
}
