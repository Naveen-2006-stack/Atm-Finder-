"use client";

export default function DarkModeToggle({ darkMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "rounded-full px-3 py-2 text-xs font-semibold tracking-wide transition",
        darkMode
          ? "border border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
          : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
      ].join(" ")}
      aria-label="Toggle dark mode"
    >
      {darkMode ? "Light" : "Dark"}
    </button>
  );
}
