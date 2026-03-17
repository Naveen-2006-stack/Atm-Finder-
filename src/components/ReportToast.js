"use client";

export default function ReportToast({ toast }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-toast rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-3 text-sm text-white shadow-xl backdrop-blur">
      <p className="font-semibold">+5 Reliability Points</p>
      <p className="text-white/90">{toast.message}</p>
    </div>
  );
}
