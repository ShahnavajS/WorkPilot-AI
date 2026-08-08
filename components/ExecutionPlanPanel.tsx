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
      return { label: "AUTO EXECUTE", bg: "bg-[#0ecb81]/15 text-[#0ecb81] border-[#0ecb81]/30" };
    case "PREPARE_FOR_HUMAN_REVIEW":
      return { label: "HUMAN REVIEW", bg: "bg-[#fcd535]/15 text-[#fcd535] border-[#fcd535]/40" };
    case "CANNOT_EXECUTE":
      return { label: "CANNOT EXECUTE", bg: "bg-[#f6465d]/15 text-[#f6465d] border-[#f6465d]/30" };
    case "REQUIRES_CLARIFICATION":
    default:
      return { label: "NEEDS CLARIFICATION", bg: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30" };
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
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 space-y-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b3139] pb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707a8a]">
            Agentic Execution Plan
          </span>
          <h4 className="text-lg font-bold text-white tracking-tight mt-0.5">Action Routing &amp; Tool Selection</h4>
        </div>

        {canStartExecution && (
          <button
            id="start-execution-btn"
            onClick={onExecute}
            disabled={isExecuting}
            className="px-5 py-2.5 bg-[#fcd535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-bold uppercase tracking-wider rounded-md shadow-lg shadow-[#fcd535]/10 border border-[#fcd535] transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isExecuting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-[#181a20]" viewBox="0 0 24 24" fill="none">
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
              className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-[#fcd535] font-bold">Step 0{idx + 1}</span>
                  <h5 className="text-sm font-semibold text-[#eaecef]">
                    {step.actionItem?.description ?? "Planned Action"}
                  </h5>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#707a8a] bg-[#2b3139] px-2 py-0.5 rounded">
                    {step.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#2b3139]">
                <div>
                  <span className="text-[#707a8a] font-mono text-[10px] uppercase block">Selected Tool</span>
                  <span className="font-mono text-[#eaecef] font-semibold">
                    {step.toolName ? step.toolName : "None (No tool)"}
                  </span>
                </div>
                <div>
                  <span className="text-[#707a8a] font-mono text-[10px] uppercase block">Routing Reason</span>
                  <p className="text-[#929aa5] leading-normal">{step.reason}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
