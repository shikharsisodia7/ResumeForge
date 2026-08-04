import { ApiError } from "@/lib/client/api";

/**
 * `fetch` has no upload-progress signal, so the upload stage uses
 * XMLHttpRequest instead — its `upload.onprogress` events are real byte
 * counts, not a simulated timer.
 */
export function uploadResumeWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<{ resume: { id: string; title: string }; version: { id: string; name: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/resumes/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as { resume: { id: string; title: string }; version: { id: string; name: string } });
      } else {
        const message =
          body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "Upload failed";
        reject(new ApiError(message, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error during upload", 0));

    xhr.send(formData);
  });
}
