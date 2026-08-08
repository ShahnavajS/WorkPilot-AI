"use client";

import React from "react";

export interface ExecutionStepData {
  id: string;
  route: "EXECUTE_AUTOMATICALLY" | "PREPARE_FOR_HUMAN_REVIEW" | "CANNOT_EXECUTE" | "REQUIRES_CLARIFICATION";
  toolName?: string | null;
  reason: string;
  status: string;
  actionItem?: {
    description: string;
  } | null;
}

interface ExecutionPlanPanelProps {
  steps: ExecutionStepData[];
  onExecute: () => Promise<void>;
  isExecuting: boolean;
  workRequestStatus: string;
}

function getRouteBadge(route: string) {
  switch (route) {
    case "EXECUTE_AUTOMATICALLY":
      return { label: "AUTO EXECUTE", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "PREPARE_FOR_HUMAN_REVIEW":
      return { label: "HUMAN REVIEW", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "CANNOT_EXECUTE":
      return { label: "CANNOT EXECUTE", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    case "REQUIRES_CLARIFICATION":
    default:
      return { label: "NEEDS CLARIFICATION", bg: "bg-sky-500/10 text-sky-400 border-sky-500/20" };
  }
}

export const ExecutionPlanPanel: React.FC<ExecutionPlanPanelProps> = ({
  steps,
  onExecute,
  isExecuting,
  workRequestStatus,
}) => {
  const canStartExecution =
    workRequestStatus === "PLANNED" ||
    workRequestStatus === "IN_PROGRESS" ||
    workRequestStatus === "WAITING_FOR_APPROVAL";

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Agentic Execution Plan
          </h3>
          <h4 className="text-lg font-bold text-white mt-1">Action Routing & Tool Selection</h4>
        </div>

        {canStartExecution && (
          <button
            id="start-execution-btn"
            onClick={onExecute}
            disabled={isExecuting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-600/20 border border-emerald-500/30 transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isExecuting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Executing Tools...</span>
              </>
            ) : (
              <span>▶ {workRequestStatus === "PLANNED" ? "Start Execution" : "Resume Execution"}</span>
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const badge = getRouteBadge(step.route);
          return (
            <div
              key={step.id || idx}
              className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-indigo-400 font-bold">Step 0{idx + 1}</span>
                  <h5 className="text-sm font-semibold text-slate-200">
                    {step.actionItem?.description ?? "Planned Action"}
                  </h5>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {step.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Selected Tool</span>
                  <span className="font-mono text-slate-300 font-medium">
                    {step.toolName ? step.toolName : "None (No tool)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-[10px] uppercase block">Routing Reason</span>
                  <p className="text-slate-400 leading-normal">{step.reason}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
