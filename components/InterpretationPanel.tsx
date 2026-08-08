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
      return "bg-[#f6465d]/15 text-[#f6465d] border-[#f6465d]/30";
    case "HIGH":
      return "bg-[#fcd535]/15 text-[#fcd535] border-[#fcd535]/40";
    case "MEDIUM":
      return "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30";
    case "LOW":
    default:
      return "bg-[#0ecb81]/15 text-[#0ecb81] border-[#0ecb81]/30";
  }
}

export const InterpretationPanel: React.FC<InterpretationPanelProps> = ({
  interpretation,
  actionItems,
}) => {
  const priorityBadgeClass = getPriorityBadge(interpretation.priority);

  return (
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 space-y-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2b3139] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707a8a]">
              AI Structured Interpretation
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${priorityBadgeClass}`}>
              {interpretation.priority} Priority
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1 tracking-tight">{interpretation.title}</h3>
        </div>

        <div className="bg-[#0b0e11] border border-[#2b3139] rounded-lg px-3.5 py-2 text-right">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#707a8a] block">
            Detected Deadline
          </span>
          <span className="text-xs font-mono font-semibold text-[#eaecef]">
            {interpretation.detectedDeadline
              ? new Date(interpretation.detectedDeadline).toLocaleString()
              : "No deadline detected"}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-[#929aa5] uppercase tracking-wider">Summary</h4>
        <p className="text-xs text-[#eaecef] leading-relaxed bg-[#0b0e11] p-4 rounded-lg border border-[#2b3139]">
          {interpretation.summary}
        </p>
      </div>

      {/* Extracted Action Items */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#929aa5] uppercase tracking-wider">
          Extracted Action Items ({actionItems.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actionItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#fcd535] uppercase tracking-wider">
                    {item.actionType ?? "ACTION"}
                  </span>
                  <span className="text-[10px] font-mono text-[#707a8a] bg-[#2b3139] px-2 py-0.5 rounded">
                    {item.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#eaecef] leading-normal">{item.description}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#707a8a] pt-2 border-t border-[#2b3139]">
                <span className="text-[10px] font-mono">
                  {item.dueAt ? `Due: ${new Date(item.dueAt).toLocaleDateString()}` : "No due date"}
                </span>
                <div className="flex items-center space-x-1.5">
                  {interpretation.automatableActions?.includes(item.id) && (
                    <span className="text-[10px] font-mono text-[#0ecb81] bg-[#0ecb81]/10 px-2 py-0.5 rounded border border-[#0ecb81]/20">
                      Auto Candidate
                    </span>
                  )}
                  {interpretation.humanConfirmationReqs?.includes(item.id) && (
                    <span className="text-[10px] font-mono text-[#fcd535] bg-[#fcd535]/10 px-2 py-0.5 rounded border border-[#fcd535]/20">
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
