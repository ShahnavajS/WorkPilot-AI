import {
  updateWorkRequestStatus,
  updateExecutionStepStatus,
  type WorkRequestStatus,
  type ExecutionStepStatus,
} from "@/lib/db/service";

/**
 * State Machine Manager for WorkPilot AI Engine.
 * Centralizes all WorkRequest and ExecutionStep status transitions with validation guards.
 */

// Allowed status transitions for WorkRequest
const WORK_REQUEST_TRANSITIONS: Record<WorkRequestStatus, WorkRequestStatus[]> = {
  RECEIVED: ["INTERPRETED", "FAILED"],
  INTERPRETED: ["PLANNED", "NEEDS_CLARIFICATION", "FAILED"],
  PLANNED: ["IN_PROGRESS", "WAITING_FOR_APPROVAL", "NEEDS_CLARIFICATION", "FAILED", "COMPLETED"],
  IN_PROGRESS: ["WAITING_FOR_APPROVAL", "COMPLETED", "FAILED", "NEEDS_CLARIFICATION"],
  WAITING_FOR_APPROVAL: ["IN_PROGRESS", "COMPLETED", "FAILED"],
  COMPLETED: [], // Terminal state
  FAILED: ["IN_PROGRESS"], // Re-execution if explicitly restarted
  NEEDS_CLARIFICATION: ["PLANNED", "FAILED"],
};

// Allowed status transitions for ExecutionStep
const EXECUTION_STEP_TRANSITIONS: Record<ExecutionStepStatus, ExecutionStepStatus[]> = {
  PENDING: ["RUNNING", "WAITING_FOR_APPROVAL", "SKIPPED", "FAILED"],
  RUNNING: ["COMPLETED", "FAILED", "WAITING_FOR_APPROVAL"],
  WAITING_FOR_APPROVAL: ["COMPLETED", "REJECTED", "RUNNING"],
  COMPLETED: [], // Terminal state
  FAILED: ["PENDING", "RUNNING"], // Re-run if retried explicitly
  REJECTED: [], // Terminal state
  SKIPPED: [], // Terminal state
};

/**
 * Validates and executes a WorkRequest status transition.
 */
export async function transitionWorkRequest(
  workRequestId: string,
  currentStatus: WorkRequestStatus,
  targetStatus: WorkRequestStatus
) {
  if (currentStatus === targetStatus) return;

  const allowed = WORK_REQUEST_TRANSITIONS[currentStatus];
  if (allowed && !allowed.includes(targetStatus)) {
    throw new Error(
      `Illegal WorkRequest state transition from '${currentStatus}' to '${targetStatus}'.`
    );
  }

  return updateWorkRequestStatus(workRequestId, targetStatus);
}

/**
 * Validates and executes an ExecutionStep status transition.
 */
export async function transitionExecutionStep(
  stepId: string,
  currentStatus: ExecutionStepStatus,
  targetStatus: ExecutionStepStatus
) {
  if (currentStatus === targetStatus) return;

  const allowed = EXECUTION_STEP_TRANSITIONS[currentStatus];
  if (allowed && !allowed.includes(targetStatus)) {
    throw new Error(
      `Illegal ExecutionStep state transition from '${currentStatus}' to '${targetStatus}'.`
    );
  }

  return updateExecutionStepStatus(stepId, targetStatus);
}
