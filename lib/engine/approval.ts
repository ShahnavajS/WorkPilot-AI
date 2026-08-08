import { prisma } from "@/lib/db/prisma";
import {
  resolveApproval,
  createActivityEvent,
  updateExecutionStepStatus,
  updateWorkRequestStatus,
} from "@/lib/db/service";
import { resumeWorkRequest } from "./executor";

/**
 * Approves a pending approval record, marks step as COMPLETED, and resumes workflow execution.
 */
export async function approveStep(approvalId: string, reviewerNote?: string) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { executionStep: true },
  });

  if (!approval) {
    throw new Error(`Approval '${approvalId}' not found.`);
  }

  if (approval.status !== "PENDING") {
    throw new Error(`Approval '${approvalId}' is already resolved with status '${approval.status}'.`);
  }

  // Resolve approval record
  const updatedApproval = await resolveApproval(approvalId, "APPROVED", undefined, reviewerNote);

  // Update ExecutionStep to COMPLETED
  if (approval.executionStepId) {
    await updateExecutionStepStatus(approval.executionStepId, "COMPLETED");
  }

  await createActivityEvent(
    approval.workRequestId,
    "APPROVAL_APPROVED",
    `Human approval GRANTED for step: ${approval.executionStepId ?? approvalId}`
  );

  // Resume Workflow Execution
  const summary = await resumeWorkRequest(approval.workRequestId);

  return {
    approval: updatedApproval,
    executionSummary: summary,
  };
}

/**
 * Rejects a pending approval record, marks step as REJECTED, and stops workflow execution.
 */
export async function rejectStep(approvalId: string, reviewerNote?: string) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { executionStep: true },
  });

  if (!approval) {
    throw new Error(`Approval '${approvalId}' not found.`);
  }

  if (approval.status !== "PENDING") {
    throw new Error(`Approval '${approvalId}' is already resolved with status '${approval.status}'.`);
  }

  // Resolve approval record
  const updatedApproval = await resolveApproval(approvalId, "REJECTED", undefined, reviewerNote);

  // Update ExecutionStep to REJECTED
  if (approval.executionStepId) {
    await updateExecutionStepStatus(approval.executionStepId, "REJECTED");
  }

  // Rejection stops workflow execution
  await updateWorkRequestStatus(approval.workRequestId, "FAILED");

  await createActivityEvent(
    approval.workRequestId,
    "APPROVAL_REJECTED",
    `Human approval REJECTED for step: ${approval.executionStepId ?? approvalId}. Reason: ${reviewerNote ?? "No reason given"}`
  );

  return {
    approval: updatedApproval,
    status: "REJECTED",
  };
}

/**
 * Edits draft content and approves a pending approval record, preserving original content for audit.
 */
export async function editAndApproveStep(
  approvalId: string,
  editedContent: string,
  reviewerNote?: string
) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { executionStep: true },
  });

  if (!approval) {
    throw new Error(`Approval '${approvalId}' not found.`);
  }

  if (approval.status !== "PENDING") {
    throw new Error(`Approval '${approvalId}' is already resolved with status '${approval.status}'.`);
  }

  // Find and update associated draft Artifact content if present
  const artifact = await prisma.artifact.findFirst({
    where: {
      workRequestId: approval.workRequestId,
      executionStepId: approval.executionStepId,
    },
  });

  if (artifact) {
    await prisma.artifact.update({
      where: { id: artifact.id },
      data: { content: editedContent },
    });
  }

  // Resolve approval record with edited content while retaining originalContent
  const updatedApproval = await resolveApproval(approvalId, "APPROVED", editedContent, reviewerNote);

  // Update ExecutionStep to COMPLETED
  if (approval.executionStepId) {
    await updateExecutionStepStatus(approval.executionStepId, "COMPLETED");
  }

  await createActivityEvent(
    approval.workRequestId,
    "APPROVAL_APPROVED",
    `Human approval GRANTED with content edits for step: ${approval.executionStepId ?? approvalId}`
  );

  // Resume Workflow Execution
  const summary = await resumeWorkRequest(approval.workRequestId);

  return {
    approval: updatedApproval,
    executionSummary: summary,
  };
}
