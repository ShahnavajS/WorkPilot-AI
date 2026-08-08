"use client";

import React, { useState } from "react";

interface WorkRequestInputProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading: boolean;
}

const PRESET_SCENARIOS = [
  {
    name: "Scenario 1 — Routine Business Work",
    text: "Summarize our partner discussion, extract follow-ups, draft a thank-you email to the partner, and set a 7-day reminder for follow-up.",
  },
  {
    name: "Scenario 2 — Technical Website Check",
    text: "Review hedamo.com, run whatever automated checks the prototype actually supports, and produce a short technical report.",
  },
  {
    name: "Scenario 3 — Ambiguous Request",
    text: "Please take care of the documentation and send it to everyone before the meeting.",
  },
];

export const WorkRequestInput: React.FC<WorkRequestInputProps> = ({ onSubmit, isLoading }) => {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please paste or type a work request before submitting.");
      return;
    }

    setError(null);
    try {
      await onSubmit(text.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process intake request.";
      setError(msg);
    }
  };

  const handleSelectPreset = (presetText: string) => {
    setText(presetText);
    setError(null);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">Work Request Intake</h2>
          <p className="text-xs text-slate-400">
            Paste an email, meeting notes, customer request, founder instruction, or bug report.
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-slate-500 font-mono">Preset Scenarios:</span>
        </div>
      </div>

      {/* Preset Buttons for One-Click Demoing */}
      <div className="flex flex-wrap gap-2">
        {PRESET_SCENARIOS.map((sc, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectPreset(sc.text)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700/60 transition-colors disabled:opacity-50"
          >
            {sc.name}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            id="work-request-input-textarea"
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            disabled={isLoading}
            placeholder="Paste an email, meeting notes, customer request, bug report, or instruction..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none transition-all disabled:opacity-50"
          />
          <div className="absolute bottom-3 right-3 text-[11px] font-mono text-slate-500">
            {text.length} characters
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center space-x-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            id="analyze-work-btn"
            type="submit"
            disabled={isLoading || !text.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/20 border border-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Analyzing Work...</span>
              </>
            ) : (
              <span>Analyze Work &rarr;</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
