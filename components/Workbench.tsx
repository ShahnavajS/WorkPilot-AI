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
    } catch {
      // Silent error
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
    } catch {
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
      {/* Top Hero Callout Banner */}
      <section className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#fcd535] bg-[#fcd535]/10 px-2 py-0.5 rounded border border-[#fcd535]/20">
              AGENTIC WORKFLOW ENGINE
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Work Intake &amp; Execution Workbench</h2>
          <p className="text-xs text-[#929aa5]">
            Unstructured intake &rarr; Structured interpretation &rarr; Agentic planning &rarr; Bounded tools &rarr; Human approval &rarr; Audit trail.
          </p>
        </div>

        {activeWorkRequest && (
          <button
            onClick={() => setActiveWorkRequest(null)}
            className="self-start md:self-auto px-4 py-2 bg-[#fcd535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-bold uppercase rounded-md shadow border border-[#fcd535] transition-all"
          >
            + New Work Request
          </button>
        )}
      </section>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 bg-[#f6465d]/15 border border-[#f6465d]/30 rounded-xl text-xs text-[#f6465d] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold">⚠</span>
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-[#f6465d] hover:text-white text-xs underline font-semibold"
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
                <div className="bg-[#f6465d]/10 border border-[#f6465d]/30 rounded-xl p-5 space-y-2 text-xs text-[#f6465d]">
                  <h4 className="font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span>✕</span>
                    <span>Workflow Execution Failed</span>
                  </h4>
                  <p className="text-[#929aa5]">
                    The execution engine stopped processing planned actions because a tool or step encountered an unrecoverable failure.
                  </p>
                </div>
              )}

              {activeWorkRequest.status === "COMPLETED" && (
                <div className="bg-[#0ecb81]/10 border border-[#0ecb81]/30 rounded-xl p-5 space-y-2 text-xs text-[#0ecb81]">
                  <h4 className="font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span>✓</span>
                    <span>All Planned Actions Completed Successfully</span>
                  </h4>
                  <p className="text-[#929aa5]">
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
          <div className="bg-[#1e2329] border border-[#2b3139] rounded-xl p-5 space-y-3 text-xs">
            <h4 className="font-semibold text-[#fcd535] uppercase tracking-wider text-[11px]">
              System Architecture &amp; Governance
            </h4>
            <div className="space-y-2 text-[#929aa5] text-[11px]">
              <p>• <strong className="text-white">Groq / OpenAI &amp; Zod:</strong> Strict JSON Schemas for zero-hallucination interpretation &amp; planning.</p>
              <p>• <strong className="text-white">Bounded Tools:</strong> Registered `create_task`, `draft_communication`, `generate_brief`, `website_check`.</p>
              <p>• <strong className="text-white">HITL Governance:</strong> Human approval required for external communication drafts before completion.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
