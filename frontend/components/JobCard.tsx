"use client";

import { ExternalLink, CheckCircle, X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Job } from "@/lib/api";

interface Props {
  job: Job;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick: (job: Job) => void;
}

export default function JobCard({ job, onApply, onDismiss, onClick }: Props) {
  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer">
      <div onClick={() => onClick(job)} className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate leading-snug">
              {job.title}
            </h3>
            <p className="text-sm text-gray-400">
              {job.company}{" "}
              <span className="text-gray-600">·</span>{" "}
              {job.location}
            </p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {job.job_description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {job.job_description.slice(0, 200)}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-600">
          {job.date_discovered && (
            <span>
              {new Date(job.date_discovered).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {job.status === "Matched" && (
        <div className="mt-3 flex gap-2 border-t border-gray-800 pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApply(job.id);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark Applied
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(job.id);
            }}
            className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
