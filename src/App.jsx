import { useState, useEffect } from 'react'
import { Menu, X, Package, UtensilsCrossed, Cpu, ArrowRight, ChevronRight } from 'lucide-react'
import './App.css'
import BeerGame from './beergame/BeerGame'
import McdonaldsGame from './mcdonaldsgame/McdonaldsGame'
import NvidiaGame from './nvidiagame/NvidiaGame'
import { ACCENTS } from './shared/theme'

const PROJECT_NAME = 'Co-Designing with AI';

const VIEWS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'beer', label: 'Beer Game' },
  { id: 'game2', label: "Fast Food (McDonald's)" },
  { id: 'game3', label: 'Semiconductor (NVIDIA)' },
];

const GAMES = [
  {
    id: 'beer',
    icon: Package,
    accent: ACCENTS.beer,
    role: 'Play any of 4 roles',
    description: 'The classic four-stage supply chain. Choose Human or AI for each role and watch small demand changes grow upstream.',
  },
  {
    id: 'game2',
    icon: UtensilsCrossed,
    accent: ACCENTS.fastFood,
    role: 'Regional DC Manager at Martin Brower',
    description: 'Turn restaurant orders into bun, beef, and fish orders while AI suppliers decide how much to produce.',
  },
  {
    id: 'game3',
    icon: Cpu,
    accent: ACCENTS.semiconductor,
    role: 'NVIDIA Procurement Manager',
    description: 'Source CoWoS packaging and HBM memory for Blackwell GPUs from AI-run suppliers through a demand surge.',
  },
];

const CODE_STEPS = ['Create', 'Orchestrate', 'Deploy', 'Expand'];

const IMPACT = [
  'Rapid, resource-light system modeling at scale.',
  'Cross-industry simulations beyond supply chains.',
  'Fast scenario testing to reveal risks and bottlenecks.',
  'Decision-ready insights before real-world deployment.',
];

const cls = {
  sectionTitle: 'text-sm font-bold text-slate-500 uppercase tracking-wider mb-3',
  body: 'text-[0.95rem] leading-relaxed text-slate-600',
  btn: 'p-3 text-left bg-white text-slate-600 border border-slate-200 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  activeBtn: 'p-3 text-left bg-blue-600 text-white border border-blue-600 rounded-lg cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
};

const Introduction = ({ onSelect }) => (
  <div className="p-4 md:p-10">
    <div className="max-w-[960px] mx-auto space-y-10">

      <header>
        <h1 className="text-3xl md:text-[2.5rem] md:leading-tight font-bold text-slate-900 mb-2">{PROJECT_NAME}</h1>
        <p className="text-lg md:text-xl text-blue-600">
          AI-generated supply chain simulations, adapted from the classic Beer Game to real industries.
        </p>
      </header>

      <section>
        <h2 className={cls.sectionTitle}>Choose a simulation</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {GAMES.map(game => {
            const Icon = game.icon;
            const label = VIEWS.find(v => v.id === game.id).label;
            return (
              <div key={game.id} className="flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm p-5 border-t-4" style={{ borderTopColor: game.accent }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: game.accent }}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 leading-tight">{label}</h3>
                    <p className="text-sm text-slate-500">{game.role}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">{game.description}</p>
                <button
                  type="button"
                  onClick={() => onSelect(game.id)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                  style={{ backgroundColor: game.accent }}
                >
                  Play <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className={cls.sectionTitle}>How to play</h2>
        <ol className={`${cls.body} list-decimal pl-5 space-y-1.5`}>
          <li>Pick a simulation above or from the menu.</li>
          <li>
            In the Beer Game, choose <strong>Human</strong> or <strong>AI</strong> for each role. In the industry simulations
            you play the distribution or procurement role, and AI agents run the suppliers.
          </li>
          <li>Place orders each week for 20 weeks, keeping inventory and backlog costs as low as possible.</li>
        </ol>
      </section>

      <section>
        <h2 className={cls.sectionTitle}>About the project</h2>
        <p className={`${cls.body} mb-4`}>
          Complex systems are hard to design and test because traditional models rely on fixed assumptions and slow
          development cycles. Co-Designing with AI turns system concepts into executable simulations, using
          industry-specific ontologies to keep the logic consistent and reduce hallucination. Agentic AI turns a
          hot-seat multiplayer game into role-specific training.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-slate-900 mb-3">The CODE framework</h3>
          <ol className="flex flex-col sm:flex-row sm:items-center gap-2">
            {CODE_STEPS.map((step, i) => (
              <li key={step} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-1">
                <div className="flex-1 text-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                  <span className="block text-2xl font-bold text-blue-600 leading-none">{step[0]}</span>
                  <span className="text-sm font-semibold text-slate-700">{step}</span>
                </div>
                {i < CODE_STEPS.length - 1 && (
                  <ChevronRight className="hidden sm:block w-5 h-5 shrink-0 text-slate-400" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          <p className="text-sm text-slate-500 mt-3">
            Refines one-shot prompting to recreate game mechanics, then grounds each industry version in its own ontology.
          </p>
        </div>

        <h3 className="font-semibold text-slate-900 mb-3">Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMPACT.map(text => (
            <div key={text} className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-lg p-3">
              <p className="text-sm text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="pt-5 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          These simulations are AI-generated prototypes, so you may notice minor bugs.
        </p>
      </footer>

    </div>
  </div>
);

function App() {
  const [activeView, setActiveView] = useState('intro');
  const [menuOpen, setMenuOpen] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);

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
    if (id !== activeView && gameInProgress &&
        !window.confirm('Leave this simulation? Your progress will be lost.')) {
      return;
    }
    if (id !== activeView) setGameInProgress(false);
    setActiveView(id);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'beer':
        return <BeerGame onProgressChange={setGameInProgress} />;
      case 'game2':
        return <McdonaldsGame onProgressChange={setGameInProgress} />;
      case 'game3':
        return <NvidiaGame onProgressChange={setGameInProgress} />;
      default:
        return <Introduction onSelect={selectView} />;
    }
  };

  const activeLabel = VIEWS.find(v => v.id === activeView)?.label;

  return (
    <div className="flex flex-col md:flex-row min-h-dvh font-sans text-slate-900 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-white border-b border-slate-200">
        <div className="min-w-0">
          <div className="font-bold leading-tight truncate">{PROJECT_NAME}</div>
          <div className="text-xs text-slate-500 truncate">{activeLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* MOBILE DRAWER BACKDROP */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR (slide-out drawer below md, fixed-width sidebar at md and up) */}
      <nav
        id="main-nav"
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[300px] overflow-y-auto max-md:px-6 max-md:pt-[max(1.5rem,env(safe-area-inset-top))] max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-[transform,visibility] duration-200 ${menuOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'} md:visible md:translate-x-0 md:sticky md:top-0 md:h-dvh md:shrink-0 md:max-w-none md:w-[280px] md:p-6 bg-white border-r border-slate-200 flex flex-col`}
      >
        <div className="flex items-start justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{PROJECT_NAME}</h2>
            <p className="text-sm text-slate-500 mt-1">Supply chain simulations</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="md:hidden -mt-2 -mr-2 w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
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
      <main className="flex-1 min-w-0 overflow-x-clip flex flex-col bg-slate-50">
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
