import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Activity, GitBranch, Search, Settings } from "lucide-react";
import { AIStatusBadge } from "@/components/ai-status-badge";
import "./globals.css";

const title = "Flaky — CI root-cause detective";
const description = "Find, explain, and fix non-deterministic tests.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title,
    description,
    openGraph: { title, description, url: origin, type: "website", images: [`${origin}/og.png`] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-[#dfe5df] bg-[rgba(250,251,249,.92)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1500px] items-center px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="Flaky dashboard">
              <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#1d2a22] text-white shadow-sm">
                <Activity size={15} strokeWidth={2.5} />
              </span>
              <span className="text-[15px] font-bold tracking-[-0.02em]">flaky</span>
            </Link>
            <div className="mx-5 h-5 w-px bg-[#dce1dc]" />
            <span className="mobile-hide rounded-full border border-[#dce3dd] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#617067]">acme / storefront</span>
            <div className="ml-3"><AIStatusBadge /></div>
            <div className="ml-auto flex items-center gap-1.5 text-[#6e7972]">
              <button className="mobile-hide flex h-8 items-center gap-2 rounded-lg border border-transparent px-2.5 text-xs hover:border-[#dce1dc] hover:bg-white" aria-label="Search">
                <Search size={14} /> <span>Search</span><kbd className="rounded border bg-[#f5f6f4] px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
              </button>
              <a href="https://github.com/SahilKDas/Flaky" target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white" aria-label="GitHub repository"><GitBranch size={16} /></a>
              <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white" aria-label="Settings"><Settings size={16} /></button>
              <div className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-[#dce9df] text-[10px] font-bold text-[#31543c]">SK</div>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
