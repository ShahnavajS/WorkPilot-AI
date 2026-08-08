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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Work History ({requests.length})
        </h3>
        <button
          id="new-work-btn"
          onClick={onNewWork}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow border border-indigo-500/30 transition-colors flex items-center space-x-1"
        >
          <span>+ New Work</span>
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {requests.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-2">No previous work requests found.</p>
        ) : (
          requests.map((req) => {
            const badge = getStatusBadge(req.status);
            const isSelected = req.id === activeId;
            return (
              <button
                key={req.id}
                onClick={() => onSelect(req.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all space-y-1 ${
                  isSelected
                    ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                    : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
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
