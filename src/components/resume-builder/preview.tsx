"use client";

import type { ResumeContent } from "@/lib/types";

export function ResumePreview({ content }: { content: ResumeContent | null }) {
  if (!content) {
    return <p className="text-sm text-zinc-500">Select a version to preview.</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 text-sm leading-relaxed shadow-inner dark:border-zinc-700 dark:bg-zinc-950">
      <header className="border-b pb-4">
        <h2 className="text-xl font-bold">{content.profile.fullName}</h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {[content.profile.email, content.profile.phone, content.profile.location].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
          {[content.profile.linkedIn, content.profile.github, content.profile.portfolio].filter(Boolean).join(" · ")}
        </p>
      </header>
      {content.profile.summary ? (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Summary</h3>
          <p className="mt-1 whitespace-pre-wrap">{content.profile.summary}</p>
        </section>
      ) : null}
      {content.sections.map((sec) => (
        <section key={sec.title + sec.type}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">{sec.title}</h3>
          <ul className="mt-2 space-y-3">
            {sec.items.map((item) => (
              <li key={item.id}>
                {item.content ? <p className="font-medium">{item.content}</p> : null}
                {item.subContent ? <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{item.subContent}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
