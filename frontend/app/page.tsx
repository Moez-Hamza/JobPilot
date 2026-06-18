"use client";

import { useEffect, useState } from "react";
import { api, type Job } from "@/lib/api";
import JobCard from "@/components/JobCard";
import JobDetailModal from "@/components/JobDetailModal";
import { Search, RefreshCw, Loader2, Zap } from "lucide-react";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scraping, setScraping] = useState(false);
  const [notification, setNotification] = useState("");

  async function fetchJobs() {
    setLoading(true);
    try {
      const data = await api.getJobs("Matched", search || undefined);
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleApply(id: string) {
    await api.updateJobStatus(id, "Applied");
    setJobs((prev) => prev.filter((j) => j.id !== id));
    showNotification("Marked as Applied ✓");
  }

  async function handleDismiss(id: string) {
    await api.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function handleScrape() {
    setScraping(true);
    try {
      await api.triggerScrape();
      showNotification("Scrape started — new jobs will appear shortly");
      setTimeout(() => { void fetchJobs(); }, 5000);
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Matched Jobs</h1>
        <p className="text-gray-400 text-sm mt-1">
          Jobs discovered based on your preferences · Tunis &amp; Paris · Full Stack Developer
        </p>
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
          onClick={fetchJobs}
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
          {scraping ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
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
