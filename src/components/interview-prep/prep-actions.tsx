"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InterviewPrepActions({ applicationId }: { applicationId: string }) {
  async function generate() {
    const res = await fetch("/api/interview-prep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Failed");
      return;
    }
    toast.success("Interview prep scaffold saved");
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={() => void generate()}>
        Regenerate prep from JD
      </Button>
    </div>
  );
}
