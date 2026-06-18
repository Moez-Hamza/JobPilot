"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Job } from "@/lib/api";
import { api } from "@/lib/api";

interface Props {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: Job["status"]) => void;
}

export default function JobDetailModal({
  job,
  open,
  onClose,
  onStatusChange,
}: Props) {
  const [rejectionEmail, setRejectionEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    category: string;
    summary_of_weakness: string;
  } | null>(null);
  const [error, setError] = useState("");

  const canAnalyze =
    job?.status === "Applied" || job?.status === "Interviewing";

  async function handleAnalyze() {
    if (!job || !rejectionEmail.trim()) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const result = await api.analyzeRejection(job.id, rejectionEmail);
      setAnalysis(result);
      onStatusChange(job.id, "Rejected");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: Job["status"]) {
    if (!job) return;
    try {
      await api.updateJobStatus(job.id, status);
      onStatusChange(job.id, status);
    } catch {
      setError("Failed to update status");
    }
  }

  if (!job) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <Dialog.Title className="text-xl font-bold text-white">
                {job.title}
              </Dialog.Title>
              <p className="text-sm text-gray-400 mt-0.5">
                {job.company} · {job.location}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={job.status} />
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-5">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <ExternalLink className="w-4 h-4" />
              View Job Posting
            </a>
            {job.date_applied && (
              <span className="text-xs text-gray-600 ml-auto">
                Applied:{" "}
                {new Date(job.date_applied).toLocaleDateString("en-GB")}
              </span>
            )}
          </div>

          {job.status === "Applied" && (
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => handleStatusChange("Interviewing")}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Move to Interviewing
              </button>
            </div>
          )}

          {job.job_description && (
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Job Description
              </h4>
              <div className="bg-gray-950 rounded-lg p-3 text-sm text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {job.job_description}
              </div>
            </div>
          )}

          {job.ai_feedback_notes && (
            <div className="mb-5 bg-red-950/30 border border-red-800/40 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                AI Rejection Analysis
              </h4>
              <p className="text-xs text-red-300/80 mb-1">
                Category: <strong>{job.rejection_reason_category}</strong>
              </p>
              <p className="text-sm text-gray-300">{job.ai_feedback_notes}</p>
            </div>
          )}

          {canAnalyze && !job.ai_feedback_notes && (
            <div className="border-t border-gray-800 pt-5">
              <h4 className="text-sm font-semibold text-white mb-2">
                Analyze Rejection Email
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Paste the rejection email to get AI feedback on resume gaps.
              </p>
              <textarea
                value={rejectionEmail}
                onChange={(e) => setRejectionEmail(e.target.value)}
                placeholder="Paste rejection email content here..."
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none min-h-32"
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {analysis && (
                <div className="mt-3 bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-white">
                      Analysis Complete
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">
                    Category:{" "}
                    <strong className="text-amber-400">
                      {analysis.category}
                    </strong>
                  </p>
                  <p className="text-sm text-gray-300">
                    {analysis.summary_of_weakness}
                  </p>
                </div>
              )}
              <button
                onClick={handleAnalyze}
                disabled={loading || !rejectionEmail.trim()}
                className="mt-3 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Analyze with AI
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
