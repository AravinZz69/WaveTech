import { getDocumentProxy, extractText } from "unpdf";

const MAX_RESUME_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

export function validateResumeFile(file: { name: string; type: string; size: number }): {
  ok: boolean;
  error?: string;
} {
  if (file.size <= 0) {
    return { ok: false, error: "Uploaded file is empty." };
  }
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, error: "File exceeds the 15 MB upload limit." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "txt"].includes(ext);
  if (!ALLOWED_MIME_TYPES.has(file.type) && !allowedExt) {
    return {
      ok: false,
      error: "Unsupported file format. Please upload a PDF, Word, image, or TXT file.",
    };
  }
  return { ok: true };
}

export async function extractResumeRawText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ rawText: string; totalPages: number }> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === "text/plain" || lowerName.endsWith(".txt")) {
    return { rawText: buffer.toString("utf-8").trim(), totalPages: 1 };
  }

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text, totalPages } = await extractText(pdf, { mergePages: true });
      return { rawText: (text || "").trim(), totalPages: totalPages || 1 };
    } catch {
      return { rawText: "", totalPages: 1 };
    }
  }

  // Fallback for .docx/.doc XML text extraction if uncompressed or plain strings,
  // otherwise Gemini multimodal handles images and binary files cleanly.
  if (lowerName.endsWith(".docx")) {
    const rawUtf = buffer.toString("utf-8");
    const matches = rawUtf.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (matches && matches.length > 0) {
      const text = matches
        .map((m) => m.replace(/<[^>]+>/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return { rawText: text, totalPages: 1 };
    }
  }

  return { rawText: "", totalPages: 1 };
}
