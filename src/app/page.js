"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import ATMCard from "@/components/ATMCard";
import DarkModeToggle from "@/components/DarkModeToggle";
import ReportToast from "@/components/ReportToast";
import SkeletonCard from "@/components/SkeletonCard";
import { ProtectedLayout } from "@/components/ProtectedLayout";

const skeletonItems = Array.from({ length: 4 }, (_, index) => index);

export default function HomePage() {
  return (
    <ProtectedLayout>
      <MainContent />
    </ProtectedLayout>
  );
}

function MainContent() {
  const { data: session } = useSession();
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [atms, setAtms] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [profile, setProfile] = useState(null);

  const userInitials = useMemo(() => {
    const name = session?.user?.name?.trim();

    if (!name) {
      return "U";
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [session?.user?.name]);

  useEffect(() => {
    const saved = window.localStorage.getItem("atm-theme");
    const isDark = saved ? saved === "dark" : true;
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("atm-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  async function loadProfile() {
    try {
      const response = await fetch("/api/user/me");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load your profile.");
      }

      setProfile(data.profile || null);
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadProfileOnce() {
      try {
        const response = await fetch("/api/user/me");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load your profile.");
        }

        if (!ignore) {
          setProfile(data.profile || null);
        }
      } catch {
        if (!ignore) {
          setProfile(null);
        }
      }
    }

    loadProfileOnce();

    return () => {
      ignore = true;
    };
  }, []);

  async function runSearch(event) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(pincode)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/atm/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to search ATMs.");
      }

      setAtms(data.results || []);
    } catch (err) {
      setError(err.message || "Could not fetch ATM data.");
      setAtms([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitReport(report) {
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      setAtms((prev) =>
        prev.map((atm) =>
          atm.ATMId === report.atmId
            ? {
                ...atm,
                CashLevel: report.cashLevel,
                WheelChairAccess: report.wheelChairAccess ? 1 : 0,
                Deposit: report.deposit ? 1 : 0,
                Printers: report.printers ? 1 : 0,
                LastUpdated: new Date().toISOString(),
                MinutesAgo: 0,
                HasReported: 1,
                ReporterName: data.reporterName ?? session?.user?.name ?? atm.ReporterName,
                ReporterBadgeLevel: data.badgeLevel ?? profile?.badgeLevel ?? atm.ReporterBadgeLevel,
              }
            : atm,
        ),
      );

      await loadProfile();

      setToast({ message: data.message });
      setTimeout(() => setToast(null), 3500);
      return data;
    } catch (err) {
      setToast({ message: err.message || "Could not submit report." });
      setTimeout(() => setToast(null), 3500);
      throw err;
    }
  }

  const resultsLabel = useMemo(() => {
    if (loading) return "Fetching ATM statuses...";
    if (!atms.length) return "No ATM results yet.";
    return `${atms.length} ATMs loaded.`;
  }, [loading, atms.length]);

  const profileStats = useMemo(
    () => [
      {
        label: "Reliability Score",
        value: profile?.reliabilityScore ?? "--",
      },
      {
        label: "Badge Level",
        value: profile?.badgeLevel ?? "--",
      },
      {
        label: "Reports Today",
        value: profile?.reportsToday ?? 0,
      },
      {
        label: "Unique ATMs",
        value: profile?.uniqueAtmsReported ?? 0,
      },
    ],
    [profile],
  );

  return (
    <main
      className={[
        "min-h-screen px-4 py-8",
        darkMode
          ? "bg-[radial-gradient(circle_at_top,rgba(27,46,66,0.8),rgba(10,12,16,1)_55%)] text-white"
          : "bg-[radial-gradient(circle_at_top,rgba(209,250,229,0.7),rgba(248,250,252,1)_58%)] text-slate-900",
      ].join(" ")}
    >
      <section className="mx-auto w-full max-w-6xl">
        <header
          className={[
            "mb-8 rounded-2xl p-6 backdrop-blur",
            darkMode ? "border border-white/10 bg-black/30" : "border border-slate-300 bg-white/80",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className={darkMode ? "text-xs uppercase tracking-[0.2em] text-cyan-300" : "text-xs uppercase tracking-[0.2em] text-cyan-700"}>Realtime ATM DBMS</p>
              <h1 className={darkMode ? "mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl" : "mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"}>Crowdsourced ATM Money Checker</h1>
              <p className={darkMode ? "mt-2 max-w-2xl text-sm text-white/70" : "mt-2 max-w-2xl text-sm text-slate-600"}>
                Find nearby ATMs by pincode, review crowd-reported cash levels, and submit reports to boost reliability scores.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className={darkMode ? "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2" : "flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2"}>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
                  {userInitials}
                </div>

                <div className="min-w-0">
                  <p className={darkMode ? "truncate text-sm font-semibold text-white" : "truncate text-sm font-semibold text-slate-900"}>{session?.user?.name || "Signed-in user"}</p>
                  <p className={darkMode ? "truncate text-xs text-white/60" : "truncate text-xs text-slate-500"}>{session?.user?.email || "No email available"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DarkModeToggle darkMode={darkMode} onToggle={() => setDarkMode((prev) => !prev)} />
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className={darkMode
                    ? "rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-400/20"
                    : "rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {profileStats.map((item) => (
              <div key={item.label} className={darkMode ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-3" : "rounded-2xl border border-slate-300 bg-white px-4 py-3"}>
                <p className={darkMode ? "text-[11px] uppercase tracking-[0.18em] text-cyan-200/70" : "text-[11px] uppercase tracking-[0.18em] text-cyan-700/80"}>{item.label}</p>
                <p className={darkMode ? "mt-2 text-xl font-black text-white" : "mt-2 text-xl font-black text-slate-900"}>{item.value}</p>
              </div>
            ))}
          </div>

          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={runSearch}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit pincode"
              className={darkMode
                ? "h-12 flex-1 rounded-xl border border-white/15 bg-black/40 px-4 text-white outline-none ring-cyan-400/70 placeholder:text-white/40 focus:ring"
                : "h-12 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none ring-cyan-400/70 placeholder:text-slate-400 focus:ring"}
            />
            <button
              type="submit"
              disabled={loading}
              className={darkMode
                ? "h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300 px-5 font-bold text-black transition hover:brightness-110 disabled:opacity-60"
                : "h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 font-bold text-white transition hover:brightness-110 disabled:opacity-60"}
            >
              {loading ? "Searching..." : "Check ATMs"}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className={darkMode ? "text-xs text-white/70" : "text-xs text-slate-600"}>{resultsLabel}</p>
            {error ? <p className={darkMode ? "text-xs font-semibold text-red-300" : "text-xs font-semibold text-red-600"}>{error}</p> : null}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? skeletonItems.map((item) => <SkeletonCard key={item} />)
            : atms.map((atm) => <ATMCard key={atm.ATMId} atm={atm} onReportSubmit={submitReport} darkMode={darkMode} />)}
        </section>
      </section>

      <ReportToast toast={toast} />
    </main>
  );
}
