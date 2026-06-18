"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, Loader2, AlertCircle, Copy, Check } from "lucide-react";

interface HistoricalFeedback {
  title?: string;
  company?: string;
  rejection_reason_category?: string;
  ai_feedback_notes?: string;
}

interface OptimizeResult {
  optimized_bullets: string[];
  strategy_notes: string;
  historical_feedback_used: HistoricalFeedback[];
}

export default function OptimizerPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeBullets, setResumeBullets] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleOptimize(e: React.FormEvent) {
    e.preventDefault();
    if (!jobDescription.trim() || !resumeBullets.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.optimizeResume(jobDescription, resumeBullets);
      setResult(data as OptimizeResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const text = result.optimized_bullets.join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          AI Resume Optimizer
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Paste a target job description and your current resume bullets. The AI will rewrite them
          using insights from your past rejection history.
        </p>
      </div>

      <form onSubmit={handleOptimize} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Target Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none min-h-40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Your Current Resume Bullets
          </label>
          <textarea
            value={resumeBullets}
            onChange={(e) => setResumeBullets(e.target.value)}
            placeholder={`Paste your resume bullet points here, one per line:\n• Built REST APIs with FastAPI and PostgreSQL\n• Developed React dashboards with TypeScript\n• Led migration from monolith to microservices`}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none min-h-40"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/30 border border-red-800/40 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !jobDescription.trim() || !resumeBullets.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Optimizing..." : "Optimize Resume"}
        </button>
      </form>

      {result && (
        <div className="mt-8 space-y-5">
          {result.historical_feedback_used.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">
                Historical Rejections Used ({result.historical_feedback_used.length})
              </h3>
              <ul className="space-y-1.5">
                {result.historical_feedback_used.map((r, i) => (
                  <li key={i} className="text-xs text-gray-400">
                    <span className="text-amber-500 font-medium">
                      [{r.rejection_reason_category || "N/A"}]
                    </span>{" "}
                    {r.title} @ {r.company} — {r.ai_feedback_notes}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Optimized Resume Bullets</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
            <ul className="space-y-2">
              {result.optimized_bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                  <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          {result.strategy_notes && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Strategy Notes from AI
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">{result.strategy_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
