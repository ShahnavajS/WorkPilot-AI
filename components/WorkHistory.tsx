"use client";

import React from "react";
import { getStatusBadge } from "./WorkflowProgress";

export interface WorkRequestSummary {
  id: string;
  originalText: string;
  status: any;
  createdAt: string;
}

interface WorkHistoryProps {
  requests: WorkRequestSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewWork: () => void;
}

export const WorkHistory: React.FC<WorkHistoryProps> = ({
  requests,
  activeId,
  onSelect,
  onNewWork,
}) => {
  return (
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-5 space-y-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#707a8a]">
          Work History ({requests.length})
        </h3>
        <button
          id="new-work-btn"
          onClick={onNewWork}
          className="px-3 py-1.5 bg-[#fcd535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-bold rounded-md shadow border border-[#fcd535] transition-colors flex items-center space-x-1"
        >
          <span>+ New Work</span>
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {requests.length === 0 ? (
          <p className="text-xs text-[#707a8a] italic p-2">No previous work requests found.</p>
        ) : (
          requests.map((req) => {
            const badge = getStatusBadge(req.status);
            const isSelected = req.id === activeId;
            return (
              <button
                key={req.id}
                onClick={() => onSelect(req.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all space-y-1.5 ${
                  isSelected
                    ? "bg-[#2b3139] border-[#fcd535]/60 text-white font-semibold shadow-md"
                    : "bg-[#0b0e11] border-[#2b3139] hover:border-[#707a8a] text-[#eaecef]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#707a8a]">
                    {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs font-medium truncate">{req.originalText}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
