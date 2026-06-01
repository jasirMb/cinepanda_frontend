import api from "@/lib/axios-client";

export type UploadFolder =
  | "ledger"
  | "products"
  | "quotations"
  | "logos"
  | "patterns"
  | "avatars"
  | "misc";

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  key: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  success: boolean;
  data: UploadedFile;
  message?: string;
}

/**
 * Upload a single file to Cloudflare R2 (via the backend) and get back its public URL.
 * `onProgress` receives 0–100 as the upload streams.
 */
export async function uploadFile(
  file: File,
  folder: UploadFolder = "misc",
  onProgress?: (percent: number) => void
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const { data } = await api.post<UploadResponse>("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });

  return data.data;
}

/** Delete a previously uploaded file by its object key. */
export async function deleteFile(key: string): Promise<void> {
  await api.delete("/files", { data: { key } });
}
