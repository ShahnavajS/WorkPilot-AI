"use client";

import React from "react";

export interface ActivityEventData {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  events: ActivityEventData[];
}

function getEventBadgeClass(type: string) {
  if (type.includes("COMPLETED") || type.includes("APPROVED") || type.includes("SUCCEEDED")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
  if (type.includes("FAILED") || type.includes("REJECTED")) {
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }
  if (type.includes("REQUESTED") || type.includes("PAUSED")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  if (type.includes("STARTED")) {
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  }
  return "bg-slate-800 text-slate-300 border-slate-700";
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Activity Trace & Audit Log ({events.length})
        </h3>
        <span className="text-[10px] font-mono text-slate-500">Persisted System Audit Trail</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {events.map((ev, idx) => {
          const badgeClass = getEventBadgeClass(ev.type);
          return (
            <div key={ev.id || idx} className="relative flex items-start space-x-3 text-xs">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900" />
              <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeClass}`}>
                    {ev.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300 leading-normal">{ev.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
