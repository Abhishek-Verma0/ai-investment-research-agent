export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        {/* upward trend line + checkmark motif */}
        <path
          d="M4 15l4-4 3 3 6-7"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M17 7h3v3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="text-[15px] font-semibold tracking-tight text-slate-100">
      Verdict<span className="text-indigo-400">AI</span>
    </span>
  );
}
