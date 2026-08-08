"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WorkRequestInput } from "./WorkRequestInput";
import { WorkflowProgress } from "./WorkflowProgress";
import { InterpretationPanel } from "./InterpretationPanel";
import { ClarificationPanel } from "./ClarificationPanel";
import { ExecutionPlanPanel } from "./ExecutionPlanPanel";
import { ApprovalPanel } from "./ApprovalPanel";
import { ArtifactViewer } from "./ArtifactViewer";
import { ActivityTimeline } from "./ActivityTimeline";
import { WorkHistory, type WorkRequestSummary } from "./WorkHistory";

export function Workbench() {
  const [activeWorkRequest, setActiveWorkRequest] = useState<any>(null);
  const [history, setHistory] = useState<WorkRequestSummary[]>([]);
  const [isLoadingIntake, setIsLoadingIntake] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch recent work requests for sidebar/history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/work-requests");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.requests || []);
      }
    } catch (_err) {
      // Silent error for history fetching
    }
  }, []);

  // Fetch complete details for active work request
  const fetchWorkRequestDetails = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/work-requests/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveWorkRequest(data.workRequest);
      }
    } catch (_err) {
      // Handle error
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle New Work Submission (Intake -> Plan)
  const handleIntakeSubmit = async (text: string) => {
    setIsLoadingIntake(true);
    setGlobalError(null);

    try {
      // Step 1: POST /api/intake (Intake & AI Structured Interpretation)
      const intakeRes = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const intakeData = await intakeRes.json();
      if (!intakeRes.ok) {
        throw new Error(intakeData.error || "Intake processing failed.");
      }

      const workRequestId = intakeData.workRequestId;

      // Step 2: POST /api/plan (Agentic Planning & Action Routing)
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workRequestId }),
      });

      const planData = await planRes.json();
      if (!planRes.ok) {
        throw new Error(planData.error || "Planning failed.");
      }

      // Fetch fresh complete details
      await fetchWorkRequestDetails(workRequestId);
      await fetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting work request.";
      setGlobalError(msg);
    } finally {
      setIsLoadingIntake(false);
    }
  };

  // Handle Execution Trigger (POST /api/work-requests/[id]/execute)
  const handleExecute = async () => {
    if (!activeWorkRequest?.id) return;
    setIsExecuting(true);
    setGlobalError(null);

    try {
      const res = await fetch(`/api/work-requests/${activeWorkRequest.id}/execute`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Execution failed.");
      }

      await fetchWorkRequestDetails(activeWorkRequest.id);
      await fetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error executing work request.";
      setGlobalError(msg);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle Approval (POST /api/approvals/[id]/approve)
  const handleApprove = async (approvalId: string, reviewerNote?: string) => {
    setIsSubmittingApproval(true);
    setGlobalError(null);

    try {
      const res = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Approval failed.");
      }

      if (activeWorkRequest?.id) {
        await fetchWorkRequestDetails(activeWorkRequest.id);
        await fetchHistory();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error approving step.";
      setGlobalError(msg);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Reject (POST /api/approvals/[id]/reject)
  const handleReject = async (approvalId: string, reviewerNote?: string) => {
    setIsSubmittingApproval(true);
    setGlobalError(null);

    try {
      const res = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Rejection failed.");
      }

      if (activeWorkRequest?.id) {
        await fetchWorkRequestDetails(activeWorkRequest.id);
        await fetchHistory();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error rejecting step.";
      setGlobalError(msg);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Handle Edit & Approve (POST /api/approvals/[id]/edit-approve)
  const handleEditApprove = async (
    approvalId: string,
    editedContent: string,
    reviewerNote?: string
  ) => {
    setIsSubmittingApproval(true);
    setGlobalError(null);

    try {
      const res = await fetch(`/api/approvals/${approvalId}/edit-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedContent, reviewerNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Edit & Approve failed.");
      }

      if (activeWorkRequest?.id) {
        await fetchWorkRequestDetails(activeWorkRequest.id);
        await fetchHistory();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error editing & approving step.";
      setGlobalError(msg);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const pendingApproval = (activeWorkRequest?.approvals || []).find(
    (a: any) => a.status === "PENDING"
  );

  const missingInfoList = Array.isArray(activeWorkRequest?.interpretation?.missingInformation)
    ? (activeWorkRequest.interpretation.missingInformation as string[])
    : [];

  return (
    <div className="space-y-8">
      {/* Top Banner & Active Status Header */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Work Intake &amp; Execution Workbench</h2>
          <p className="text-xs text-slate-300">
            Intake unstructured requests &rarr; AI interpretation &rarr; Agentic planning &rarr; Bounded tools &rarr; Human-in-the-loop governance.
          </p>
        </div>

        {activeWorkRequest && (
          <button
            onClick={() => setActiveWorkRequest(null)}
            className="self-start md:self-auto px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg border border-indigo-500/30 transition-all"
          >
            + New Work Request
          </button>
        )}
      </section>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚠</span>
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Workflow Stream - 2 Columns wide) */}
        <div className="lg:col-span-2 space-y-6">
          {!activeWorkRequest ? (
            <WorkRequestInput onSubmit={handleIntakeSubmit} isLoading={isLoadingIntake} />
          ) : (
            <>
              {/* Workflow Status Progress Lifecycle */}
              <WorkflowProgress status={activeWorkRequest.status} />

              {/* Status Special Alerts */}
              {activeWorkRequest.status === "NEEDS_CLARIFICATION" && (
                <ClarificationPanel missingInfo={missingInfoList} />
              )}

              {activeWorkRequest.status === "FAILED" && (
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-5 space-y-2 text-xs text-rose-300">
                  <h4 className="font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-2">
                    <span>✕</span>
                    <span>Workflow Execution Failed</span>
                  </h4>
                  <p>
                    The execution engine stopped processing planned actions because a tool or step encountered an unrecoverable failure.
                  </p>
                </div>
              )}

              {activeWorkRequest.status === "COMPLETED" && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 space-y-2 text-xs text-emerald-300">
                  <h4 className="font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                    <span>✓</span>
                    <span>All Planned Actions Completed Successfully</span>
                  </h4>
                  <p>
                    The agentic workflow finished all execution steps and persisted generated artifacts in PostgreSQL.
                  </p>
                </div>
              )}

              {/* Human Approval Gate Card if Pending */}
              {pendingApproval && (
                <ApprovalPanel
                  approval={pendingApproval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEditApprove={handleEditApprove}
                  isSubmitting={isSubmittingApproval}
                />
              )}

              {/* AI Interpretation Panel */}
              {activeWorkRequest.interpretation && (
                <InterpretationPanel
                  interpretation={activeWorkRequest.interpretation}
                  actionItems={activeWorkRequest.actionItems || []}
                />
              )}

              {/* Execution Plan & Routing Panel */}
              {activeWorkRequest.executionPlan?.steps && (
                <ExecutionPlanPanel
                  steps={activeWorkRequest.executionPlan.steps}
                  onExecute={handleExecute}
                  isExecuting={isExecuting}
                  workRequestStatus={activeWorkRequest.status}
                />
              )}

              {/* Artifacts Viewer */}
              {activeWorkRequest.artifacts?.length > 0 && (
                <ArtifactViewer artifacts={activeWorkRequest.artifacts} />
              )}

              {/* Activity Timeline */}
              {activeWorkRequest.activityEvents?.length > 0 && (
                <ActivityTimeline events={activeWorkRequest.activityEvents} />
              )}
            </>
          )}
        </div>

        {/* Right Column (Sidebar: Work History & Navigation) */}
        <div className="space-y-6">
          <WorkHistory
            requests={history}
            activeId={activeWorkRequest?.id ?? null}
            onSelect={(id) => fetchWorkRequestDetails(id)}
            onNewWork={() => setActiveWorkRequest(null)}
          />

          {/* Architecture Reference Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              System Architecture
            </h4>
            <div className="space-y-2 text-slate-400 text-[11px]">
              <p>• <strong className="text-slate-200">OpenAI &amp; Zod:</strong> Strict JSON Schemas for zero-hallucination interpretation &amp; planning.</p>
              <p>• <strong className="text-slate-200">Bounded Tools:</strong> Registered `create_task`, `draft_communication`, `generate_brief`, `website_check`.</p>
              <p>• <strong className="text-slate-200">HITL Governance:</strong> Human approval required for communication drafts before completion.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
