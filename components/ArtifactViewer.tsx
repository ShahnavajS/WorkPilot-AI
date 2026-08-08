"use client";

import React, { useState } from "react";

export interface ArtifactData {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  metadata?: any;
}

interface ArtifactViewerProps {
  artifacts: ArtifactData[];
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifacts }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!artifacts || artifacts.length === 0) return null;

  const current = artifacts[selectedIndex] || artifacts[0];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Generated Work Artifacts ({artifacts.length})
          </h3>
          <h4 className="text-sm font-bold text-white mt-0.5">{current.title}</h4>
        </div>

        {/* Artifact selector tabs */}
        {artifacts.length > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {artifacts.map((art, idx) => (
              <button
                key={art.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`px-3 py-1 text-xs font-mono rounded-lg border transition-colors ${
                  idx === selectedIndex
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {art.type} #{idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Render Current Artifact */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
        {current.content}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Type: {current.type}</span>
        <span>Generated: {new Date(current.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
