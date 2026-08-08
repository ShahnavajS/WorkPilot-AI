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
      <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#707a8a]">
            Human Approval Gate
          </span>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
              approval.status === "APPROVED"
                ? "bg-[#0ecb81]/15 text-[#0ecb81] border-[#0ecb81]/30"
                : "bg-[#f6465d]/15 text-[#f6465d] border-[#f6465d]/30"
            }`}
          >
            {approval.status}
          </span>
        </div>
        <p className="text-xs text-[#707a8a]">
          This review gate has been resolved ({approval.status}).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e2329] border-2 border-[#fcd535]/50 rounded-xl p-6 space-y-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#fcd535]/20 pb-3">
        <div className="flex items-center space-x-2 text-[#fcd535]">
          <span className="text-xl">🛡️</span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Human Approval Required</h3>
            <p className="text-xs text-[#929aa5]">
              Workflow paused. Review draft content before completion.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded bg-[#fcd535]/15 text-[#fcd535] text-xs font-mono font-bold border border-[#fcd535]/30">
          HITL REVIEW GATE
        </span>
      </div>

      {/* Reviewable Draft Content */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#eaecef] uppercase tracking-wider block">
          Reviewable Communication Content
        </label>

        {isEditing ? (
          <textarea
            id="approval-edit-textarea"
            rows={6}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-[#0b0e11] border border-[#fcd535] rounded-lg p-4 text-xs text-[#eaecef] font-mono focus:outline-none focus:ring-1 focus:ring-[#fcd535]"
          />
        ) : (
          <div className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-4 font-mono text-xs text-[#eaecef] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {editedText || approval.originalContent || "No draft content available."}
          </div>
        )}
      </div>

      {/* Reviewer Note Input */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[#707a8a] block">Reviewer Note (Optional)</label>
        <input
          id="reviewer-note-input"
          type="text"
          value={reviewerNote}
          onChange={(e) => setReviewerNote(e.target.value)}
          disabled={isSubmitting}
          placeholder="Add optional note or feedback..."
          className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-lg px-3 py-2 text-xs text-[#eaecef] placeholder-[#707a8a] focus:outline-none focus:border-[#fcd535]"
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
              className="px-3.5 py-2 bg-[#2b3139] hover:bg-[#363d47] text-[#eaecef] text-xs font-medium rounded-md border border-[#2b3139]"
            >
              Cancel Edit
            </button>
            <button
              id="approve-edited-btn"
              type="button"
              onClick={() => onEditApprove(approval.id, editedText, reviewerNote)}
              disabled={isSubmitting || !editedText.trim()}
              className="px-4 py-2 bg-[#0ecb81] hover:bg-[#0bc079] text-[#181a20] text-xs font-bold rounded-md shadow-md border border-[#0ecb81] flex items-center space-x-1.5"
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
            className="px-3.5 py-2 bg-[#2b3139] hover:bg-[#363d47] text-[#eaecef] text-xs font-medium rounded-md border border-[#2b3139] flex items-center space-x-1.5"
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
            className="px-4 py-2 bg-[#f6465d]/15 hover:bg-[#f6465d]/25 text-[#f6465d] text-xs font-semibold rounded-md border border-[#f6465d]/30 transition-colors"
          >
            Reject Request
          </button>

          {!isEditing && (
            <button
              id="approve-draft-btn"
              type="button"
              onClick={() => onApprove(approval.id, reviewerNote)}
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#fcd535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-bold uppercase rounded-md shadow-lg shadow-[#fcd535]/10 border border-[#fcd535] flex items-center space-x-1.5"
            >
              <span>✓ Approve Draft</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
