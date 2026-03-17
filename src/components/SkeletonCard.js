export default function SkeletonCard() {
  return (
    <div className="skeleton-card rounded-2xl border border-white/10 p-5">
      <div className="mb-4 h-5 w-3/4 rounded bg-white/10" />
      <div className="mb-3 h-4 w-1/2 rounded bg-white/10" />
      <div className="h-4 w-2/3 rounded bg-white/10" />
    </div>
  );
}
