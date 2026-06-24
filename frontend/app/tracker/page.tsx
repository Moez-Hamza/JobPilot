"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type Job } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import JobDetailModal from "@/components/JobDetailModal";
import { Link, Loader2, ExternalLink, Search } from "lucide-react";

const STATUS_TABS: Array<Job["status"]> = [
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
];

export default function TrackerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Job["status"]>("Applied");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all(
      STATUS_TABS.map((s) => api.getJobs(s, undefined, 100, 0).then((d) => ({ s, n: d.length })))
    ).then((results) => {
      const c: Record<string, number> = {};
      results.forEach(({ s, n }) => { c[s] = n; });
      setCounts(c);
    }).catch(() => {});
  }, [jobs]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJobs(activeTab, search || undefined, 100, 0);
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search]);

  function handleStatusChange(id: string, status: Job["status"]) {
    if (status !== activeTab) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } else {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status } : j))
      );
    }
    setSelectedJob(null);
    Promise.all(
      STATUS_TABS.map((s) => api.getJobs(s, undefined, 100, 0).then((d) => ({ s, n: d.length })))
    ).then((results) => {
      const c: Record<string, number> = {};
      results.forEach(({ s, n }) => { c[s] = n; });
      setCounts(c);
    }).catch(() => {});
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImportLoading(true);
    setImportError("");
    setImportSuccess("");
    try {
      const job = await api.importLinkedInJob(importUrl);
      setJobs((prev) => [job, ...prev]);
      setImportSuccess(`Imported: ${job.title} @ ${job.company}`);
      setImportUrl("");
      setTimeout(() => setImportSuccess(""), 4000);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Failed to import job");
    } finally {
      setImportLoading(false);
    }
  }

  const tabCount = jobs.length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Application Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track every application from Applied to Offer
          </p>
        </div>
        <button
          onClick={() => setShowImport((v) => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Link className="w-4 h-4" />
          Import from LinkedIn
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["Applied", "Interviewing", "Offer", "Rejected"] as Job["status"][]).map((s) => (
          <div key={s} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{counts[s] || 0}</p>
            <StatusBadge status={s} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}{activeTab === tab && tabCount > 0 ? ` (${tabCount})` : ""}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {showImport && (
        <form
          onSubmit={handleImport}
          className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-3"
        >
          <h3 className="font-semibold text-white mb-1">Import from LinkedIn</h3>
          <p className="text-xs text-gray-500">Paste the LinkedIn job URL and we&apos;ll fetch the details automatically.</p>
          <div className="flex gap-2">
            <input
              required
              type="url"
              placeholder="https://www.linkedin.com/jobs/view/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" disabled={importLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              Import
            </button>
            <button type="button" onClick={() => { setShowImport(false); setImportError(""); setImportSuccess(""); }}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
          {importError && <p className="text-sm text-red-400">{importError}</p>}
          {importSuccess && <p className="text-sm text-green-400">{importSuccess}</p>}
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-gray-500">No applications found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{job.title}</span>
                  {job.rejection_reason_category && (
                    <span className="text-xs text-amber-500 shrink-0">
                      [{job.rejection_reason_category}]
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{job.company} · {job.location}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={job.status} />
                {job.date_applied && (
                  <span className="text-xs text-gray-600">
                    {new Date(job.date_applied).toLocaleDateString("en-GB")}
                  </span>
                )}
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-600 hover:text-indigo-400 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
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
