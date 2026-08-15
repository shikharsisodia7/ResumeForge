import { UploadClient } from "@/components/upload/upload-client";
import { requireUser } from "@/lib/auth/current-user";

export default async function UploadPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Upload your resume</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        PDF, DOCX, or TXT, up to 10 MB. We&apos;ll extract the text and have an AI agent organize it
        into a clean, ATS-friendly first draft.
      </p>
      <div className="mt-6">
        <UploadClient userId={user.id} />
      </div>
    </div>
  );
}
