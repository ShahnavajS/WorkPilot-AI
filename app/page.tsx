import { Workbench } from "@/components/Workbench";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col font-sans antialiased">
      {/* Binance-Inspired Top Navigation Bar */}
      <header className="h-16 bg-[#0b0e11] border-b border-[#2b3139] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left Wordmark & Navigation Cluster */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2.5 cursor-pointer">
              {/* Binance Yellow Diamond Icon */}
              <div className="w-6 h-6 bg-[#fcd535] rounded-sm transform rotate-45 flex items-center justify-center shadow-lg shadow-[#fcd535]/20">
                <div className="w-2.5 h-2.5 bg-[#181a20] transform -rotate-45" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                WORKPILOT <span className="text-[#fcd535]">AI</span>
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-[#929aa5]">
              <a href="#workbench" className="text-white hover:text-[#fcd535] transition-colors">
                Workbench
              </a>
              <a href="#planner" className="hover:text-white transition-colors">
                Agentic Planner
              </a>
              <a href="#tools" className="hover:text-white transition-colors">
                Tool Registry
              </a>
              <a href="#hitl" className="hover:text-white transition-colors">
                HITL Governance
              </a>
              <a href="#audit" className="hover:text-white transition-colors">
                Audit Trail
              </a>
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-[#1e2329] border border-[#2b3139] rounded-md px-3 py-1 text-[11px] font-mono text-[#0ecb81]">
              <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse" />
              <span>SYSTEM ONLINE</span>
            </div>

            <a
              href="#workbench"
              className="px-4 py-2 bg-[#fcd535] hover:bg-[#f0b90b] text-[#181a20] text-xs font-bold uppercase rounded-full shadow-lg shadow-[#fcd535]/15 border border-[#fcd535] transition-all"
            >
              Start Work &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="workbench">
        <Workbench />
      </main>

      {/* Binance-Style Footer */}
      <footer className="bg-[#0b0e11] border-t border-[#2b3139] mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#707a8a]">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-white tracking-tight">WORKPILOT AI</span>
            <span>&copy; {new Date().getFullYear()} WorkPilot AI Governance Engine. All rights reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-[11px] font-mono">
            <a href="/api/health" target="_blank" className="hover:text-[#fcd535] transition-colors">
              GET /api/health
            </a>
            <a href="/api/ready" target="_blank" className="hover:text-[#fcd535] transition-colors">
              GET /api/ready
            </a>
            <span className="text-[#0ecb81]">PostgreSQL Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
