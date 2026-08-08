"use client";

import React from "react";

interface ClarificationPanelProps {
  missingInfo: string[];
}

export const ClarificationPanel: React.FC<ClarificationPanelProps> = ({ missingInfo }) => {
  if (!missingInfo || missingInfo.length === 0) return null;

  return (
    <div className="bg-[#1e2329] border-2 border-[#3b82f6]/40 rounded-xl p-6 space-y-4 shadow-2xl">
      <div className="flex items-center space-x-2 text-[#3b82f6]">
        <span className="text-xl">⚠</span>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider">
            More Information Needed — Unsafe Automation Blocked
          </h3>
          <p className="text-xs text-[#929aa5] mt-0.5">
            The AI interpreter and agentic planner identified missing essential facts. Execution is safely paused in <code className="text-[#3b82f6] font-mono">NEEDS_CLARIFICATION</code> mode without calling tools.
          </p>
        </div>
      </div>

      <ul className="space-y-2 pt-1">
        {missingInfo.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start space-x-2 text-xs text-[#eaecef] bg-[#0b0e11] p-3 rounded-lg border border-[#3b82f6]/20 font-mono"
          >
            <span className="text-[#3b82f6] font-bold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
