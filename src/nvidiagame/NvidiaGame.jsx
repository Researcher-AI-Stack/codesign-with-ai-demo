import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu, Server, Package, Loader2, Play, ArrowRight, CalendarClock } from 'lucide-react';
import GameHeader from '../shared/GameHeader';
import EndReport from '../shared/EndReport';
import InTransitList from '../shared/InTransitList';
import AgentCard from '../shared/AgentCard';
import { ui, ACCENTS, CHART, formatCurrency, amplification } from '../shared/theme';

// --- Constants & Config ---
const apiKey = ""; // USER TO FILL
const MAX_WEEKS = 20;
const LEAD_TIME = 2; // Weeks for both stages (Raw->Supplier, Supplier->NVIDIA)
const HOLDING_COST_PER_UNIT = 50; 
const BACKLOG_COST_PER_UNIT = 500; 
const INITIAL_INVENTORY = 400;
const COMPONENT_CAPACITY_PER_WEEK = 2000; // Supplier hard cap
const FORECAST_WEEKS = 3;

// Simulated "Hype Cycle" Demand Curve for Blackwell
const DEMAND_SCHEDULE = [
  200, 250, 300, 400, 500, // Early ramp
  800, 1000, 1200, 1100, 900, // Peak hype / allocation wars
  800, 850, 900, 1000, 1200, // Sustained demand
  1300, 1400, 1200, 1000, 800 // Mature
];

const COMPONENTS = [
  { key: 'cowos', label: 'CoWoS', supplier: 'TSMC', color: '#2563eb', dot: 'bg-blue-600', text: 'text-blue-700' },
  { key: 'hbm', label: 'HBM', supplier: 'SK Hynix', color: '#9333ea', dot: 'bg-purple-600', text: 'text-purple-700' },
];

const STATUS_TONES = {
  ok: 'bg-lime-50 text-lime-800 border-lime-300',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
};

const initialPlayer = () => ({
  inventory: { cowos: INITIAL_INVENTORY, hbm: INITIAL_INVENTORY },
  backlog: 0,
  cash: 0,
  pipeline: [] // Incoming from Suppliers
});

const initialSupplier = (name) => ({
  name,
  inventory: INITIAL_INVENTORY,
  backlog: 0,
  pipeline: [], // Incoming from Raw Materials
  lastOrder: 0,
  reasoning: "Waiting for first order..."
});

const initialSuppliers = () => ({
  cowos: initialSupplier("TSMC (CoWoS)"),
  hbm: initialSupplier("SK Hynix (HBM)"),
});

// --- Helper Components ---

const Card = ({ children, className = "" }) => (
  <div className={`${ui.card} p-4 ${className}`}>
    {children}
  </div>
);

const Logo = () => (
  <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center" style={{ backgroundColor: ACCENTS.semiconductor }}>
    <Cpu className="w-5 h-5 text-black" aria-hidden="true" />
  </div>
);

// --- API Logic ---

const getAITurn = async (role, week, inventory, backlog, incomingShipments, incomingDemand, recentHistory) => {
  if (!apiKey) {
    // Fallback if no API key
    console.warn("No API Key provided. Using heuristic fallback.");
    return { order: incomingDemand, reasoning: "API Key missing. Matching demand." };
  }

  const prompt = `
    You are the Supply Chain Manager for ${role} in a Beer Game simulation supplying NVIDIA.
    Current Week: ${week}.
    Your Inventory: ${inventory}.
    Your Backlog: ${backlog}.
    Incoming Demand (from NVIDIA): ${incomingDemand}.
    Incoming Shipments (arriving soon): ${JSON.stringify(incomingShipments)}.
    Recent History: ${JSON.stringify(recentHistory)}.
    
    Goal: Minimize Total Cost. Holding cost is $50/unit. Backlog cost is $500/unit.
    Constraint: Max order is ${COMPONENT_CAPACITY_PER_WEEK}.
    Instructions:
    1. Do not run out of stock (backlog is expensive).
    2. Do not hoard inventory (holding is expensive).
    3. Avoid the Bullwhip Effect: Do not panic order if you see a temporary spike, but plan for lead times (2 weeks).
    
    Output JSON ONLY: { "order": integer, "reasoning": "short string under 15 words" }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              order: { type: "INTEGER" },
              reasoning: { type: "STRING" }
            }
          }
        }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    // Safety clamp
    const safeOrder = Math.max(0, Math.min(result.order, COMPONENT_CAPACITY_PER_WEEK));
    return { order: safeOrder, reasoning: result.reasoning };

  } catch (error) {
    console.error("AI Error:", error);
    // Fallback: Order demand + portion of backlog
    const heuristic = incomingDemand + Math.floor(backlog * 0.5);
    return { order: heuristic, reasoning: "Connection failed; ordering demand plus half the backlog." };
  }
};

// --- Main Application ---

export default function BlackwellSupplyChain({ onProgressChange }) {
  // --- State ---
  const [week, setWeek] = useState(1);
  const [gameState, setGameState] = useState('START'); // START, PLAY, THINKING, END
  
  // Player State (Blackwell Node)
  const [player, setPlayer] = useState(initialPlayer);

  // AI Suppliers State (Tier 1)
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  
  // Inputs
  const [orders, setOrders] = useState({ cowos: 0, hbm: 0 });
  const [errors, setErrors] = useState({ cowos: '', hbm: '' });

  // History for Charts
  const [history, setHistory] = useState([]);

  useEffect(() => {
    onProgressChange?.(gameState === 'PLAY' || gameState === 'THINKING');
  }, [gameState, onProgressChange]);

  // --- Logic ---

  const validateOrder = (type, value) => {
    const val = parseInt(value) || 0;
    if (val < 0) return "Cannot order negative units.";
    if (val > COMPONENT_CAPACITY_PER_WEEK) return `Max order: ${COMPONENT_CAPACITY_PER_WEEK}`;
    return "";
  };

  const handleInputChange = (type, value) => {
    const error = validateOrder(type, value);
    setErrors(prev => ({ ...prev, [type]: error }));
    setOrders(prev => ({ ...prev, [type]: value }));
  };

  // Phase 1: Player Clicks Submit -> Trigger AI
  const handlePlayerSubmit = async () => {
    const cowosOrder = parseInt(orders.cowos) || 0;
    const hbmOrder = parseInt(orders.hbm) || 0;

    if (cowosOrder > COMPONENT_CAPACITY_PER_WEEK || hbmOrder > COMPONENT_CAPACITY_PER_WEEK) return;

    setGameState('THINKING');

    // Prepare data for AI
    const recentHistory = history.slice(-3);

    // Call Gemini for both suppliers in parallel
    const [cowosDecision, hbmDecision] = await Promise.all([
      getAITurn(
        "TSMC CoWoS Supplier", 
        week, 
        suppliers.cowos.inventory, 
        suppliers.cowos.backlog, 
        suppliers.cowos.pipeline.filter(p => p.arrivalWeek <= week + 2), 
        cowosOrder, 
        recentHistory
      ),
      getAITurn(
        "SK Hynix HBM Supplier", 
        week, 
        suppliers.hbm.inventory, 
        suppliers.hbm.backlog, 
        suppliers.hbm.pipeline.filter(p => p.arrivalWeek <= week + 2), 
        hbmOrder, 
        recentHistory
      )
    ]);

    // Proceed to process the turn with AI decisions
    finalizeTurn(cowosOrder, hbmOrder, cowosDecision, hbmDecision);
  };

  // Phase 2: Process Logistics & Advance Week
  const finalizeTurn = (playerCowosOrder, playerHbmOrder, cowosAI, hbmAI) => {
    
    // --- 1. Supplier Phase (Tier 1) ---
    // Suppliers receive shipments from Raw Materials (ordered 2 weeks ago)
    const updateSupplier = (supplierKey, playerOrder, aiDecision) => {
      const sup = suppliers[supplierKey];
      
      // Receive Raw Materials
      const arrivingRaw = sup.pipeline
        .filter(p => p.arrivalWeek === week)
        .reduce((sum, p) => sum + p.amount, 0);
      
      const availableInventory = sup.inventory + arrivingRaw;
      
      // Fulfill Player Order (Incoming Demand + Existing Backlog)
      const totalDemand = playerOrder + sup.backlog;
      const shippedToPlayer = Math.min(availableInventory, totalDemand);
      const newBacklog = totalDemand - shippedToPlayer;
      const newInventory = availableInventory - shippedToPlayer;
      
      // Place new Production Order (AI Decision)
      const newPipelineItem = { 
        arrivalWeek: week + LEAD_TIME, 
        amount: aiDecision.order 
      };

      return {
        ...sup,
        inventory: newInventory,
        backlog: newBacklog,
        pipeline: [...sup.pipeline, newPipelineItem],
        lastOrder: aiDecision.order,
        reasoning: aiDecision.reasoning,
        lastShipped: shippedToPlayer
      };
    };

    const newCowosState = updateSupplier('cowos', playerCowosOrder, cowosAI);
    const newHbmState = updateSupplier('hbm', playerHbmOrder, hbmAI);

    // --- 2. Player Phase (Tier 0) ---
    
    // Receive shipments from Suppliers (Shipments created 2 weeks ago arrive now)
    // NOTE: In Beer Game logic, what the Supplier ships *now* arrives in *2 weeks*.
    // So we add the *Supplier's Shipment* to the Player's Pipeline.
    
    // Check for arrivals in Player Pipeline
    const arrivingCowos = player.pipeline
      .filter(p => p.type === 'cowos' && p.arrivalWeek === week)
      .reduce((sum, p) => sum + p.amount, 0);
      
    const arrivingHbm = player.pipeline
      .filter(p => p.type === 'hbm' && p.arrivalWeek === week)
      .reduce((sum, p) => sum + p.amount, 0);

    const currentInventory = {
      cowos: player.inventory.cowos + arrivingCowos,
      hbm: player.inventory.hbm + arrivingHbm
    };

    // Fulfill Market Demand
    const marketDemand = DEMAND_SCHEDULE[week - 1] || 0;
    const totalPlayerDemand = marketDemand + player.backlog;
    
    // Production constrained by available components
    const maxProduction = Math.min(currentInventory.cowos, currentInventory.hbm);
    const fulfilled = Math.min(maxProduction, totalPlayerDemand);
    const newPlayerBacklog = totalPlayerDemand - fulfilled;
    
    const newPlayerInventory = {
      cowos: currentInventory.cowos - fulfilled,
      hbm: currentInventory.hbm - fulfilled
    };

    // Calculate Costs
    const holdingCost = (newPlayerInventory.cowos + newPlayerInventory.hbm) * HOLDING_COST_PER_UNIT;
    const backlogCost = newPlayerBacklog * BACKLOG_COST_PER_UNIT;
    const weeklyCost = holdingCost + backlogCost;
    const newTotalCash = player.cash + weeklyCost;

    // Add Supplier Shipments to Player Pipeline (Arrival = Current Week + Lead Time)
    const newPlayerPipeline = [
      ...player.pipeline,
      { arrivalWeek: week + LEAD_TIME, type: 'cowos', amount: newCowosState.lastShipped },
      { arrivalWeek: week + LEAD_TIME, type: 'hbm', amount: newHbmState.lastShipped }
    ];

    // --- 3. Update History & State ---
    const weekStats = {
      week,
      demand: marketDemand,
      fulfilled,
      backlog: newPlayerBacklog,
      invCowos: newPlayerInventory.cowos,
      invHbm: newPlayerInventory.hbm,
      orderCowos: playerCowosOrder,
      orderHbm: playerHbmOrder,
      cost: weeklyCost,
      cumCost: newTotalCash,
      aiCowosInv: newCowosState.inventory,
      aiHbmInv: newHbmState.inventory
    };

    setHistory(prev => [...prev, weekStats]);
    setPlayer({
      inventory: newPlayerInventory,
      backlog: newPlayerBacklog,
      cash: newTotalCash,
      pipeline: newPlayerPipeline
    });
    setSuppliers({
      cowos: newCowosState,
      hbm: newHbmState
    });

    if (week >= MAX_WEEKS) {
      setGameState('END');
    } else {
      setWeek(prev => prev + 1);
      setGameState('PLAY');
    }
  };

  const restartGame = () => {
    setWeek(1);
    setPlayer(initialPlayer());
    setSuppliers(initialSuppliers());
    setHistory([]);
    setOrders({ cowos: 0, hbm: 0 });
    setErrors({ cowos: '', hbm: '' });
    setGameState('PLAY');
  };

  // --- Render ---

  if (gameState === 'START') {
    return (
      <div className={`${ui.page} flex items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${ui.card} border-t-8 border-t-[#76B900] p-6 md:p-8`}>
          <div className="flex items-center gap-4 mb-5">
            <Logo />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Semiconductor (NVIDIA)</h1>
              <p className="text-slate-500">Procurement Manager, Blackwell GPUs</p>
            </div>
          </div>
          <p className="text-slate-600 mb-4">
            You buy the two components every Blackwell GPU needs and try to meet a demand surge without overbuying.
          </p>
          <ul className="text-sm md:text-base text-slate-600 space-y-1.5 list-disc pl-5 mb-6">
            <li>Each GPU uses one <strong>CoWoS</strong> package from TSMC and one <strong>HBM</strong> stack from SK Hynix, so output is limited by whichever runs out first.</li>
            <li>Both suppliers are AI agents that decide how much to produce. Each can accept at most {COMPONENT_CAPACITY_PER_WEEK.toLocaleString()} units per week, and deliveries take {LEAD_TIME} weeks.</li>
            <li>Each component costs ${HOLDING_COST_PER_UNIT} per week to hold. Each GPU of unmet demand costs ${BACKLOG_COST_PER_UNIT} per week.</li>
            <li>You can see demand a few weeks ahead. Use the forecast to plan around the lead time.</li>
          </ul>

          <button 
            type="button"
            onClick={() => setGameState('PLAY')}
            className="w-full bg-[#76B900] hover:bg-[#66a300] text-black font-bold py-4 rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" aria-hidden="true" /> Start simulation
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'END') {
    const avgBacklog = Math.round(history.reduce((a, b) => a + b.backlog, 0) / MAX_WEEKS);
    const totalDemand = history.reduce((a, b) => a + b.demand, 0);
    const totalFulfilled = history.reduce((a, b) => a + b.fulfilled, 0);
    const fillRate = Math.min(100, Math.round((totalFulfilled / totalDemand) * 100));
    const demand = history.map(h => h.demand);
    const swings = COMPONENTS
      .map(c => ({ c, ratio: amplification(history.map(h => h[`order${c.key === 'cowos' ? 'Cowos' : 'Hbm'}`]), demand) }))
      .filter(s => s.ratio !== null);
    const biggest = swings.reduce((a, b) => (a === null || b.ratio > a.ratio ? b : a), null);

    return (
      <div className={ui.page}>
        <EndReport
          subtitle="Semiconductor (NVIDIA) · Procurement performance"
          accent={ACCENTS.semiconductor}
          stats={[
            { label: 'Total cost', value: formatCurrency(player.cash) },
            { label: 'Average backlog', value: `${avgBacklog.toLocaleString()} GPUs/wk` },
            { label: 'Demand filled', value: `${fillRate}%` },
          ]}
          chartTitle="Your orders vs. market demand"
          takeaway={biggest && (
            <>
              Your {biggest.c.label} orders varied <strong>{biggest.ratio.toFixed(1)}×</strong> as much as GPU demand.
              Ordering close to demand keeps the bullwhip effect in check.
            </>
          )}
          chartData={history}
          series={[
            { key: 'demand', name: 'Market demand', color: '#0f172a', dashed: true },
            { key: 'orderCowos', name: 'CoWoS ordered', color: COMPONENTS[0].color },
            { key: 'orderHbm', name: 'HBM ordered', color: COMPONENTS[1].color },
          ]}
          onRestart={restartGame}
        />
      </div>
    );
  }

  const thinking = gameState === 'THINKING';
  const marketDemand = DEMAND_SCHEDULE[week - 1];
  const forecast = DEMAND_SCHEDULE.slice(week, week + FORECAST_WEEKS);
  const arrivingNow = (type) => player.pipeline
    .filter(p => p.type === type && p.arrivalWeek === week)
    .reduce((sum, p) => sum + p.amount, 0);
  const available = {
    cowos: player.inventory.cowos + arrivingNow('cowos'),
    hbm: player.inventory.hbm + arrivingNow('hbm'),
  };
  const maxOutput = Math.min(available.cowos, available.hbm);
  const status = player.backlog > 0
    ? { label: 'Backlogged', tone: 'bad' }
    : maxOutput > 2 * marketDemand
      ? { label: 'Overstocked', tone: 'warn' }
      : { label: 'On track', tone: 'ok' };

  const inTransit = player.pipeline
    .filter(p => p.arrivalWeek >= week && p.amount > 0)
    .map(p => {
      const c = COMPONENTS.find(comp => comp.key === p.type);
      return { arrivalWeek: p.arrivalWeek, label: c.label, amount: p.amount, dot: c.dot };
    });

  return (
    <div className={`${ui.page} flex flex-col`}>
      <GameHeader
        title="Semiconductor (NVIDIA)"
        role="Procurement Manager, Blackwell GPUs"
        week={week}
        maxWeeks={MAX_WEEKS}
        cost={player.cash}
        logo={<Logo />}
        accent={ACCENTS.semiconductor}
      />

      <main className="max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* LEFT COLUMN: Player (NVIDIA) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <h2 className={`${ui.cardTitle} flex items-center gap-2 mb-3`}>
              <CalendarClock className="w-4 h-4" aria-hidden="true" /> Market demand
            </h2>
            <div className="text-3xl font-bold text-slate-900">
              {marketDemand.toLocaleString()} <span className="text-sm text-slate-500 font-normal">GPUs this week</span>
            </div>
            {forecast.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {forecast.map((d, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                    <div className="text-xs text-slate-500">Wk {week + i + 1}</div>
                    <div className="font-mono font-semibold text-slate-800">{d.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-t-4 border-t-[#76B900]">
            <div className="flex justify-between items-start mb-3">
              <h2 className={`${ui.cardTitle} flex items-center gap-2`}>
                <Server className="w-4 h-4" aria-hidden="true" /> Components
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_TONES[status.tone]}`}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {COMPONENTS.map(c => (
                <div key={c.key} className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                  <p className="text-xs text-slate-500">{c.label} stock</p>
                  <p className={`font-mono font-bold text-lg ${c.text}`}>{available[c.key].toLocaleString()}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 mb-3">
              Max output this week: <strong className="font-mono">{maxOutput.toLocaleString()}</strong> GPUs
              <span className="block text-xs text-slate-500">Limited by whichever component runs out first.</span>
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between">
                <p className="text-xs text-red-700 uppercase font-bold mb-1">Unmet backlog</p>
                <p className="text-xs text-slate-500 font-mono">{formatCurrency(player.backlog * BACKLOG_COST_PER_UNIT)}/wk</p>
              </div>
              <div className="text-2xl font-mono text-red-600">{player.backlog.toLocaleString()}</div>
            </div>
          </Card>

          <Card>
            <h2 className={`${ui.cardTitle} flex items-center gap-2 mb-4`}>
              <Package className="w-4 h-4" aria-hidden="true" /> Place orders
            </h2>
            
            {thinking ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                <Loader2 className="w-8 h-8 text-[#76B900] animate-spin" aria-hidden="true" />
                <div>
                  <p className="text-slate-900 font-medium">Suppliers deciding...</p>
                  <p className="text-xs text-slate-500 mt-1">TSMC and SK Hynix are planning production.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {COMPONENTS.map(c => (
                  <div key={c.key}>
                    <label htmlFor={`order-${c.key}`} className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                      <span>{c.label} from {c.supplier}</span>
                      <span className="text-xs text-slate-400 font-normal">max {COMPONENT_CAPACITY_PER_WEEK.toLocaleString()}</span>
                    </label>
                    <input 
                      id={`order-${c.key}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      disabled={gameState !== 'PLAY'}
                      value={orders[c.key]}
                      onChange={(e) => handleInputChange(c.key, e.target.value)}
                      className={`${ui.input} ${errors[c.key] ? 'border-red-500' : ''} focus:ring-[#76B900]`}
                    />
                    {errors[c.key] && <p className="text-xs text-red-600 mt-1">{errors[c.key]}</p>}
                  </div>
                ))}

                <button 
                  type="button"
                  onClick={handlePlayerSubmit}
                  disabled={gameState !== 'PLAY' || Boolean(errors.cowos || errors.hbm)}
                  className="w-full bg-[#76B900] hover:bg-[#66a300] disabled:bg-slate-200 disabled:text-slate-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Submit orders
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* CENTER COLUMN: Analytics */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="h-96 flex flex-col">
            <h3 className={`${ui.cardTitle} mb-4`}>Demand, sales, and backlog</h3>
            <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="week" stroke={CHART.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={CHART.axis} tick={{ fontSize: 12 }} />
                <RechartsTooltip contentStyle={CHART.tooltip} labelFormatter={w => `Week ${w}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="demand" stroke="#0f172a" strokeWidth={2} dot={false} name="Market demand" />
                <Line type="monotone" dataKey="fulfilled" stroke="#65a30d" strokeWidth={2} name="GPUs shipped" />
                <Line type="monotone" dataKey="backlog" stroke="#dc2626" strokeDasharray="5 5" name="Backlog" />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </Card>

          <Card className="h-72 flex flex-col">
             <h3 className={`${ui.cardTitle} mb-4`}>Supplier inventory (AI managed)</h3>
             <div className="flex-1 min-h-0">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="week" stroke={CHART.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={CHART.axis} tick={{ fontSize: 12 }} />
                <RechartsTooltip contentStyle={CHART.tooltip} labelFormatter={w => `Week ${w}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="aiCowosInv" stroke={COMPONENTS[0].color} fill={COMPONENTS[0].color} fillOpacity={0.15} name="TSMC inventory" />
                <Area type="monotone" dataKey="aiHbmInv" stroke={COMPONENTS[1].color} fill={COMPONENTS[1].color} fillOpacity={0.15} name="SK Hynix inventory" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: AI Agents */}
        <div className="lg:col-span-3 space-y-4">
          <InTransitList title="Incoming to you" items={inTransit} currentWeek={week} emptyText="No shipments en route." />

          <Card className="space-y-3">
            <h2 className={ui.cardTitle}>AI suppliers</h2>
            {COMPONENTS.map(c => {
              const sup = suppliers[c.key];
              return (
                <AgentCard
                  key={c.key}
                  name={`${c.supplier} (${c.label})`}
                  dot={c.dot}
                  badges={[sup.backlog > 0 ? { label: `Backlog ${sup.backlog.toLocaleString()}`, tone: 'bad' } : { label: 'OK', tone: 'ok' }]}
                  details={[`Last production: ${sup.lastOrder.toLocaleString()}`, `Stock: ${sup.inventory.toLocaleString()}`]}
                  reasoning={sup.reasoning}
                  busy={thinking}
                />
              );
            })}
          </Card>
        </div>
      </main>
    </div>
  );
}
