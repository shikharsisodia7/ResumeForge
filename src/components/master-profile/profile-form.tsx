"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomSection, Education, UserProfile } from "@prisma/client";

const schema = z.object({
  fullName: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  linkedIn: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  portfolio: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
});

export type ProfileWithRelations = UserProfile & {
  educations: Education[];
  customSections: CustomSection[];
};

export function MasterProfileForm({ initial }: { initial: ProfileWithRelations }) {
  const [educations, setEducations] = useState(initial.educations);
  const [sections, setSections] = useState(initial.customSections ?? []);
  const [newSchool, setNewSchool] = useState("");
  const [secTitle, setSecTitle] = useState("");
  const [secBody, setSecBody] = useState("");

  const defaults = useMemo(
    () => ({
      fullName: initial.fullName,
      email: initial.email ?? "",
      phone: initial.phone ?? "",
      location: initial.location ?? "",
      linkedIn: initial.linkedIn ?? "",
      github: initial.github ?? "",
      portfolio: initial.portfolio ?? "",
      website: initial.website ?? "",
      summary: initial.summary ?? "",
    }),
    [initial]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  async function saveProfile(values: z.infer<typeof schema>) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        email: values.email || null,
        phone: values.phone || null,
        location: values.location || null,
        linkedIn: values.linkedIn || null,
        github: values.github || null,
        portfolio: values.portfolio || null,
        website: values.website || null,
        summary: values.summary || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? "Could not save profile");
      return;
    }
    toast.success("Profile saved");
  }

  async function addEducation() {
    if (!newSchool.trim()) return;
    const res = await fetch("/api/educations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school: newSchool.trim() }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Failed to add education");
      return;
    }
    setEducations((prev) => [...prev, j]);
    setNewSchool("");
    toast.success("Education added");
  }

  async function patchEducation(id: string, data: Partial<Education>) {
    const res = await fetch(`/api/educations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Update failed");
      return;
    }
    setEducations((prev) => prev.map((e) => (e.id === id ? j : e)));
    toast.success("Education updated");
  }

  async function deleteEducation(id: string) {
    const res = await fetch(`/api/educations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setEducations((prev) => prev.filter((e) => e.id !== id));
    toast.success("Removed");
  }

  async function addSection() {
    if (!secTitle.trim()) return;
    const res = await fetch("/api/custom-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: secTitle.trim(), content: secBody || undefined }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Could not create section");
      return;
    }
    setSections((prev) => [...prev, j]);
    setSecTitle("");
    setSecBody("");
    toast.success("Section created");
  }

  async function saveSection(row: CustomSection) {
    const res = await fetch(`/api/custom-sections/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: row.title, content: row.content }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error ?? "Save failed");
      return;
    }
    setSections((prev) => prev.map((s) => (s.id === row.id ? j : s)));
    toast.success("Section saved");
  }

  async function deleteSection(id: string) {
    const res = await fetch(`/api/custom-sections/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Identity & narrative</CardTitle>
          <Button type="submit" form="profile-form">
            Save profile
          </Button>
        </CardHeader>
        <CardContent>
          <form id="profile-form" className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(saveProfile)}>
            <label className="text-sm">
              Full name
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("fullName")} />
            </label>
            <label className="text-sm">
              Email
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("email")} />
            </label>
            <label className="text-sm">
              Phone
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("phone")} />
            </label>
            <label className="text-sm">
              Location
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("location")} />
            </label>
            <label className="text-sm">
              LinkedIn
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("linkedIn")} />
            </label>
            <label className="text-sm">
              GitHub
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("github")} />
            </label>
            <label className="text-sm md:col-span-2">
              Portfolio
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("portfolio")} />
            </label>
            <label className="text-sm md:col-span-2">
              Website
              <input className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("website")} />
            </label>
            <label className="text-sm md:col-span-2">
              Summary
              <textarea rows={5} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" {...form.register("summary")} />
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={newSchool}
              onChange={(e) => setNewSchool(e.target.value)}
              placeholder="School name"
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <Button type="button" onClick={addEducation}>
              Add
            </Button>
          </div>
          <ul className="space-y-3">
            {educations.map((e) => (
              <li key={e.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="text-xs uppercase text-zinc-500">
                    School
                    <input
                      defaultValue={e.school}
                      onBlur={(ev) =>
                        patchEducation(e.id, { school: ev.target.value })
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                  <label className="text-xs uppercase text-zinc-500">
                    Degree
                    <input
                      defaultValue={e.degree ?? ""}
                      onBlur={(ev) => patchEducation(e.id, { degree: ev.target.value || null })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                  <label className="text-xs uppercase text-zinc-500">
                    Major
                    <input
                      defaultValue={e.major ?? ""}
                      onBlur={(ev) => patchEducation(e.id, { major: ev.target.value || null })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                  <label className="text-xs uppercase text-zinc-500">
                    Graduation
                    <input
                      defaultValue={e.graduationDate ?? ""}
                      onBlur={(ev) =>
                        patchEducation(e.id, { graduationDate: ev.target.value || null })
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button type="button" variant="danger" size="sm" onClick={() => deleteEducation(e.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Use custom sections for leadership, awards, or niche blocks.{" "}
            <Link href="/experiences" className="text-indigo-600 hover:underline">
              Manage experiences
            </Link>{" "}
            separately.
          </p>
          <div className="space-y-2">
            <input
              value={secTitle}
              onChange={(e) => setSecTitle(e.target.value)}
              placeholder="Section title"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <textarea
              value={secBody}
              onChange={(e) => setSecBody(e.target.value)}
              placeholder="Optional body / bullets"
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <Button type="button" variant="outline" onClick={addSection}>
              Add section
            </Button>
          </div>
          <div className="space-y-3">
            {sections.map((sec) => (
              <EditableSectionRow key={sec.id} sec={sec} onSave={saveSection} onDelete={deleteSection} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditableSectionRow({
  sec,
  onSave,
  onDelete,
}: {
  sec: CustomSection;
  onSave: (s: CustomSection) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(sec.title);
  const [content, setContent] = useState(sec.content ?? "");

  return (
    <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full rounded-lg border px-3 py-2 font-medium dark:border-zinc-700 dark:bg-zinc-950"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="mt-2 flex gap-2">
        <Button type="button" size="sm" onClick={() => onSave({ ...sec, title, content }) }>
          Save section
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(sec.id)}>
          Remove
        </Button>
      </div>
    </div>
  );
}
