"use client";

import { useEffect, useMemo, useState } from "react";
import LiveDot from "@/components/LiveDot";

const REPORT_OPTIONS = [
  {
    label: "Available",
    value: "Full",
    helper: "Cash is available",
  },
  {
    label: "Not Available",
    value: "Empty",
    helper: "No cash dispensed",
  },
  {
    label: "Unknown",
    value: "Unknown",
    helper: "Could not confirm",
  },
];

const SERVICE_OPTIONS = [
  {
    key: "wheelChairAccess",
    label: "Wheelchair Access",
  },
  {
    key: "deposit",
    label: "Deposit Availability",
  },
  {
    key: "printers",
    label: "Printer Availability",
  },
];

function statusClass(statusDescription, cashLevel) {
  const status = String(statusDescription || "").toLowerCase();
  const cash = String(cashLevel || "").toLowerCase();

  if (status.includes("out") || cash === "empty") {
    return "bg-red-600/20 text-red-300 border-red-400/40";
  }

  if (cash === "partial" || status.includes("partial") || status.includes("low")) {
    return "bg-amber-500/20 text-amber-300 border-amber-400/40";
  }

  return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
}

function cashAvailabilityLabel(cashLevel) {
  const cash = String(cashLevel || "").toLowerCase();

  if (cash === "full") return "Available";
  if (cash === "partial") return "Partially Available";
  if (cash === "empty") return "Not Available";
  return "Unknown";
}

export default function ATMCard({ atm, onReportSubmit, darkMode = true }) {
  const [expanded, setExpanded] = useState(false);
  const [cashLevel, setCashLevel] = useState("Full");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(Boolean(atm.HasReported));
  const [serviceState, setServiceState] = useState({
    wheelChairAccess: Boolean(atm.WheelChairAccess),
    deposit: Boolean(atm.Deposit),
    printers: Boolean(atm.Printers),
  });

  const minutesAgo = Number(atm.MinutesAgo ?? 9999);
  const isLive = minutesAgo <= 15;
  const latitude = atm.latitude ?? atm.Latitude;
  const longitude = atm.longitude ?? atm.Longitude;

  const dateText = useMemo(() => {
    const d = new Date(atm.LastUpdated);
    return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
  }, [atm.LastUpdated]);

  const hasCommunityReport = Boolean(atm.ReporterName);

  const reporterText = useMemo(() => {
    if (!atm.ReporterName) {
      return "No community report yet";
    }

    return atm.ReporterBadgeLevel
      ? `${atm.ReporterName} · ${atm.ReporterBadgeLevel}`
      : atm.ReporterName;
  }, [atm.ReporterBadgeLevel, atm.ReporterName]);

  useEffect(() => {
    setIsSubmitted(Boolean(atm.HasReported));
    setServiceState({
      wheelChairAccess: Boolean(atm.WheelChairAccess),
      deposit: Boolean(atm.Deposit),
      printers: Boolean(atm.Printers),
    });
  }, [atm.Deposit, atm.HasReported, atm.Printers, atm.WheelChairAccess]);

  function toggleService(key) {
    setServiceState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);

    try {
      await onReportSubmit({
        atmId: atm.ATMId,
        cashLevel,
        wheelChairAccess: serviceState.wheelChairAccess,
        deposit: serviceState.deposit,
        printers: serviceState.printers,
      });
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function openDirections() {
    if (latitude == null || longitude == null) {
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <article
      className={[
        "rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur",
        darkMode ? "border border-white/10 bg-white/5" : "border border-slate-300 bg-white/90",
      ].join(" ")}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={darkMode ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900"}>{atm.BankName}</h3>
            <p className={darkMode ? "mt-1 text-xs text-white/70" : "mt-1 text-xs text-slate-600"}>ATM #{atm.ATMId} · PIN {atm.Pincode}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(atm.StatusDescription, atm.CashLevel)}`}>
            {atm.CashLevel === "Unknown" ? atm.StatusDescription : atm.CashLevel}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className={darkMode ? "text-xs text-white/70" : "text-xs text-slate-600"}>Last updated: {hasCommunityReport ? dateText : "No report yet"}</p>
          <LiveDot isLive={isLive} />
        </div>
      </button>

      <div className={`detail-grid ${expanded ? "detail-grid-open" : ""}`}>
        <div
          className={[
            "detail-inner mt-4 rounded-xl p-4",
            darkMode ? "border border-white/10 bg-black/20" : "border border-slate-300 bg-slate-50",
          ].join(" ")}
        >
          <div className={darkMode ? "grid grid-cols-1 gap-3 text-sm text-white/90 sm:grid-cols-3" : "grid grid-cols-1 gap-3 text-sm text-slate-800 sm:grid-cols-3"}>
            <p>
              <span className={darkMode ? "text-white/60" : "text-slate-500"}>Wheelchair</span>
              <br />
              <strong>{atm.WheelChairAccess ? "Available" : "Unavailable"}</strong>
            </p>
            <p>
              <span className={darkMode ? "text-white/60" : "text-slate-500"}>Deposit</span>
              <br />
              <strong>{atm.Deposit ? "Available" : "Unavailable"}</strong>
            </p>
            <p>
              <span className={darkMode ? "text-white/60" : "text-slate-500"}>Printers</span>
              <br />
              <strong>{atm.Printers ? "Available" : "Unavailable"}</strong>
            </p>
          </div>

          <div
            className={[
              "mt-4 rounded-xl p-3 text-sm",
              darkMode ? "border border-white/10 bg-white/5 text-white/80" : "border border-slate-300 bg-white text-slate-700",
            ].join(" ")}
          >
            <p className={darkMode ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55" : "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"}>Latest Community Signal</p>
            <p className={darkMode ? "mt-2 font-semibold text-white" : "mt-2 font-semibold text-slate-900"}>{reporterText}</p>
            <p className={darkMode ? "mt-1 text-xs text-white/60" : "mt-1 text-xs text-slate-500"}>
              {hasCommunityReport ? `Reported at ${dateText}` : "No cash report submitted for this ATM yet"}
            </p>
          </div>

          <div className="mt-4">
            <p className={darkMode ? "mb-2 text-xs font-semibold uppercase tracking-wider text-white/70" : "mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"}>Update ATM Status</p>
            <p className={darkMode ? "mb-3 text-sm text-white/80" : "mb-3 text-sm text-slate-700"}>
              Current cash availability: <span className={darkMode ? "font-semibold text-cyan-200" : "font-semibold text-cyan-700"}>{cashAvailabilityLabel(atm.CashLevel)}</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {REPORT_OPTIONS.map((option) => {
                const selected = cashLevel === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCashLevel(option.value)}
                    className={[
                      "rounded-xl border px-3 py-2 text-left transition",
                      "focus:outline-none focus:ring-2 focus:ring-cyan-400/60",
                      selected
                        ? darkMode
                          ? "border-cyan-300/80 bg-cyan-400/20 text-white"
                          : "border-cyan-400 bg-cyan-100 text-slate-900"
                        : darkMode
                          ? "border-white/15 bg-black/30 text-white/80 hover:border-white/30 hover:bg-white/10"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
                    ].join(" ")}
                    aria-pressed={selected}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className={darkMode ? "block text-xs text-white/60" : "block text-xs text-slate-500"}>{option.helper}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((option) => {
                const selected = serviceState[option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleService(option.key)}
                    className={[
                      "rounded-full border px-3 py-2 text-xs font-semibold transition",
                      "focus:outline-none focus:ring-2 focus:ring-cyan-400/60",
                      selected
                        ? darkMode
                          ? "border-emerald-300/80 bg-emerald-500/20 text-emerald-100"
                          : "border-emerald-400 bg-emerald-100 text-emerald-900"
                        : darkMode
                          ? "border-white/15 bg-black/30 text-white/75 hover:border-white/30 hover:bg-white/10"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
                    ].join(" ")}
                    aria-pressed={selected}
                  >
                    {selected ? "On" : "Off"} · {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                isSubmitted
                  ? "bg-gray-600 text-white cursor-not-allowed"
                  : darkMode
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:brightness-110"
                    : "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:brightness-110",
                submitting ? "opacity-60" : "",
              ].join(" ")}
              onClick={handleSubmit}
              disabled={submitting || isSubmitted}
            >
              {submitting ? "Submitting..." : isSubmitted ? "Reported! ✅" : "Submit Report"}
            </button>

            <button
              type="button"
              className={[
                "inline-flex items-center justify-center gap-2 rounded-lg border bg-transparent px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                darkMode
                  ? "border-green-400/70 text-green-300 hover:bg-green-400/10"
                  : "border-emerald-500 text-emerald-700 hover:bg-emerald-100",
              ].join(" ")}
              onClick={openDirections}
              disabled={latitude == null || longitude == null}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 21s6-5.686 6-11a6 6 0 1 0-12 0c0 5.314 6 11 6 11Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span>Get Directions</span>
            </button>
          </div>

          {latitude == null || longitude == null ? (
            <p className={darkMode ? "mt-2 text-xs text-white/55" : "mt-2 text-xs text-slate-500"}>Directions are unavailable for this ATM because map coordinates are missing.</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
