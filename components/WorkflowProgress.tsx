"use client";

import React from "react";

export type WorkRequestStatus =
  | "RECEIVED"
  | "INTERPRETED"
  | "PLANNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_APPROVAL"
  | "NEEDS_CLARIFICATION"
  | "COMPLETED"
  | "FAILED";

interface WorkflowProgressProps {
  status: WorkRequestStatus;
}

const STAGES = [
  { key: "RECEIVED", label: "Intake", desc: "Request Received" },
  { key: "INTERPRETED", label: "Interpretation", desc: "Structured Extract" },
  { key: "PLANNED", label: "Planning", desc: "Route & Decision" },
  { key: "IN_PROGRESS", label: "Execution", desc: "Tool Operations" },
  { key: "WAITING_FOR_APPROVAL", label: "Approval", desc: "Human Review Gate" },
  { key: "COMPLETED", label: "Completion", desc: "Work Verified" },
];

export function getStatusBadge(status: WorkRequestStatus) {
  switch (status) {
    case "RECEIVED":
      return { label: "Received", bg: "bg-slate-800 text-slate-300 border-slate-700" };
    case "INTERPRETED":
      return { label: "Interpreted", bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" };
    case "PLANNED":
      return { label: "Planned", bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
    case "IN_PROGRESS":
      return { label: "In Progress", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "WAITING_FOR_APPROVAL":
      return { label: "Waiting for Approval", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "NEEDS_CLARIFICATION":
      return { label: "Needs Clarification", bg: "bg-sky-500/10 text-sky-400 border-sky-500/20" };
    case "COMPLETED":
      return { label: "Completed", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "FAILED":
      return { label: "Failed", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    default:
      return { label: status, bg: "bg-slate-800 text-slate-300 border-slate-700" };
  }
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ status }) => {
  const badge = getStatusBadge(status);

  const getStepState = (stageKey: string) => {
    if (status === "FAILED") {
      return stageKey === "IN_PROGRESS" ? "failed" : "upcoming";
    }
    if (status === "NEEDS_CLARIFICATION") {
      return stageKey === "Planning" ? "warning" : "upcoming";
    }

    const order = ["RECEIVED", "INTERPRETED", "PLANNED", "IN_PROGRESS", "WAITING_FOR_APPROVAL", "COMPLETED"];
    const currentIndex = order.indexOf(status);
    const stageIndex = order.indexOf(stageKey);

    if (stageIndex < currentIndex) return "completed";
    if (stageIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workflow Lifecycle
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STAGES.map((item, idx) => {
          const stepState = getStepState(item.key);
          let borderClass = "border-slate-800 bg-slate-950/60 text-slate-500";
          let icon = `0${idx + 1}`;

          if (stepState === "completed") {
            borderClass = "border-emerald-500/30 bg-emerald-950/20 text-emerald-400";
            icon = "✓";
          } else if (stepState === "current") {
            borderClass = "border-indigo-500/40 bg-indigo-950/30 text-indigo-300 ring-1 ring-indigo-500/20";
            icon = "●";
          } else if (stepState === "failed") {
            borderClass = "border-rose-500/40 bg-rose-950/30 text-rose-400";
            icon = "✕";
          }

          return (
            <div
              key={idx}
              className={`border rounded-lg p-3 flex flex-col justify-between transition-all ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{item.label}</span>
                <span className="text-[10px] font-mono font-bold">{icon}</span>
              </div>
              <span className="text-[11px] text-slate-400 line-clamp-1">{item.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
