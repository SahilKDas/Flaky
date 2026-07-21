export function ScorePill({ score }: { score: number }) {
  const tone = score >= 60
    ? "border-[#f0c5c1] bg-[#fff0ee] text-[#b93838]"
    : score >= 30
      ? "border-[#eed7aa] bg-[#fff6e3] text-[#a9600e]"
      : score > 0
        ? "border-[#e4ddbd] bg-[#fbf8e9] text-[#827222]"
        : "border-[#d9e5dc] bg-[#eef7f0] text-[#37734c]";
  return <span className={`inline-flex min-w-[54px] justify-center rounded-full border px-2 py-1 text-xs font-bold tabular-nums ${tone}`}>{score}%</span>;
}
