"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api, type Job, type UserPreferences } from "@/lib/api";
import JobCard from "@/components/JobCard";
import JobDetailModal from "@/components/JobDetailModal";
import { Search, Loader2, ChevronLeft, ChevronRight, BarChart3, Zap } from "lucide-react";
import { clsx } from "clsx";

const PAGE_SIZE = 12;

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [notification, setNotification] = useState("");
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [scraping, setScraping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollScraperStatus = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getScraperStatus();
        setScraping(status.running);
        if (!status.running && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          // Refresh data after scraper finishes
          void fetchJobs(0);
          api.getJobStats().then(setStats).catch(() => {});
        }
      } catch {
        // ignore
      }
    }, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.getPreferences().then(setPrefs).catch(() => {});
    api.getJobStats().then(setStats).catch(() => {});
    // Check if scraper is already running
    api.getScraperStatus().then((s) => {
      if (s.running) {
        setScraping(true);
        pollScraperStatus();
      }
    }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollScraperStatus]);

  async function fetchJobs(p: number) {
    setLoading(true);
    try {
      const data = await api.getJobs("Matched", search || undefined, PAGE_SIZE, p * PAGE_SIZE, 7);
      setJobs(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(0);
    void fetchJobs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    void fetchJobs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleApply(id: string) {
    await api.updateJobStatus(id, "Applied");
    setJobs((prev) => prev.filter((j) => j.id !== id));
    api.getJobStats().then(setStats).catch(() => {});
    void fetchJobs(page);
    showNotification("Marked as Applied");
  }

  async function handleDismiss(id: string) {
    await api.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    api.getJobStats().then(setStats).catch(() => {});
    void fetchJobs(page);
  }

  async function handleScrape() {
    setScraping(true);
    try {
      await api.triggerScrape();
      pollScraperStatus();
    } catch {
      setScraping(false);
    }
  }

  function handleStatusChange(id: string, status: Job["status"]) {
    setJobs((prev) =>
      status === "Matched"
        ? prev.map((j) => (j.id === id ? { ...j, status } : j))
        : prev.filter((j) => j.id !== id)
    );
    setSelectedJob(null);
  }

  function showNotification(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  }

  const subtitle = prefs
    ? [...prefs.target_locations, ...prefs.target_titles].join(" | ")
    : "Jobs discovered based on your preferences";

  return (
    <div className={clsx('p-6', 'max-w-5xl', 'mx-auto')}>
      <div className="mb-6">
        <h1 className={clsx('text-2xl', 'font-bold', 'text-white')}>Matched Jobs</h1>
        <p className={clsx('text-gray-400', 'text-sm', 'mt-1')}>{subtitle}</p>
      </div>

      <div className="mb-6">
        <div className={clsx('bg-gray-900', 'border', 'border-gray-800', 'rounded-xl', 'p-4', 'inline-flex', 'items-center', 'gap-3')}>
          <BarChart3 className={clsx('w-4', 'h-4', 'text-indigo-400')} />
          <span className={clsx('text-xs', 'text-gray-500', 'uppercase', 'tracking-wider')}>Matched Jobs (7 days)</span>
          <p className={clsx('text-2xl', 'font-bold', 'text-white')}>{stats.matched_last_7_days || 0}</p>
        </div>
      </div>

      <div className={clsx('flex', 'items-center', 'gap-3', 'mb-6')}>
        <div className={clsx('relative', 'flex-1', 'max-w-sm')}>
          <Search className={clsx('absolute', 'left-3', 'top-1/2', '-translate-y-1/2', 'w-4', 'h-4', 'text-gray-500')} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={clsx('w-full', 'bg-gray-900', 'border', 'border-gray-700', 'rounded-lg', 'pl-9', 'pr-4', 'py-2', 'text-sm', 'text-gray-100', 'placeholder-gray-500', 'focus:outline-none', 'focus:border-indigo-500')}
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping}
          className={clsx('flex', 'items-center', 'gap-2', 'bg-indigo-600', 'hover:bg-indigo-500', 'disabled:opacity-60', 'text-white', 'text-sm', 'font-medium', 'px-4', 'py-2', 'rounded-lg', 'transition-colors')}
        >
          {scraping ? <Loader2 className={clsx('w-4', 'h-4', 'animate-spin')} /> : <Zap className={clsx('w-4', 'h-4')} />}
          Discover Jobs
        </button>
      </div>

      {scraping && (
        <div className={clsx('mb-4', 'flex', 'items-center', 'gap-2', 'bg-indigo-900/30', 'border', 'border-indigo-700/40', 'text-indigo-400', 'text-sm', 'rounded-lg', 'px-4', 'py-2.5')}>
          <Loader2 className={clsx('w-4', 'h-4', 'animate-spin')} />
          Scraping new jobs based on your preferences... Data will refresh automatically.
        </div>
      )}

      {notification && (
        <div className={clsx('mb-4', 'bg-green-900/30', 'border', 'border-green-700/40', 'text-green-400', 'text-sm', 'rounded-lg', 'px-4', 'py-2.5')}>
          {notification}
        </div>
      )}

      {loading ? (
        <div className={clsx('flex', 'items-center', 'justify-center', 'h-48', 'text-gray-600')}>
          <Loader2 className={clsx('w-6', 'h-6', 'animate-spin', 'mr-2')} />
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className={clsx('text-center', 'py-20', 'text-gray-600')}>
          <p className={clsx('text-lg', 'font-medium', 'text-gray-500')}>No matched jobs in the last 7 days</p>
          <p className={clsx('text-sm', 'mt-1')}>
            New jobs will appear here when the daily scraper runs, or add one manually via the Tracker.
          </p>
        </div>
      ) : (
        <>
          <div className={clsx('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-4')}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={handleApply}
                onDismiss={handleDismiss}
                onClick={setSelectedJob}
              />
            ))}
          </div>
          <div className={clsx('flex', 'items-center', 'justify-between', 'mt-6')}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={clsx('flex', 'items-center', 'gap-1.5', 'px-4', 'py-2', 'bg-gray-800', 'hover:bg-gray-700', 'disabled:opacity-30', 'disabled:cursor-not-allowed', 'text-gray-300', 'text-sm', 'rounded-lg', 'transition-colors')}
            >
              <ChevronLeft className={clsx('w-4', 'h-4')} /> Previous
            </button>
            <span className={clsx('text-sm', 'text-gray-500')}>Page {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className={clsx('flex', 'items-center', 'gap-1.5', 'px-4', 'py-2', 'bg-gray-800', 'hover:bg-gray-700', 'disabled:opacity-30', 'disabled:cursor-not-allowed', 'text-gray-300', 'text-sm', 'rounded-lg', 'transition-colors')}
            >
              Next <ChevronRight className={clsx('w-4', 'h-4')} />
            </button>
          </div>
        </>
      )}

      <JobDetailModal
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
