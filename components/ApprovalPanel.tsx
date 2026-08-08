"use client";

import React, { useState } from "react";

export interface ApprovalData {
  id: string;
  status: string;
  originalContent?: string | null;
  editedContent?: string | null;
  reviewerNote?: string | null;
}

interface ApprovalPanelProps {
  approval: ApprovalData;
  onApprove: (approvalId: string, reviewerNote?: string) => Promise<void>;
  onReject: (approvalId: string, reviewerNote?: string) => Promise<void>;
  onEditApprove: (approvalId: string, editedContent: string, reviewerNote?: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  approval,
  onApprove,
  onReject,
  onEditApprove,
  isSubmitting,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(approval.editedContent || approval.originalContent || "");
  const [reviewerNote, setReviewerNote] = useState(approval.reviewerNote || "");

  if (approval.status !== "PENDING") {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Human Approval Gate
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
              approval.status === "APPROVED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {approval.status}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          This review gate has been resolved ({approval.status}).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/20 border-2 border-amber-500/40 rounded-xl p-6 space-y-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
        <div className="flex items-center space-x-2 text-amber-400">
          <span className="text-lg">🛡️</span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Human Approval Required</h3>
            <p className="text-xs text-amber-300/80">
              Workflow paused. Review draft content before completion.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
          HITL REVIEW GATE
        </span>
      </div>

      {/* Reviewable Draft Content */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Reviewable Communication Content
        </label>

        {isEditing ? (
          <textarea
            id="approval-edit-textarea"
            rows={6}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        ) : (
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {editedText || approval.originalContent || "No draft content available."}
          </div>
        )}
      </div>

      {/* Reviewer Note Input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400 block">Reviewer Note (Optional)</label>
        <input
          id="reviewer-note-input"
          type="text"
          value={reviewerNote}
          onChange={(e) => setReviewerNote(e.target.value)}
          disabled={isSubmitting}
          placeholder="Add optional note or feedback..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700"
            >
              Cancel Edit
            </button>
            <button
              id="approve-edited-btn"
              type="button"
              onClick={() => onEditApprove(approval.id, editedText, reviewerNote)}
              disabled={isSubmitting || !editedText.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-600/20 border border-emerald-500/30 flex items-center space-x-1.5"
            >
              <span>Approve Edited Version</span>
            </button>
          </div>
        ) : (
          <button
            id="toggle-edit-btn"
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isSubmitting}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center space-x-1.5"
          >
            <span>✏️ Edit Content</span>
          </button>
        )}

        <div className="flex items-center space-x-2">
          <button
            id="reject-approval-btn"
            type="button"
            onClick={() => onReject(approval.id, reviewerNote)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 text-xs font-semibold rounded-lg border border-rose-500/30 transition-colors"
          >
            Reject Request
          </button>

          {!isEditing && (
            <button
              id="approve-draft-btn"
              type="button"
              onClick={() => onApprove(approval.id, reviewerNote)}
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 border border-emerald-500/30 flex items-center space-x-1.5"
            >
              <span>✓ Approve Draft</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
