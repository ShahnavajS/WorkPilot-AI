import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding development database for WorkPilot AI...");

  // Clean existing demo data
  await prisma.workRequest.deleteMany();

  // Create sample WorkRequest (Scenario 1: Routine Business Work)
  const workRequest = await prisma.workRequest.create({
    data: {
      originalText:
        "Summarize our partner discussion, extract follow-ups, draft a thank-you email, and remind me in 7 days.",
      status: "WAITING_FOR_APPROVAL",
    },
  });

  console.log(`✅ Created WorkRequest: ${workRequest.id}`);

  // Create Interpretation
  const interpretation = await prisma.interpretation.create({
    data: {
      workRequestId: workRequest.id,
      title: "Partner Discussion Follow-up & Reminder",
      summary:
        "Discussion summary required, key follow-ups extraction, formal thank-you email draft to partner, and 7-day scheduled reminder task.",
      priority: "HIGH",
      detectedDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      missingInformation: ["Partner primary contact email address"],
      automatableActions: ["generate_brief", "create_task"],
      humanConfirmationReqs: ["draft_communication (review thank-you email before sending)"],
    },
  });

  console.log(`✅ Created Interpretation: ${interpretation.id}`);

  // Create ActionItems
  const action1 = await prisma.actionItem.create({
    data: {
      workRequestId: workRequest.id,
      description: "Generate markdown summary brief of partner discussion",
      status: "COMPLETED",
      priority: "HIGH",
      actionType: "REPORT",
    },
  });

  const action2 = await prisma.actionItem.create({
    data: {
      workRequestId: workRequest.id,
      description: "Draft partner thank-you email",
      status: "WAITING_FOR_APPROVAL",
      priority: "MEDIUM",
      actionType: "COMMUNICATION",
    },
  });

  const action3 = await prisma.actionItem.create({
    data: {
      workRequestId: workRequest.id,
      description: "Set 7-day follow-up reminder task",
      status: "COMPLETED",
      priority: "MEDIUM",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      actionType: "REMINDER",
    },
  });

  console.log("✅ Created 3 ActionItems (including 7-day reminder task)");

  // Create ExecutionPlan & ExecutionSteps
  const executionPlan = await prisma.executionPlan.create({
    data: {
      workRequestId: workRequest.id,
      steps: {
        create: [
          {
            actionItemId: action1.id,
            route: "EXECUTE_AUTOMATICALLY",
            reason: "Standard brief generation tool available.",
            toolName: "generate_brief",
            status: "COMPLETED",
          },
          {
            actionItemId: action2.id,
            route: "PREPARE_FOR_HUMAN_REVIEW",
            reason: "External communication drafts require explicit human approval before send.",
            toolName: "draft_communication",
            status: "WAITING_FOR_APPROVAL",
          },
          {
            actionItemId: action3.id,
            route: "EXECUTE_AUTOMATICALLY",
            reason: "Task database creation supported automatically.",
            toolName: "create_task",
            status: "COMPLETED",
          },
        ],
      },
    },
    include: { steps: true },
  });

  console.log(`✅ Created ExecutionPlan with ${executionPlan.steps.length} steps`);

  // Create ToolExecution for brief generator
  const step1 = executionPlan.steps.find((s) => s.toolName === "generate_brief");
  if (step1) {
    await prisma.toolExecution.create({
      data: {
        workRequestId: workRequest.id,
        executionStepId: step1.id,
        toolName: "generate_brief",
        status: "SUCCEEDED",
        input: { title: "Partner Discussion Brief", requestText: workRequest.originalText },
        output: { briefLength: 420, format: "markdown" },
        startedAt: new Date(Date.now() - 3000),
        completedAt: new Date(Date.now() - 1000),
      },
    });
  }

  // Create Approval requirement for thank-you email step
  const step2 = executionPlan.steps.find((s) => s.toolName === "draft_communication");
  if (step2) {
    await prisma.approval.create({
      data: {
        workRequestId: workRequest.id,
        executionStepId: step2.id,
        status: "PENDING",
        originalContent:
          "Subject: Thank you for our partner discussion\n\nDear Partner,\n\nThank you for taking the time to discuss our collaboration opportunity today. We look forward to working together.\n\nBest regards,\nWorkPilot AI",
      },
    });
  }

  // Create Artifacts
  await prisma.artifact.create({
    data: {
      workRequestId: workRequest.id,
      type: "MARKDOWN_BRIEF",
      title: "Partner Discussion Work Brief",
      content: "# Partner Discussion Executive Brief\n\n- **Objective**: Summarize partner discussion and track follow-ups.\n- **Deadline**: 7 Days\n- **Status**: Action items extracted.",
    },
  });

  // Create Activity Trace
  const events = [
    { type: "REQUEST_RECEIVED", message: `Request received: "${workRequest.originalText}"` },
    { type: "INTERPRETATION_STARTED", message: "AI interpretation started." },
    { type: "INTERPRETATION_COMPLETED", message: "Structured output validated. 3 action items identified." },
    { type: "PLAN_CREATED", message: "Execution plan generated: 2 automatic, 1 human review." },
    { type: "TOOL_STARTED", message: 'Tool "generate_brief" started.' },
    { type: "TOOL_SUCCEEDED", message: 'Tool "generate_brief" completed successfully.' },
    { type: "TOOL_STARTED", message: 'Tool "create_task" created persistent 7-day reminder task.' },
    { type: "APPROVAL_REQUESTED", message: "Communication draft prepared. Waiting for human approval." },
  ];

  for (const ev of events) {
    await prisma.activityEvent.create({
      data: {
        workRequestId: workRequest.id,
        type: ev.type as any,
        message: ev.message,
      },
    });
  }

  console.log("✅ Seeded Activity Trace timeline events");
  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
