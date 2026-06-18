"use client";

import { useEffect, useState } from "react";
import { api, type Job, type UserPreferences } from "@/lib/api";
import JobCard from "@/components/JobCard";
import JobDetailModal from "@/components/JobDetailModal";
import { Search, RefreshCw, Loader2, Zap, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scraping, setScraping] = useState(false);
  const [notification, setNotification] = useState("");
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    api.getPreferences().then(setPrefs).catch(() => {});
  }, []);

  async function fetchJobs(p: number) {
    setLoading(true);
    try {
      const data = await api.getJobs("Matched", search || undefined, PAGE_SIZE, p * PAGE_SIZE);
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
    showNotification("Marked as Applied");
  }

  async function handleDismiss(id: string) {
    await api.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function handleScrape() {
    setScraping(true);
    try {
      await api.triggerScrape();
      showNotification("Scrape started - new jobs will appear shortly");
      setTimeout(() => { void fetchJobs(page); }, 5000);
    } catch (e) {
      console.error(e);
    } finally {
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Matched Jobs</h1>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => { setPage(0); void fetchJobs(0); }}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Discover Jobs
        </button>
      </div>

      {notification && (
        <div className="mb-4 bg-green-900/30 border border-green-700/40 text-green-400 text-sm rounded-lg px-4 py-2.5">
          {notification}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-lg font-medium text-gray-500">No matched jobs yet</p>
          <p className="text-sm mt-1">
            Click &quot;Discover Jobs&quot; to run the scraper, or add one manually via the Tracker.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 text-sm rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-500">Page {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 text-sm rounded-lg transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
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
