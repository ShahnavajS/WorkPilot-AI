"use client";

import React from "react";

interface ClarificationPanelProps {
  missingInfo: string[];
}

export const ClarificationPanel: React.FC<ClarificationPanelProps> = ({ missingInfo }) => {
  if (!missingInfo || missingInfo.length === 0) return null;

  return (
    <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-6 space-y-3 shadow-xl">
      <div className="flex items-center space-x-2 text-sky-400">
        <span className="text-lg">⚠</span>
        <h3 className="text-sm font-bold uppercase tracking-wider">
          More Information Needed — Execution Paused
        </h3>
      </div>
      <p className="text-xs text-sky-200 leading-relaxed">
        The AI interpreter and agentic planner detected missing information required to execute your request safely. No tools were run automatically.
      </p>
      <ul className="space-y-1.5 pt-1">
        {missingInfo.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start space-x-2 text-xs text-sky-300 bg-sky-900/30 p-2.5 rounded-lg border border-sky-800/40 font-mono"
          >
            <span className="text-sky-400 font-bold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
