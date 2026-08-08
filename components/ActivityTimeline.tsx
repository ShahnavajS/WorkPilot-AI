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
    return "bg-[#0ecb81]/15 text-[#0ecb81] border-[#0ecb81]/30";
  }
  if (type.includes("FAILED") || type.includes("REJECTED")) {
    return "bg-[#f6465d]/15 text-[#f6465d] border-[#f6465d]/30";
  }
  if (type.includes("REQUESTED") || type.includes("PAUSED")) {
    return "bg-[#fcd535]/15 text-[#fcd535] border-[#fcd535]/30";
  }
  if (type.includes("STARTED")) {
    return "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30";
  }
  return "bg-[#2b3139] text-[#eaecef] border-[#2b3139]";
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 space-y-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#2b3139] pb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#707a8a]">
          Activity Trace &amp; Audit Log ({events.length})
        </h3>
        <span className="text-[10px] font-mono text-[#707a8a]">Persisted System Audit Trail</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#2b3139]">
        {events.map((ev, idx) => {
          const badgeClass = getEventBadgeClass(ev.type);
          return (
            <div key={ev.id || idx} className="relative flex items-start space-x-3 text-xs">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#2b3139] border-2 border-[#0b0e11]" />
              <div className="flex-1 bg-[#0b0e11] border border-[#2b3139] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeClass}`}>
                    {ev.type}
                  </span>
                  <span className="text-[10px] font-mono text-[#707a8a]">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[#eaecef] leading-normal">{ev.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
