import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Store, Activity, Info, Bot, BrainCircuit, Sandwich, Beef, Fish, Play, ArrowRight } from 'lucide-react';
import GameHeader from '../shared/GameHeader';
import EndReport from '../shared/EndReport';
import InTransitList from '../shared/InTransitList';
import AgentCard from '../shared/AgentCard';
import { ui, ACCENTS, CHART, formatCurrency, amplification } from '../shared/theme';

// --- Constants & Config ---
const MAX_WEEKS = 20;
const HOLDING_COST = 0.50;
const BACKLOG_COST = 2.00; // For DC
const SUPPLIER_BACKLOG_COST = 5.00; // Higher penalty for manufacturers to encourage stock
const LEAD_TIME = 2; // Weeks for delivery to DC
const PRODUCTION_DELAY = 2; // Weeks for Manufacturer production
const API_KEY = ""; // User to provide

const INGREDIENTS = [
  { key: 'buns', label: 'Buns', supplier: 'Aryzta', icon: Sandwich, color: '#d97706', dot: 'bg-amber-500', text: 'text-amber-600' },
  { key: 'beef', label: 'Beef patties', supplier: 'Tyson', icon: Beef, color: '#DA291C', dot: 'bg-red-600', text: 'text-red-600' },
  { key: 'fish', label: 'Fish patties', supplier: 'Tyson', icon: Fish, color: '#2563eb', dot: 'bg-blue-600', text: 'text-blue-600' },
];

const RECIPES = [
  { name: 'Big Mac', parts: '3 buns + 2 beef patties' },
  { name: 'Filet-O-Fish', parts: '2 buns + 1 fish patty' },
];

const INITIAL_STORE_ORDERS = {
  storeA: { bigMacs: 100, filets: 20 },
  storeB: { bigMacs: 90, filets: 30 },
  storeC: { bigMacs: 110, filets: 10 }
};

// --- Initial State Generators ---
const generateInitialInventory = () => ({ buns: 1500, beef: 1000, fish: 500 });
const generateEmptyOrder = () => ({ buns: 0, beef: 0, fish: 0 });

// Internal state for an AI Supplier
const generateSupplierState = (role, initialInv) => ({
  role,
  inventory: initialInv,
  backlog: 0,
  productionQueue: [], // { weekArrives, amount }
  lastOrderReceived: 0,
  history: [], // For AI context
  lastReasoning: "Simulation started. Ready for orders.",
  lastProductionOrder: 0
});

const calculateIngredientDemand = (orders) => {
  let bunsNeeded = 0;
  let beefNeeded = 0;
  let fishNeeded = 0;

  Object.values(orders).forEach(order => {
    bunsNeeded += (order.bigMacs * 3) + (order.filets * 2);
    beefNeeded += (order.bigMacs * 2);
    fishNeeded += (order.filets * 1);
  });

  return { buns: bunsNeeded, beef: beefNeeded, fish: fishNeeded };
};

// --- UI Components (Defined Outside App to prevent re-render focus loss) ---

const Logo = () => (
  <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-black text-xl leading-none" style={{ backgroundColor: ACCENTS.fastFood, color: ACCENTS.fastFoodSecondary }}>
    M
  </div>
);

const OrderInput = ({ label, type, value, onChange, icon: Icon, color, disabled }) => (
  <div className="flex flex-col space-y-1">
    <label htmlFor={`order-${type}`} className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
      <Icon size={14} className={color} aria-hidden="true" /> {label}
    </label>
    <input
      id={`order-${type}`}
      type="number"
      inputMode="numeric"
      min="0"
      value={value === 0 ? '' : value}
      onChange={(e) => onChange(type, parseInt(e.target.value) || 0)}
      className={`${ui.input} font-bold focus:ring-[#DA291C]`}
      placeholder="0"
      disabled={disabled}
    />
  </div>
);

const StatCard = ({ title, value, subValue, icon: Icon, iconColor, alert }) => (
  <div className={`p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 border-l-4 ${alert ? 'border-l-red-500 bg-red-50' : 'border-l-[#FFC72C] bg-white'}`}>
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
        <div className="text-xl md:text-2xl font-black text-slate-800 mt-1">{value.toLocaleString()}</div>
        {subValue && <div className="text-xs text-red-600 font-bold mt-1">{subValue}</div>}
      </div>
      <Icon size={20} className={`hidden md:block shrink-0 ${alert ? 'text-red-600' : iconColor}`} aria-hidden="true" />
    </div>
  </div>
);

const StartScreen = ({ onStart }) => (
  <div className={`${ui.page} flex items-center justify-center p-4`}>
    <div className={`max-w-2xl w-full ${ui.card} border-t-8 border-t-[#DA291C] p-6 md:p-8`}>
      <div className="flex items-center gap-4 mb-5">
        <Logo />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Fast Food (McDonald's)</h1>
          <p className="text-slate-500">Regional DC Manager, Martin Brower</p>
        </div>
      </div>
      <p className="text-slate-600 mb-4">
        You run the distribution center that supplies three McDonald's restaurants. Keep buns, beef, and fish in stock without overfilling the warehouse.
      </p>
      <ul className="text-sm md:text-base text-slate-600 space-y-1.5 list-disc pl-5 mb-5">
        <li>Restaurants order Big Macs and Filet-O-Fish each week. A Big Mac uses 3 buns and 2 beef patties; a Filet-O-Fish uses 2 buns and 1 fish patty.</li>
        <li>Order buns from <strong>Aryzta</strong> and patties from <strong>Tyson</strong>. Both are AI agents that decide how much to produce. Deliveries take {LEAD_TIME} weeks.</li>
        <li>Every unit costs {formatCurrency(HOLDING_COST)} per week to hold and {formatCurrency(BACKLOG_COST)} per week if backlogged.</li>
      </ul>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-6">
        <strong>Heads up:</strong> the "Mac for All" promotion starts in week 5 and sends demand up sharply.
      </div>
      <button
        type="button"
        onClick={onStart}
        className="w-full bg-[#FFC72C] hover:bg-[#ffcf4d] text-[#B01B12] font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
      >
        <Play className="w-5 h-5" aria-hidden="true" /> Start simulation
      </button>
    </div>
  </div>
);

const FastFoodGame = ({ onProgressChange, resetGame }) => {
  // --- Game State ---
  const [week, setWeek] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [turnPhase, setTurnPhase] = useState('PLAYER'); // PLAYER, AI_ARYZTA, AI_TYSON, PROCESSING
  const [apiKey] = useState(API_KEY);
  
  // Resources (Player / DC)
  const [inventory, setInventory] = useState(generateInitialInventory());
  const [backlog, setBacklog] = useState({ buns: 0, beef: 0, fish: 0 });
  const [totalCost, setTotalCost] = useState(0);

  // AI Opponents (Upstream)
  const [aryztaState, setAryztaState] = useState(generateSupplierState("Aryzta (Buns)", 3000));
  const [tysonState, setTysonState] = useState(generateSupplierState("Tyson (Protein)", 3000));
  
  // Simulation Data
  const [history, setHistory] = useState(() => [{ week: 0, ...generateInitialInventory(), inventory: 3000, backlog: 0, cost: 0 }]);
  const [messages, setMessages] = useState([{ type: 'info', text: 'Week 1 has started. Place your first orders.' }]);
  
  // Demand (Restaurants)
  const [storeOrders, setStoreOrders] = useState(INITIAL_STORE_ORDERS);
  const [currentDemand, setCurrentDemand] = useState(() => calculateIngredientDemand(INITIAL_STORE_ORDERS));

  // Supply Chain (Shipments in transit from Supplier to DC)
  const [shipments, setShipments] = useState([]);

  // User Input
  const [playerOrder, setPlayerOrder] = useState({ buns: 0, beef: 0, fish: 0 });

  useEffect(() => {
    onProgressChange?.(!gameOver);
  }, [gameOver, onProgressChange]);

  // --- Helpers ---

  const addMessage = (type, text) => {
    setMessages(prev => [{ type, text }, ...prev].slice(0, 10)); 
  };

  // --- Gemini AI Integration ---

  const getAITurn = async (agentName, agentState, currentDemandFromPlayer) => {
    if (!apiKey) {
      console.warn("No API Key provided, using fallback logic.");
      // Fallback: Simple Order-Up-To Policy
      const target = agentState.lastOrderReceived * 1.5 || 200;
      const order = Math.max(0, target - agentState.inventory + agentState.backlog);
      return { 
        order: Math.round(order), 
        reasoning: "API Key missing. Fallback strategy: Target inventory maintenance." 
      };
    }

    const prompt = `
      You are playing a Supply Chain Simulation Game.
      Role: Factory Manager for ${agentName}.
      Goal: Minimize costs. Holding Cost: $0.50/unit. Backlog Penalty: $2.00/unit.
      
      Current State:
      - Week: ${week}
      - Your Inventory: ${agentState.inventory}
      - Your Backlog (Owed to Distributor): ${agentState.backlog}
      - Incoming Order from Distributor (Player): ${currentDemandFromPlayer} units
      - History (Last 3 Weeks): ${JSON.stringify(agentState.history.slice(-3))}
      
      Constraint:
      - Production Delay: ${PRODUCTION_DELAY} weeks. (Order placed now arrives in Week ${week + PRODUCTION_DELAY}).
      - Avoid the Bullwhip Effect (do not over-react to spikes, but do not stockout).
      
      Task: Decide your PRODUCTION ORDER quantity for this week.
      
      Response Format (JSON ONLY):
      {
        "order": <integer>,
        "reasoning": "<short string explaining why>"
      }
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const result = JSON.parse(text);
      return result;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return { order: currentDemandFromPlayer, reasoning: "AI Brain Freeze (Error). Matching demand." };
    }
  };

  // --- Game Loop Logic ---

  // Triggered when Player clicks "Submit orders"
  const startTurnSequence = async () => {
    if (gameOver) return;
    
    // 1. Player Turn Done -> Switch to Aryzta
    setTurnPhase('AI_ARYZTA');
    
    // Execute Aryzta Logic
    const bunsOrderFromPlayer = playerOrder.buns;
    
    // Artificial delay for UI "Thinking"
    await new Promise(r => setTimeout(r, 1000));
    
    const aryztaDecision = await getAITurn("Aryzta (Buns)", aryztaState, bunsOrderFromPlayer);
    
    // Update Aryzta Internal State
    setAryztaState(prev => ({
      ...prev,
      lastReasoning: aryztaDecision.reasoning,
      lastProductionOrder: aryztaDecision.order,
      history: [...prev.history, { week, orderReceived: bunsOrderFromPlayer, inventory: prev.inventory, production: aryztaDecision.order }]
    }));

    // 2. Switch to Tyson
    setTurnPhase('AI_TYSON');
    
    // Execute Tyson Logic (Combined Beef+Fish for simplicity of API call)
    const totalMeatOrder = playerOrder.beef + playerOrder.fish;
    
    await new Promise(r => setTimeout(r, 1000));
    const tysonDecision = await getAITurn("Tyson (Meat)", tysonState, totalMeatOrder);
    
    setTysonState(prev => ({
      ...prev,
      lastReasoning: tysonDecision.reasoning,
      lastProductionOrder: tysonDecision.order,
       history: [...prev.history, { week, orderReceived: totalMeatOrder, inventory: prev.inventory, production: tysonDecision.order }]
    }));

    // 3. Resolve Week
    setTurnPhase('PROCESSING');
    await new Promise(r => setTimeout(r, 500));
    resolveWeek(aryztaDecision.order, tysonDecision.order);
  };

  const resolveWeek = (aryztaProduction, tysonProduction) => {
    // --- Step 1: Upstream (Supplier) Logic ---
    
    // Function to handle a single supplier's logic
    const processSupplier = (state, productionAmount, playerOrderAmount) => {
      let newState = { ...state };
      
      // 1. Receive Production (placed 2 weeks ago)
      const arrivingProduction = newState.productionQueue.find(p => p.weekArrives === week + 1);
      if (arrivingProduction) {
        newState.inventory += arrivingProduction.amount;
      }
      
      // 2. Queue New Production (from AI decision)
      newState.productionQueue.push({ weekArrives: week + 1 + PRODUCTION_DELAY, amount: productionAmount });
      
      // 3. Ship to Player
      const totalOwed = playerOrderAmount + newState.backlog;
      let shippedAmount = 0;
      
      if (newState.inventory >= totalOwed) {
        shippedAmount = totalOwed;
        newState.inventory -= totalOwed;
        newState.backlog = 0;
      } else {
        shippedAmount = newState.inventory;
        newState.backlog = totalOwed - newState.inventory;
        newState.inventory = 0;
      }
      
      newState.lastOrderReceived = playerOrderAmount;
      return { newState, shippedAmount };
    };

    // Process Aryzta (Buns)
    const aryztaResult = processSupplier(aryztaState, aryztaProduction, playerOrder.buns);
    setAryztaState(aryztaResult.newState);

    // Process Tyson (Beef & Fish)
    const tysonResult = processSupplier(tysonState, tysonProduction, playerOrder.beef + playerOrder.fish);
    setTysonState(tysonResult.newState);
    
    // BUT we need to know specifically how many Beef vs Fish were shipped.
    let shippedBeef = playerOrder.beef;
    let shippedFish = playerOrder.fish;
    const tysonDemandTotal = playerOrder.beef + playerOrder.fish + tysonState.backlog; // Approx
    
    // Service Level Ratio
    const serviceLevel = tysonDemandTotal > 0 ? tysonResult.shippedAmount / tysonDemandTotal : 1;
    shippedBeef = Math.floor(playerOrder.beef * serviceLevel);
    shippedFish = Math.floor(playerOrder.fish * serviceLevel);
    
    // --- Step 2: Midstream (Player) Logic ---

    // Create Shipment Object for Player (Arrives in 2 weeks)
    const newShipment = {
      arrivalWeek: week + 1 + LEAD_TIME, 
      quantities: {
        buns: aryztaResult.shippedAmount,
        beef: shippedBeef,
        fish: shippedFish
      }
    };
    
    const updatedShipments = [...shipments, newShipment];
    setShipments(updatedShipments);
    
    // Log if Suppliers shorted the player
    if (aryztaResult.shippedAmount < playerOrder.buns) {
      addMessage('warning', `Aryzta stockout: shipped only ${aryztaResult.shippedAmount} of ${playerOrder.buns} buns.`);
    }
    if (shippedBeef < playerOrder.beef || shippedFish < playerOrder.fish) {
      addMessage('warning', `Tyson stockout: beef or fish shipment came up short.`);
    }

    // --- Step 3: Player Receive & Consume (Standard Logic) ---
    
    // Receive Old Shipments
    const arrivingShipment = updatedShipments.find(s => s.arrivalWeek === week + 1);
    let newInventory = { ...inventory };
    
    if (arrivingShipment) {
      newInventory.buns += arrivingShipment.quantities.buns;
      newInventory.beef += arrivingShipment.quantities.beef;
      newInventory.fish += arrivingShipment.quantities.fish;
      addMessage('success', `Shipment arrived: +${arrivingShipment.quantities.buns} buns, +${arrivingShipment.quantities.beef} beef, +${arrivingShipment.quantities.fish} fish.`);
    }

    // Determine Total Demand (Current Week + Backlog)
    const totalNeeds = {
      buns: currentDemand.buns + backlog.buns,
      beef: currentDemand.beef + backlog.beef,
      fish: currentDemand.fish + backlog.fish
    };

    // Fulfill
    let newBacklog = { buns: 0, beef: 0, fish: 0 };
    ['buns', 'beef', 'fish'].forEach(item => {
      if (newInventory[item] >= totalNeeds[item]) {
        newInventory[item] -= totalNeeds[item];
        newBacklog[item] = 0;
      } else {
        newBacklog[item] = totalNeeds[item] - newInventory[item];
        newInventory[item] = 0;
      }
    });

    // Costs
    const totalItemsHeld = newInventory.buns + newInventory.beef + newInventory.fish;
    const totalItemsBacklog = newBacklog.buns + newBacklog.beef + newBacklog.fish;
    const weeklyCost = (totalItemsHeld * HOLDING_COST) + (totalItemsBacklog * BACKLOG_COST);
    const newTotalCost = totalCost + weeklyCost;

    if (totalItemsBacklog > 0) {
      addMessage('error', `Stockout: ${totalItemsBacklog} units backlogged this week.`);
    }

    setInventory(newInventory);
    setBacklog(newBacklog);
    setTotalCost(newTotalCost);
    setHistory(prev => [...prev, {
      week,
      ...newInventory,
      inventory: totalItemsHeld,
      backlog: totalItemsBacklog,
      cost: newTotalCost,
      demandBuns: currentDemand.buns,
      demandBeef: currentDemand.beef,
      demandFish: currentDemand.fish,
      orderBuns: playerOrder.buns,
      orderBeef: playerOrder.beef,
      orderFish: playerOrder.fish,
    }]);
    setPlayerOrder(generateEmptyOrder());

    if (week === MAX_WEEKS) {
      setGameOver(true);
      setTurnPhase('PLAYER');
      return;
    }

    // --- Step 4: Generate Next Week Demand ---
    const nextWeek = week + 1;
    let multiplier = 1.0;
    
    // Bullwhip Trigger
    if (nextWeek === 5) {
      multiplier = 2.5;
      addMessage('warning', "Headquarters alert: the 'Mac for All' promotion starts now. Expect a big demand spike.");
    } else if (nextWeek === 6) multiplier = 1.8;
    else multiplier = 0.8 + (Math.random() * 0.4);

    const generateStoreDemand = (baseBM, baseF) => ({
      bigMacs: Math.floor(baseBM * multiplier),
      filets: Math.floor(baseF * multiplier)
    });

    const nextStoreOrders = {
      storeA: generateStoreDemand(100, 20),
      storeB: generateStoreDemand(90, 30),
      storeC: generateStoreDemand(110, 10)
    };

    setStoreOrders(nextStoreOrders);
    setCurrentDemand(calculateIngredientDemand(nextStoreOrders));
    setWeek(nextWeek);
    setTurnPhase('PLAYER');
  };

  if (gameOver) {
    const played = history.filter(h => h.week > 0);
    const avgBacklog = Math.round(played.reduce((acc, h) => acc + h.backlog, 0) / played.length);
    const stockoutWeeks = played.filter(h => h.backlog > 0).length;
    const swings = INGREDIENTS.map(ing => {
      const cap = ing.key[0].toUpperCase() + ing.key.slice(1);
      return { ing, ratio: amplification(played.map(h => h[`order${cap}`]), played.map(h => h[`demand${cap}`])) };
    }).filter(s => s.ratio !== null);
    const biggest = swings.reduce((a, b) => (a === null || b.ratio > a.ratio ? b : a), null);

    return (
      <div className={ui.page}>
        <EndReport
          subtitle="Fast Food (McDonald's) · Regional DC performance"
          accent={ACCENTS.fastFood}
          stats={[
            { label: 'Total cost', value: formatCurrency(totalCost) },
            { label: 'Average backlog', value: `${avgBacklog.toLocaleString()} units/wk` },
            { label: 'Weeks with a stockout', value: `${stockoutWeeks} of ${MAX_WEEKS}` },
          ]}
          chartTitle="Your orders vs. restaurant demand"
          takeaway={biggest && (
            <>
              Your {biggest.ing.label.toLowerCase()} orders varied <strong>{biggest.ratio.toFixed(1)}×</strong> as much as {biggest.ing.label.toLowerCase()} demand.
              Ordering close to demand keeps the bullwhip effect in check.
            </>
          )}
          chartData={played}
          series={INGREDIENTS.flatMap(ing => {
            const cap = ing.key[0].toUpperCase() + ing.key.slice(1);
            return [
              { key: `order${cap}`, name: `${ing.label} ordered`, color: ing.color },
              { key: `demand${cap}`, name: `${ing.label} demand`, color: ing.color, dashed: true },
            ];
          })}
          onRestart={resetGame}
        />
      </div>
    );
  }

  const busy = turnPhase !== 'PLAYER';
  const inTransit = shipments
    .filter(s => s.arrivalWeek - 1 >= week)
    .flatMap(s => INGREDIENTS
      .filter(ing => s.quantities[ing.key] > 0)
      .map(ing => ({ arrivalWeek: s.arrivalWeek - 1, label: ing.label, amount: s.quantities[ing.key], dot: ing.dot })));

  const supplierBadges = (state) => state.backlog > 0
    ? [{ label: `Backlog ${state.backlog.toLocaleString()}`, tone: 'bad' }]
    : [{ label: 'OK', tone: 'ok' }];

  return (
    <div className={`${ui.page} flex flex-col`}>
      <GameHeader
        title="Fast Food (McDonald's)"
        role="Regional DC Manager, Martin Brower"
        week={week}
        maxWeeks={MAX_WEEKS}
        cost={totalCost}
        logo={<Logo />}
        accent={ACCENTS.fastFood}
      />

      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6">
        
        {/* LEFT COLUMN: DOWNSTREAM DEMAND */}
        <div className="xl:col-span-3 space-y-4">
          <div className={`${ui.card} overflow-hidden`}>
            <div className="bg-slate-800 text-white p-3 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2"><Store size={18} aria-hidden="true" /> Restaurant orders</h2>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-200">Week {week}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="text-left font-semibold p-2 pl-3">Store</th>
                  <th className="text-right font-semibold p-2">Big Mac</th>
                  <th className="text-right font-semibold p-2 pr-3">Filet</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(storeOrders).map(([id, order]) => (
                  <tr key={id} className="border-b border-slate-100 last:border-0">
                    <td className="p-2 pl-3 text-slate-600">Store {id.slice(-1)}</td>
                    <td className="p-2 text-right font-mono font-semibold">{order.bigMacs}</td>
                    <td className="p-2 pr-3 text-right font-mono font-semibold">{order.filets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`${ui.card} p-4`}>
            <h3 className={`${ui.cardTitle} mb-2`}>Recipes</h3>
            <ul className="space-y-1 text-sm text-slate-600 mb-4">
              {RECIPES.map(r => (
                <li key={r.name}><span className="font-semibold text-slate-800">{r.name}</span> = {r.parts}</li>
              ))}
            </ul>
            <h3 className={`${ui.cardTitle} mb-2`}>Ingredients needed this week</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {INGREDIENTS.map(ing => (
                <div key={ing.key} className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                  <div className="text-xs text-slate-500">{ing.label.split(' ')[0]}</div>
                  <div className="font-bold font-mono text-[#DA291C]">{currentDemand[ing.key].toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: PLAYER / DC */}
        {/* Shown first on narrow screens so the player's controls aren't buried */}
        <div className="order-first xl:order-none xl:col-span-6 space-y-4 md:space-y-6">
          
          {/* Inventory Dashboard */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {INGREDIENTS.map(ing => (
              <StatCard
                key={ing.key}
                title={ing.label}
                value={inventory[ing.key]}
                subValue={backlog[ing.key] > 0 ? `Backlog: ${backlog[ing.key].toLocaleString()}` : null}
                icon={ing.icon}
                iconColor={ing.text}
                alert={backlog[ing.key] > 0}
              />
            ))}
          </div>

          {/* Order Console */}
          <div className={`${ui.card} border-t-4 border-t-[#DA291C] overflow-hidden relative`}>
             {/* AI Turn Overlay */}
             {busy && (
               <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm">
                  <div className="bg-amber-50 p-4 rounded-full mb-4 animate-pulse">
                     <BrainCircuit size={48} className="text-[#DA291C]" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    {turnPhase === 'AI_ARYZTA' ? 'Aryzta (AI) is deciding...' : 
                     turnPhase === 'AI_TYSON' ? 'Tyson (AI) is deciding...' : 
                     'Processing week...'}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md">
                     Each supplier reviews your order and chooses how much to produce.
                  </p>
               </div>
             )}

             <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6">
                {/* `contents` on narrow screens lets the button drop below the inputs via order-last */}
                <div className="contents md:flex md:flex-row md:justify-between md:items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Place orders</h2>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><Info size={14} aria-hidden="true" /> Deliveries take {LEAD_TIME} weeks</p>
                  </div>
                  <button 
                    type="button"
                    onClick={startTurnSequence}
                    disabled={busy}
                    className={`order-last md:order-none px-6 py-3 rounded-lg font-bold shadow-sm transition-transform active:scale-95 flex items-center justify-center md:justify-start gap-2 ${
                      busy ? 'bg-slate-200 text-slate-400' : 'bg-[#FFC72C] hover:bg-[#ffcf4d] text-[#B01B12]'
                    }`}
                  >
                    {busy ? 'Suppliers deciding...' : 'Submit orders'} 
                    {busy ? <Bot size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {INGREDIENTS.map(ing => (
                    <OrderInput
                      key={ing.key}
                      label={`${ing.label.split(' ')[0]} (${ing.supplier})`}
                      type={ing.key}
                      value={playerOrder[ing.key]}
                      onChange={(k, v) => setPlayerOrder({...playerOrder, [k]: v})}
                      icon={ing.icon}
                      color={ing.text}
                      disabled={busy}
                    />
                  ))}
                </div>
             </div>
          </div>

          {/* Chart */}
          <div className={`${ui.card} p-4 h-72 flex flex-col`}>
            <h3 className="text-sm font-bold text-slate-600 mb-2">Ingredient stock by week</h3>
            <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART.grid}/>
                <XAxis dataKey="week" stroke={CHART.axis} tick={{ fontSize: 12 }} />
                <YAxis stroke={CHART.axis} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={CHART.tooltip} labelFormatter={w => `Week ${w}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {INGREDIENTS.map(ing => (
                  <Line key={ing.key} type="monotone" dataKey={ing.key} stroke={ing.color} strokeWidth={2} dot={false} name={ing.label} />
                ))}
                <Line type="monotone" dataKey="backlog" stroke="#475569" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Total backlog" />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: UPSTREAM SUPPLY */}
        <div className="xl:col-span-3 space-y-4">
          <div className={`${ui.card} p-4 space-y-3`}>
            <h2 className={ui.cardTitle}>AI suppliers</h2>
            <AgentCard
              name="Aryzta (Buns)"
              dot="bg-amber-500"
              badges={supplierBadges(aryztaState)}
              details={[`Last production: ${aryztaState.lastProductionOrder.toLocaleString()}`, `Stock: ${aryztaState.inventory.toLocaleString()}`]}
              reasoning={aryztaState.lastReasoning}
              busy={turnPhase === 'AI_ARYZTA'}
            />
            <AgentCard
              name="Tyson (Beef & fish)"
              dot="bg-red-600"
              badges={supplierBadges(tysonState)}
              details={[`Last production: ${tysonState.lastProductionOrder.toLocaleString()}`, `Stock: ${tysonState.inventory.toLocaleString()}`]}
              reasoning={tysonState.lastReasoning}
              busy={turnPhase === 'AI_TYSON'}
            />
          </div>

          <InTransitList title="Incoming shipments" items={inTransit} currentWeek={week} emptyText="No shipments in transit." />

          {/* Activity Log */}
          <div className={`${ui.card} overflow-hidden h-64 flex flex-col`}>
            <div className="bg-slate-50 p-3 border-b border-slate-200">
              <h2 className="font-bold text-sm text-slate-700 flex items-center gap-2"><Activity size={16} aria-hidden="true" /> Activity log</h2>
            </div>
            <div className="p-3 overflow-y-auto space-y-2 flex-grow">
              {messages.map((msg, idx) => (
                <div key={idx} className={`text-xs p-2 rounded border-l-2 ${
                  msg.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                  msg.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                  msg.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                  'bg-slate-50 border-slate-300 text-slate-600'
                }`}>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function McdonaldsGame({ onProgressChange }) {
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);

  if (!started) return <StartScreen onStart={() => setStarted(true)} />;

  return (
    <FastFoodGame
      key={run}
      onProgressChange={onProgressChange}
      resetGame={() => setRun(r => r + 1)}
    />
  );
}
