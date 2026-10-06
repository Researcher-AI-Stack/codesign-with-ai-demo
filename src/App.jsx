import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import './App.css'
import BeerGame from './beergame/BeerGame'
import McdonaldsGame from './mcdonaldsgame/McdonaldsGame'
import NvidiaGame from './nvidiagame/NvidiaGame'

const VIEWS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'beer', label: 'Beer Game' },
  { id: 'game2', label: 'Industry - Fast Food' },
  { id: 'game3', label: 'Industry - Semiconductor' },
];

const SIDEBAR_TEXT = {
  header: "Project Overview",
  generalDescription: "This platform hosts AI-generated simulations adapted from the Beer Game to visualize complex supply chain systems.",
  gameDetails: {
    intro: "Overview and instructions on using this platform.",
    beer: "A supply chain simulation demonstrating the bullwhip effect and inventory management.",
    game2: "Take on the role as Martin Bower's Regional DC Manager and coordinate replenishment efforts to ensure minimal inventory and backlog.",
    game3: "Take on the role as NVIDIA's Procurement Manager and coordinate replenishment efforts to ensure minimal inventory and backlog."
  }
};

// Shared Tailwind class strings
const cls = {
  title: 'text-2xl font-bold mb-4 text-slate-50',
  subTitle: 'text-sm uppercase tracking-wider text-slate-400 mb-2 mt-0 font-bold',
  generalBox: 'mb-5 pb-5 border-b border-slate-700',
  dynamicBox: 'bg-[#3498db]/10 p-3 rounded-md border-l-4 border-[#3498db] mb-6',
  descriptionText: 'text-[0.9rem] leading-relaxed text-slate-300 m-0',
  dynamicText: 'text-[0.85rem] leading-snug text-slate-200 m-0',
  btn: 'min-h-11 px-3 py-3 text-left bg-transparent text-slate-400 border border-slate-700 rounded-md cursor-pointer transition-colors hover:text-slate-200 hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3498db]',
  activeBtn: 'min-h-11 px-3 py-3 text-left bg-[#3498db] text-white border border-[#3498db] rounded-md cursor-pointer font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
};

const Introduction = ({ apiKey, onSetKey }) => {
  return (
    <div className="p-4 md:p-10">
      <div className="max-w-[900px] mx-auto">

        {/* Header Section */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-2.5">
            Co-Designing with AI
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#3498db] m-0">
            Build industrial simulations tailored to your company.
          </p>
        </div>

        {/* Instructions & How to Use */}
        <div className={cls.generalBox}>
          <h3 className={cls.subTitle}>Instructions</h3>
          <p className={cls.descriptionText}>
            This demonstration platform showcases the final outputs of Co-Designing with AI,
            using industry-adapted simulations derived from the classic Beer Game supply-chain model.
          </p>

          <div className={`${cls.dynamicBox} mt-5`}>
            <h4 className={`${cls.subTitle} text-slate-50`}>How to Use the Demo</h4>
            <ul className={`${cls.descriptionText} pl-5 mt-2.5 list-disc`}>
              <li><strong>Select a simulation</strong> using the menu: Beer Game, Fast Food Industry, or Semiconductor Industry.</li>
              <li><strong>Choose the control mode</strong> for each role (Player or AI).</li>
              <li><strong>Run the simulation</strong> to explore system behavior under different configurations.</li>
            </ul>
            <p className={`${cls.descriptionText} mt-4 text-[0.85rem] italic`}>
              *For industry-specific simulations, only the Regional Distribution Center Manager role is user-controlled.
              Other roles are operated by Agentic AI.
            </p>
          </div>
        </div>

        {/* System Connection Section */}
        <div className={`${cls.dynamicBox} border-l-[#e74c3c] mb-10`}>
          <h3 className={cls.subTitle}>System Connection (Under Construction)</h3>
          {apiKey ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${cls.dynamicText} text-green-400 font-bold`}>
                ✅ AI Engine Connected
              </p>
              <button onClick={onSetKey} className={`${cls.btn} text-xs`}>
                Update Key
              </button>
            </div>
          ) : (
            <div className="flex flex-col @md:flex-row @md:items-center @md:justify-between gap-3">
              <p className={cls.dynamicText}>To enable Agentic AI roles, please provide a Gemini API Key.</p>
              <button onClick={onSetKey} className={`${cls.activeBtn} shrink-0 text-center`}>Enter API Key</button>
            </div>
          )}
        </div>

        {/* Background & Approach */}
        <div className={cls.generalBox}>
          <h3 className={cls.subTitle}>Background</h3>
          <p className={cls.descriptionText}>
            Complex systems are difficult to design, test, and scale. Traditional models rely on fixed assumptions,
            static rules, and slow development cycles, making it hard to explore uncertainty, anticipate change,
            or evaluate downstream impacts before deployment.
          </p>
        </div>

        <div className={cls.generalBox}>
          <h3 className={cls.subTitle}>The Approach</h3>
          <p className={`${cls.descriptionText} mb-4`}>
            Co-Designing with AI enables rapid transformation of system concepts into executable simulations,
            leveraging industry-specific ontologies to ensure system logic consistency.
          </p>
          <p className={cls.descriptionText}>
            Our <strong>Create-Orchestrate-Deploy-Expand (CODE)</strong> framework refines the one-shot prompt
            engineering technique for recreating game mechanics and leverages industry-specific ontologies to mitigate
            hallucination. Agentic AI is integrated to shift the simulation from a hot-seat multiplayer style to a
            role-specific training simulation.
          </p>
        </div>

        {/* Demo Details */}
        <div className={cls.generalBox}>
          <h3 className={cls.subTitle}>Demo Capabilities</h3>
          <ul className={`${cls.descriptionText} pl-5 list-disc`}>
            <li>Simulate industry supply chains in Semiconductors and Fast Food</li>
            <li>Multiple modes: collaborative game, role-based training, or Agentic AI-driven simulation</li>
            <li>Adjust parameters, constraints, and scenarios in real time</li>
            <li>Observe system behavior and emergent outcomes</li>
          </ul>
        </div>

        {/* Impact Section */}
        <div className="mb-10">
          <h3 className={cls.subTitle}>Impact</h3>
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4 mt-2.5">
            {[
              'Rapid, resource-light system modeling at scale.',
              'Cross-industry simulations beyond supply chains.',
              'Fast scenario testing to reveal risks and bottlenecks.',
              'Decision-ready insights before real-world deployment.',
            ].map(text => (
              <div key={text} className={`${cls.dynamicBox} mb-0`}>
                <p className={cls.dynamicText}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Footer */}
        <div className="p-5 border-t border-slate-700">
          <p className={`${cls.descriptionText} text-[0.8rem] opacity-60`}>
            <strong>Notes:</strong> This platform represents a raw, auto-generated prototype. Minor bugs or
            interface misalignments may be present. The demo works on mobile, but a larger screen is recommended
            for viewing the full supply chain map.
          </p>
        </div>

      </div>
    </div>
  );
};

function App() {
  // This "state" keeps track of which component is currently visible
  const [activeView, setActiveView] = useState('intro');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const selectView = (id) => {
    setActiveView(id);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  // Logic to decide what to show in the content area
  const renderMainContent = () => {
    switch (activeView) {
      case 'intro':
        return <Introduction />;
      case 'beer':
        return <BeerGame />;
      case 'game2':
        return <McdonaldsGame />;
      case 'game3':
        return <NvidiaGame />;
      default:
        return <Introduction />;
    }
  };

  const activeLabel = VIEWS.find(v => v.id === activeView)?.label;

  return (
    <div className="flex flex-col md:flex-row min-h-dvh font-sans">
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-slate-800 border-b border-slate-700 text-white">
        <div className="min-w-0">
          <div className="font-bold leading-tight truncate">Co-Designing with AI</div>
          <div className="text-xs text-slate-400 truncate">{activeLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-md border border-slate-600 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3498db]"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE DRAWER BACKDROP */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR (drawer below md) */}
      <nav
        id="main-nav"
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] overflow-y-auto bg-slate-800 text-white border-r border-slate-700 p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col transition-[transform,visibility] duration-200 ${menuOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'} md:visible md:translate-x-0 md:sticky md:top-0 md:h-dvh md:shrink-0 md:max-w-none md:w-[260px] lg:w-[300px]`}
      >
        <div className="flex items-center justify-between">
          <h2 className={cls.title}>Menu</h2>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="md:hidden -mt-4 w-11 h-11 flex items-center justify-center rounded-md text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3498db]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GENERAL DESCRIPTION */}
        <div className={cls.generalBox}>
          <h3 className={cls.subTitle}>{SIDEBAR_TEXT.header}</h3>
          <p className={cls.descriptionText}>{SIDEBAR_TEXT.generalDescription}</p>
        </div>

        {/* DYNAMIC GAME DESCRIPTION */}
        <div className={cls.dynamicBox}>
          <p className={cls.dynamicText}>
            <strong>Current View:</strong> {SIDEBAR_TEXT.gameDetails[activeView]}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {VIEWS.map(view => (
            <button
              key={view.id}
              type="button"
              onClick={() => selectView(view.id)}
              aria-current={activeView === view.id ? 'page' : undefined}
              className={activeView === view.id ? cls.activeBtn : cls.btn}
            >
              {view.label}
            </button>
          ))}
        </div>
      </nav>

      {/* CONTENT AREA */}
      <main className="@container flex-1 min-w-0 flex flex-col bg-slate-900">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
