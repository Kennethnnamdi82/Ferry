export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

import { documentsApi, getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";

/**
 * Securely download a document to the user's device (Downloads folder).
 *
 * Flow:
 *   1. Request a short-lived signed URL from the backend.
 *   2. Fetch the file as a Blob (so the browser saves it instead of navigating).
 *   3. Trigger a synthetic <a download> click.
 *   4. If the signed URL has expired (403/410), retry once.
 */
export async function downloadDocumentToDevice(
  documentId: string,
  filename: string,
): Promise<void> {
  const fetchAndSave = async () => {
    const { data } = await documentsApi.download(documentId);
    const res = await fetch(data.url, { credentials: "omit" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const message = detail
        ? `Download failed with status ${res.status}: ${detail.slice(0, 160)}`
        : `Download failed with status ${res.status}`;
      const err = new Error(message);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    const blob = await res.blob();
    downloadBlob(blob, filename);
  };

  try {
    await fetchAndSave();
  } catch (err) {
    const status = (err as { status?: number }).status;
    // Expired/forbidden signed URL → request a fresh one and retry once.
    if (status === 403 || status === 410 || status === 401) {
      try {
        await fetchAndSave();
        return;
      } catch (err2) {
        toast.error(getApiErrorMessage(err2));
        throw err2;
      }
    }
    toast.error(getApiErrorMessage(err));
    throw err;
  }
}
