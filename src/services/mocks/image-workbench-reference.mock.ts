import { getCurrentTimestampMs } from "../../utils";

export function importMockImageWorkbenchReference(args: Record<string, unknown>) {
  const sourcePath = String((args.request as any)?.sourcePath || "").trim();
  const lower = sourcePath.toLowerCase();
  if (!sourcePath) {
    throw new Error("[ERR_IPC_BROWSER] Image Workbench reference image path is required");
  }
  if (
    lower.startsWith("data:") ||
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("asset:")
  ) {
    throw new Error("[ERR_IPC_BROWSER] Image Workbench reference image must be a local path");
  }
  const normalized = lower.replaceAll("\\", "/");
  if (
    !normalized.includes("uploads/images/") &&
    !normalized.includes("/.monster-tools/ai/image-workbench/assets/") &&
    !normalized.includes("/.monster-tools/ai/image-workbench/references/")
  ) {
    throw new Error("[ERR_IPC_BROWSER] Image Workbench reference image must come from uploads/images");
  }
  const fileName = sourcePath.split(/[\\/]/).pop() || "reference.png";
  const now = getCurrentTimestampMs();
  return {
    filePath: `C:\\Users\\MockUser\\.monster-tools\\ai\\image-workbench\\references\\${now}-${fileName}`,
    originalPath: sourcePath,
    mimeType:
      fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")
        ? "image/jpeg"
        : "image/png",
    sizeBytes: 0,
    createdAtMs: now,
  };
}
