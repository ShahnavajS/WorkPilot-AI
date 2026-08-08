"use client";

import React from "react";

export interface ActionItemData {
  id: string;
  description: string;
  actionType?: string | null;
  priority?: string | null;
  dueAt?: string | null;
  status: string;
}

export interface InterpretationData {
  title: string;
  summary: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  detectedDeadline?: string | null;
  missingInformation?: string[] | null;
  automatableActions?: string[] | null;
  humanConfirmationReqs?: string[] | null;
}

interface InterpretationPanelProps {
  interpretation: InterpretationData;
  actionItems: ActionItemData[];
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "HIGH":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "MEDIUM":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "LOW":
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

export const InterpretationPanel: React.FC<InterpretationPanelProps> = ({
  interpretation,
  actionItems,
}) => {
  const priorityBadgeClass = getPriorityBadge(interpretation.priority);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              AI Structured Interpretation
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${priorityBadgeClass}`}>
              {interpretation.priority} Priority
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">{interpretation.title}</h3>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-right">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Detected Deadline
          </span>
          <span className="text-xs font-mono font-medium text-slate-200">
            {interpretation.detectedDeadline
              ? new Date(interpretation.detectedDeadline).toLocaleString()
              : "No deadline detected"}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</h4>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          {interpretation.summary}
        </p>
      </div>

      {/* Extracted Action Items */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Extracted Action Items ({actionItems.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actionItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                    {item.actionType ?? "ACTION"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200">{item.description}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="text-[10px]">
                  {item.dueAt ? `Due: ${new Date(item.dueAt).toLocaleDateString()}` : "No due date"}
                </span>
                <div className="flex items-center space-x-1">
                  {interpretation.automatableActions?.includes(item.id) && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Auto Candidate
                    </span>
                  )}
                  {interpretation.humanConfirmationReqs?.includes(item.id) && (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      HITL Review
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
