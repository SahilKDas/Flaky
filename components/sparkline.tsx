import type { TestStatus } from "@/lib/types";

export function Sparkline({ history }: { history: TestStatus[] }) {
  return (
    <div className="flex h-7 items-end gap-[2px]" aria-label={`${history.filter((item) => item === "fail").length} failures in recent history`}>
      {history.slice(-18).map((status, index) => (
        <span
          key={index}
          className={`block w-[3px] rounded-full transition-all ${status === "fail" ? "h-6 bg-[#d9534f]" : "h-3 bg-[#84b695]"}`}
        />
      ))}
    </div>
  );
}
