"use client";

import React, { useState } from "react";

interface WorkRequestInputProps {
  onSubmit: (text: string) => Promise<void>;
  isLoading: boolean;
}

const PRESET_SCENARIOS = [
  {
    id: "scenario-1",
    label: "Scenario 1 — Routine Business Work",
    text: "Summarize a partner discussion, extract follow-ups, draft a thank-you email, and set a 7-day reminder.",
  },
  {
    id: "scenario-2",
    label: "Scenario 2 — HEDAMO Website Review",
    text: "Review hedamo.com, run whatever automated checks your prototype actually supports, and produce a short technical report.",
  },
  {
    id: "scenario-3",
    label: "Scenario 3 — Ambiguous Request",
    text: "Please take care of the documentation and send it to everyone before the meeting.",
  },
];

export const WorkRequestInput: React.FC<WorkRequestInputProps> = ({ onSubmit, isLoading }) => {
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError("Please enter a work request or select a preset scenario.");
      return;
    }
    setError(null);
    await onSubmit(inputText.trim());
  };

  const handlePresetSelect = (text: string) => {
    setInputText(text);
    setError(null);
  };

  return (
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="space-y-1 border-b border-[#2b3139] pb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#fcd535]">
          Intake &amp; Interpretation Phase
        </span>
        <h3 className="text-xl font-bold text-white tracking-tight">Submit Work Request</h3>
        <p className="text-xs text-[#707a8a]">
          Paste unstructured meeting notes, emails, or operational requests for AI interpretation and agentic routing.
        </p>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#929aa5] uppercase tracking-wider block">
          Preset Demo Scenarios
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              id={preset.id}
              onClick={() => handlePresetSelect(preset.text)}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-[#2b3139] hover:bg-[#363d47] hover:border-[#fcd535]/50 text-[#eaecef] text-xs font-medium rounded-md border border-[#2b3139] transition-all disabled:opacity-50 text-left"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-[#929aa5] uppercase tracking-wider">
              Unstructured Request Text
            </label>
            <span className="text-[11px] font-mono text-[#707a8a]">
              {inputText.length}/10,000 chars
            </span>
          </div>

          <textarea
            id="work-request-textarea"
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. Summarize our partner discussion, extract follow-ups, draft a thank-you email, and set a 7-day reminder..."
            disabled={isLoading}
            className="w-full bg-[#0b0e11] border border-[#2b3139] focus:border-[#fcd535] rounded-lg p-4 text-xs text-[#eaecef] placeholder-[#707a8a] focus:outline-none focus:ring-1 focus:ring-[#fcd535] transition-all"
          />

          {error && <p className="text-xs text-[#f6465d] font-medium">{error}</p>}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            id="submit-work-request-btn"
            disabled={isLoading || !inputText.trim()}
            className="px-6 py-2.5 bg-[#fcd535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-bold uppercase tracking-wider rounded-md shadow-lg shadow-[#fcd535]/10 border border-[#fcd535] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-[#181a20]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Analyzing Work...</span>
              </>
            ) : (
              <span>Analyze &amp; Generate Execution Plan &rarr;</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
