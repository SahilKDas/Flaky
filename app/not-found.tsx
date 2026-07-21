import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="grid min-h-[70vh] place-items-center px-6"><div className="text-center"><Activity size={28} className="mx-auto text-[#6b776f]" /><h1 className="mt-4 text-2xl font-semibold">Case file not found</h1><p className="mt-2 text-sm text-[#77827b]">This test may have moved or been removed from the demo dataset.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1e3025] px-4 py-2.5 text-xs font-semibold text-white"><ArrowLeft size={13} />Back to dashboard</Link></div></main>;
}
