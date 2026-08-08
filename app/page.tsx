export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              W
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">WorkPilot AI</h1>
              <p className="text-xs text-slate-400">Agentic Work Intake &amp; Execution Prototype</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Phase 1 — Foundation Established
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* Banner Hero */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-bold text-white">
              Turn unstructured work into structured, reviewable, partially automated workflows.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              WorkPilot AI converts incoming instructions — such as email text, meeting notes, customer requests, or bug reports — into strict structured schemas, explicit execution plans, bounded tool operations, and human-in-the-loop approvals.
            </p>
          </div>
        </section>

        {/* Core Agent Workflow Pipeline Bar */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Agentic Workflow Lifecycle
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { step: "Intake", desc: "Unstructured input" },
              { step: "Interpretation", desc: "Structured schemas" },
              { step: "Planning", desc: "Route & decisions" },
              { step: "Tools", desc: "Bounded functions" },
              { step: "Human Approval", desc: "HITL review gate" },
              { step: "Persistence", desc: "State tracking" },
              { step: "Completion", desc: "Verified result" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col justify-between"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">0{idx + 1}</span>
                  <span className="text-xs font-semibold text-slate-200">{item.step}</span>
                </div>
                <span className="text-[11px] text-slate-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Preview Shell & Readiness Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center: Work Intake Shell */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Work Request Intake (Shell)</h3>
              <span className="text-xs text-slate-500 font-mono">Ready for Phase 2 Implementation</span>
            </div>
            <textarea
              disabled
              rows={4}
              placeholder='Example: "Summarize our partner discussion, extract follow-ups, draft a thank-you email, and remind me in 7 days."'
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-400 placeholder-slate-600 focus:outline-none cursor-not-allowed resize-none"
            />
            <div className="flex justify-end">
              <button
                disabled
                className="px-4 py-2 bg-slate-800 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed border border-slate-700/50"
              >
                Analyze Work (Phase 3)
              </button>
            </div>
          </div>

          {/* Right Column: Environment & System Status */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">System Readiness</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-300">Server Health API</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  /api/health
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-300">Database Engine</span>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Prisma + PostgreSQL
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-300">Schema Validation</span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Zod Engine
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-300">Testing Framework</span>
                <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  Vitest
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-400">
        WorkPilot AI — Phase 1 Project Foundation
      </footer>
    </main>
  );
}
