import { schema } from "@/db";

/**
 * Selects resume metadata columns without loading the `pdfBase64` blob on list views.
 */
export const publicResumeSelect = {
  id: schema.resumes.id,
  userId: schema.resumes.userId,
  kind: schema.resumes.kind,
  title: schema.resumes.title,
  fileName: schema.resumes.fileName,
  mimeType: schema.resumes.mimeType,
  fileSizeBytes: schema.resumes.fileSizeBytes,
  rawText: schema.resumes.rawText,
  parsedJson: schema.resumes.parsedJson,
  tailoredForJobId: schema.resumes.tailoredForJobId,
  tailorIntensity: schema.resumes.tailorIntensity,
  tailorNotes: schema.resumes.tailorNotes,
  isDefault: schema.resumes.isDefault,
  createdAt: schema.resumes.createdAt,
  updatedAt: schema.resumes.updatedAt,
};
