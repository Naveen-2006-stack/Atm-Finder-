export default function LiveDot({ isLive }) {
  if (!isLive) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-white/70">
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        Stale
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs text-emerald-300" aria-label="Live update in last 15 minutes">
      <span className="live-pulse h-2.5 w-2.5 rounded-full bg-emerald-400" />
      Live
    </span>
  );
}
