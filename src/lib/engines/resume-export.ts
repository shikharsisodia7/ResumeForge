import type { ResumeContent } from "@/lib/types";

export function resumeToPlainText(content: ResumeContent): string {
  const lines: string[] = [];
  const p = content.profile;
  lines.push(p.fullName.toUpperCase());
  const contact = [p.email, p.phone, p.location].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);
  const links = [p.linkedIn, p.github, p.portfolio, p.website].filter(Boolean);
  if (links.length) lines.push(links.join(" | "));
  if (p.summary) {
    lines.push("");
    lines.push("SUMMARY");
    lines.push(p.summary);
  }
  content.sections.forEach((sec) => {
    lines.push("");
    lines.push(sec.title.toUpperCase());
    sec.items.forEach((item) => {
      lines.push(item.content);
      if (item.subContent) lines.push(item.subContent);
    });
  });
  return lines.join("\n");
}

export function resumeToMarkdown(content: ResumeContent): string {
  const lines: string[] = [`# ${content.profile.fullName}`, ""];
  const contact = [content.profile.email, content.profile.phone, content.profile.location]
    .filter(Boolean)
    .join(" · ");
  if (contact) lines.push(contact);
  if (content.profile.summary) {
    lines.push("", "## Summary", "", content.profile.summary);
  }
  content.sections.forEach((sec) => {
    lines.push("", `## ${sec.title}`, "");
    sec.items.forEach((item) => {
      lines.push(`- ${item.content}`);
      if (item.subContent) lines.push(`  - ${item.subContent}`);
    });
  });
  return lines.join("\n");
}

export function resumeToHTML(content: ResumeContent, template: string): string {
  const fontFamily =
    template === "dense-tech"
      ? "Consolas, monospace"
      : "Georgia, 'Times New Roman', serif";
  const fontSize = template === "dense-tech" ? "10px" : "11px";
  const lineHeight = template === "dense-tech" ? "1.25" : "1.4";

  const sectionsHtml = content.sections
    .map(
      (sec) => `
    <section style="margin-bottom:12px">
      <h2 style="font-size:12px;text-transform:uppercase;border-bottom:1px solid #333;margin:0 0 6px;padding-bottom:2px">${sec.title}</h2>
      ${sec.items
        .map(
          (item) => `
        <div style="margin-bottom:6px">
          <div style="font-weight:600">${escapeHtml(item.content)}</div>
          ${item.subContent ? `<div style="margin-left:12px;font-size:${fontSize}">${escapeHtml(item.subContent)}</div>` : ""}
        </div>`
        )
        .join("")}
    </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(content.profile.fullName)} - Resume</title></head>
<body style="font-family:${fontFamily};font-size:${fontSize};line-height:${lineHeight};max-width:8.5in;margin:0 auto;padding:0.5in;color:#111">
  <header style="text-align:center;margin-bottom:14px">
    <h1 style="font-size:18px;margin:0 0 4px">${escapeHtml(content.profile.fullName)}</h1>
    <div style="font-size:10px">${[content.profile.email, content.profile.phone, content.profile.location]
      .filter((v): v is string => Boolean(v))
      .map(escapeHtml)
      .join(" · ")}</div>
  </header>
  ${content.profile.summary ? `<p style="margin:0 0 12px">${escapeHtml(content.profile.summary)}</p>` : ""}
  ${sectionsHtml}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function resumeToJSON(content: ResumeContent): string {
  return JSON.stringify(content, null, 2);
}
