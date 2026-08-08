"use client";

import React from "react";

export type WorkRequestStatus =
  | "SUBMITTED"
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

export function getStatusBadge(status: WorkRequestStatus) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "COMPLETED",
        bg: "bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/30",
        dot: "bg-[#0ecb81]",
      };
    case "WAITING_FOR_APPROVAL":
      return {
        label: "HITL APPROVAL REQUIRED",
        bg: "bg-[#fcd535]/15 text-[#fcd535] border-[#fcd535]/40",
        dot: "bg-[#fcd535] animate-pulse",
      };
    case "IN_PROGRESS":
      return {
        label: "EXECUTING TOOLS",
        bg: "bg-[#fcd535]/10 text-[#fcd535] border-[#fcd535]/30",
        dot: "bg-[#fcd535] animate-spin",
      };
    case "PLANNED":
      return {
        label: "PLAN READY",
        bg: "bg-[#fcd535]/10 text-[#fcd535] border-[#fcd535]/20",
        dot: "bg-[#fcd535]",
      };
    case "INTERPRETED":
      return {
        label: "INTERPRETED",
        bg: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30",
        dot: "bg-[#3b82f6]",
      };
    case "NEEDS_CLARIFICATION":
      return {
        label: "NEEDS CLARIFICATION",
        bg: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/40",
        dot: "bg-[#3b82f6]",
      };
    case "FAILED":
      return {
        label: "FAILED",
        bg: "bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/30",
        dot: "bg-[#f6465d]",
      };
    case "SUBMITTED":
    default:
      return {
        label: "SUBMITTED",
        bg: "bg-[#2b3139] text-[#eaecef] border-[#2b3139]",
        dot: "bg-[#707a8a]",
      };
  }
}

const STAGES: { id: WorkRequestStatus; name: string; stepNumber: string }[] = [
  { id: "SUBMITTED", name: "Intake", stepNumber: "01" },
  { id: "INTERPRETED", name: "Interpretation", stepNumber: "02" },
  { id: "PLANNED", name: "Planning", stepNumber: "03" },
  { id: "IN_PROGRESS", name: "Execution", stepNumber: "04" },
  { id: "WAITING_FOR_APPROVAL", name: "Human Review", stepNumber: "05" },
  { id: "COMPLETED", name: "Completion", stepNumber: "06" },
];

function getStageIndex(status: WorkRequestStatus): number {
  switch (status) {
    case "SUBMITTED":
      return 0;
    case "INTERPRETED":
      return 1;
    case "PLANNED":
      return 2;
    case "IN_PROGRESS":
      return 3;
    case "WAITING_FOR_APPROVAL":
      return 4;
    case "COMPLETED":
      return 5;
    case "NEEDS_CLARIFICATION":
      return 1;
    case "FAILED":
      return 3;
    default:
      return 0;
  }
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ status }) => {
  const badge = getStatusBadge(status);
  const currentIdx = getStageIndex(status);

  return (
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 space-y-6 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2b3139] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707a8a]">
              Lifecycle Governance State
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5 tracking-tight">
            Workflow Execution Pipeline
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-md text-xs font-mono font-bold border ${badge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span>{badge.label}</span>
          </span>
        </div>
      </div>

      {/* Visual Step Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          let cardStyle = "bg-[#0b0e11] border-[#2b3139] text-[#707a8a]";
          let numStyle = "text-[#707a8a]";

          if (isDone) {
            cardStyle = "bg-[#0ecb81]/10 border-[#0ecb81]/30 text-[#0ecb81]";
            numStyle = "text-[#0ecb81]";
          } else if (isCurrent) {
            cardStyle = "bg-[#fcd535] border-[#fcd535] text-[#181a20] font-bold shadow-lg shadow-[#fcd535]/10";
            numStyle = "text-[#181a20]";
          }

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${cardStyle}`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className={numStyle}>STEP {stage.stepNumber}</span>
                {isDone && <span className="text-xs">✓</span>}
              </div>
              <span className="text-xs font-semibold truncate">{stage.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
