import type { CommitTrend } from "@/lib/types";

export function TrendChart({ data }: { data: CommitTrend[] }) {
  const width = 580;
  const height = 160;
  const padX = 28;
  const padY = 18;
  const max = 100;
  const points = data.map((item, index) => ({
    ...item,
    x: padX + index * ((width - padX * 2) / Math.max(data.length - 1, 1)),
    y: height - padY - (item.score / max) * (height - padY * 2),
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${points.at(-1)?.x ?? 0} ${height - padY} L ${points[0]?.x ?? 0} ${height - padY} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[170px] w-full overflow-visible" role="img" aria-label="Flakiness trend by commit">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d98532" stopOpacity=".22" /><stop offset="1" stopColor="#d98532" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 50, 100].map((value) => {
          const y = height - padY - (value / 100) * (height - padY * 2);
          return <g key={value}><line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e8ece8" strokeDasharray="3 4" /><text x={0} y={y + 3} fontSize="9" fill="#929d95">{value}%</text></g>;
        })}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="#c96e24" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <g key={point.commitSha}><circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#c96e24" strokeWidth="2" /><text x={point.x} y={height + 1} textAnchor="middle" fontFamily="monospace" fontSize="9" fill="#808c84">{point.label}</text></g>)}
      </svg>
      <div className="mt-1 flex items-center justify-center gap-5 text-[10px] text-[#7e8982]"><span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#cb7026]" />Same-commit inconsistency</span><span>Each point is one commit</span></div>
    </div>
  );
}
