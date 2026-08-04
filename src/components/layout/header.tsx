import Link from "next/link";
import { FileText, LogOut } from "lucide-react";

export function Header({ user }: { user: { displayName: string; email: string } }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <FileText className="size-5 text-accent" aria-hidden="true" />
            ResumeForge
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/prompts" className="hover:text-foreground">
              Prompt library
            </Link>
            <Link href="/gallery" className="hover:text-foreground">
              Gallery
            </Link>
          </nav>
        </div>

        <details className="group relative">
          <summary className="flex list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-[160px] truncate sm:inline">{user.displayName}</span>
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-1 border-t border-border" />
            <a
              href="/auth/logout"
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}
