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
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 space-y-4 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2b3139] pb-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#707a8a]">
            Generated Work Artifacts ({artifacts.length})
          </span>
          <h4 className="text-sm font-bold text-white tracking-tight mt-0.5">{current.title}</h4>
        </div>

        {/* Artifact selector tabs */}
        {artifacts.length > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {artifacts.map((art, idx) => (
              <button
                key={art.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`px-3 py-1 text-xs font-mono font-semibold rounded-md border transition-colors ${
                  idx === selectedIndex
                    ? "bg-[#fcd535] text-[#181a20] border-[#fcd535]"
                    : "bg-[#0b0e11] text-[#707a8a] border-[#2b3139] hover:text-[#eaecef]"
                }`}
              >
                {art.type} #{idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Render Current Artifact */}
      <div className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-4 font-mono text-xs text-[#eaecef] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
        {current.content}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#707a8a] font-mono">
        <span>Type: {current.type}</span>
        <span>Generated: {new Date(current.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
