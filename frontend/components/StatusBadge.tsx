import { clsx } from "clsx";
import type { Job } from "@/lib/api";

const STATUS_STYLES: Record<Job["status"], string> = {
  Matched: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
  Applied: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  Interviewing: "bg-purple-500/15 text-purple-400 ring-purple-500/30",
  Rejected: "bg-red-500/15 text-red-400 ring-red-500/30",
  Offer: "bg-green-500/15 text-green-400 ring-green-500/30",
};

export default function StatusBadge({ status }: { status: Job["status"] }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
