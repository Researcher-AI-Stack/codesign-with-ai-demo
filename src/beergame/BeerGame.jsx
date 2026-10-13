import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import {
  Truck,
  Package,
  ShoppingCart,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Users,
  Play,
  Factory,
  Store,
  Building2,
  Warehouse,
  Mail,
  ClipboardList,
  Bot,
  User,
  Cpu
} from 'lucide-react';
import GameHeader from '../shared/GameHeader';
import EndReport from '../shared/EndReport';
import InTransitList from '../shared/InTransitList';
import { ui, ACCENTS, CHART, formatCurrency, amplification } from '../shared/theme';

// --- CONSTANTS & CONFIGURATION ---

const ROLES = [
  { id: 'retailer', label: 'Retailer', icon: Store, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', ring: 'ring-blue-500', dot: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'wholesaler', label: 'Wholesaler', icon: Warehouse, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300', ring: 'ring-purple-500', dot: 'bg-purple-500', hex: '#a855f7' },
  { id: 'distributor', label: 'Distributor', icon: Building2, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', ring: 'ring-orange-500', dot: 'bg-orange-500', hex: '#f97316' },
  { id: 'manufacturer', label: 'Manufacturer', icon: Factory, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', ring: 'ring-emerald-500', dot: 'bg-emerald-500', hex: '#10b981' }
];

const CONFIG = {
  initialInventory: 12,
  initialBacklog: 0,
  shippingDelay: 2, // Weeks for goods to travel downstream
  orderDelay: 1,    // Weeks for orders to travel upstream
  totalWeeks: 20,
  costHolding: 0.5,
  costBacklog: 1.0,
};

const WEEKS = Array.from({ length: CONFIG.totalWeeks }, (_, i) => i + 1);

// --- API CONFIGURATION ---
const apiKey = ""; // Runtime environment provides key

// --- HELPER FUNCTIONS ---

const getConsumerDemand = (week) => {
  if (week <= 4) return 4;
  return 8; // Step jump at week 5
};

const createSeedHistory = () => {
  // Weeks -1 and 0 cover the initial lookbacks (delays).
  // Equilibrium start: everyone ordering 4, shipping 4, holding 12.
  const seedData = [];
  for (let w = -1; w <= 0; w++) {
    ROLES.forEach(role => {
      seedData.push({
        week: w,
        roleId: role.id,
        inventory: 12,
        backlog: 0,
        orderPlaced: 4,
        shipped: 4,
        cost: 6 // 12 * 0.5
      });
    });
  }
  return seedData;
};

// --- GEMINI AI AGENT ---

async function getAITurn(role, history, currentWeek, incomingShipment, incomingDemand, prevBacklog, prevInventory) {
  const roleHistory = history.filter(h => h.roleId === role.id && h.week < currentWeek);
  
  // Construct context for the AI
  const prompt = `
    You are playing the "Beer Distribution Game" as the ${role.label}.
    Your Goal: Minimize total costs over 20 weeks.
    
    Parameters:
    - Holding Cost: $0.50 per unit/week (for positive inventory).
    - Backlog Cost: $1.00 per unit/week (for negative inventory).
    - Order Delay: 1 week (orders take 1 week to reach upstream).
    - Shipping Delay: 2 weeks (shipments take 2 weeks to arrive from upstream).
    
    Current State (Week ${currentWeek}):
    - Your Current Inventory (before new shipment): ${prevInventory}
    - Your Current Backlog (before new demand): ${prevBacklog}
    - Incoming Shipment (Arriving Now): ${incomingShipment}
    - Incoming Demand (New Orders from downstream): ${incomingDemand}
    
    Recent History (Last 3 weeks):
    ${roleHistory.slice(-3).map(h => `- Week ${h.week}: Ordered ${h.orderPlaced}, Inv ${h.inventory}, Backlog ${h.backlog}`).join('\n')}
    
    Task: Decided how many units to order from your supplier to minimize long-term costs. 
    Consider the pipeline (orders you placed previously that haven't arrived yet).
    Avoid the Bullwhip Effect (do not over-react to panic).
    
    Response Format: Return ONLY a JSON object with this structure: { "order": integer, "reasoning": "string" }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    return result;
  } catch (error) {
    console.error("AI Error:", error);
    // Fallback: order amount matching incoming demand (safe play)
    return { order: incomingDemand, reasoning: "Fallback strategy due to AI error." };
  }
}

// --- SHARED PIECES ---

const BeerLogo = () => (
  <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: ACCENTS.beer }}>
    <Package className="w-5 h-5" aria-hidden="true" />
  </div>
);

const BeerHeader = ({ role, week, cost }) => (
  <GameHeader title="Beer Game" role={role} week={week} maxWeeks={CONFIG.totalWeeks} cost={cost} logo={<BeerLogo />} accent={ACCENTS.beer} />
);

// --- VISUALIZATION COMPONENT ---

// Chips sit centered on the loop's side rails (left-4 / right-4 in the vertical map)
const FlowConnector = ({ order, shipment, shipmentIcon = Truck }) => {
  const ShipmentIcon = shipmentIcon;
  return (
  <div className="relative h-16">
    <div className="absolute left-4 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 bg-white px-1 py-1.5 rounded-full border border-amber-400">
      <Mail className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
      <span className="sr-only">Orders moving upstream:</span>
      <span className="text-xs font-mono font-bold text-amber-700 leading-none">{order}</span>
      <ArrowDown className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
    </div>
    <div className="absolute right-4 top-1/2 translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 bg-white px-1 py-1.5 rounded-full border border-emerald-400">
      <ArrowUp className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
      <span className="sr-only">Shipments moving downstream:</span>
      <span className="text-xs font-mono font-bold text-emerald-700 leading-none">{shipment}</span>
      <ShipmentIcon className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
    </div>
  </div>
  );
};

const SupplyChainMap = ({ currentWeek, history, activeRoleId }) => {
  // Helper to safely get history
  const getEntry = (week, roleId) => history.find(h => h.week === week && h.roleId === roleId);

  const consumerDemand = getConsumerDemand(currentWeek);
  const factoryOrder = getEntry(currentWeek - 1, 'manufacturer')?.orderPlaced || 4;

  // Per-role values shared by the horizontal and vertical layouts
  const snapshots = ROLES.map((role, index) => {
    const prevWeekData = getEntry(currentWeek - 1, role.id);
    const downstreamData = index === 0 ? null : getEntry(currentWeek - 1, ROLES[index - 1].id);
    return {
      role,
      inventory: prevWeekData ? prevWeekData.inventory : 12,
      backlog: prevWeekData ? prevWeekData.backlog : 0,
      orderPlaced: prevWeekData ? prevWeekData.orderPlaced : 4,
      incomingOrder: index === 0 ? consumerDemand : downstreamData?.orderPlaced || 4,
      downstreamShipment: index === 0 ? consumerDemand : downstreamData?.shipped || 0,
    };
  });

  const emphasis = (role) => {
    if (!activeRoleId) return '';
    return role.id === activeRoleId ? `ring-2 ring-offset-2 ring-offset-white ${role.ring}` : 'opacity-50';
  };

  // Alignment Constants
  const TOP_ROW_H = "h-20";    // Height for Order boxes/arrows
  const GAP_H = "h-16";        // Height for vertical gap
  const BOT_ROW_H = "h-24";    // Height for Inventory boxes/arrows

  return (
    <div className={`w-full ${ui.card} p-4 md:p-6 md:overflow-x-auto`}>
      <h3 className={`${ui.cardTitle} mb-6 md:mb-8 text-center`}>Supply chain network</h3>

      {/* === VERTICAL LAYOUT (mobile only) === */}
      <div className="md:hidden max-w-sm mx-auto">
        <div className="relative">
          {/* Loop track: orders run down the left rail, shipments return up the right rail.
              top-7/bottom-7 must stay at half the endpoint pill height (h-14). */}
          <div className="absolute left-4 right-1/2 top-7 bottom-7 border-2 border-r-0 border-dashed border-amber-400 rounded-l-3xl pointer-events-none" aria-hidden="true"></div>
          <div className="absolute left-1/2 right-4 top-7 bottom-7 border-2 border-l-0 border-emerald-400 rounded-r-3xl pointer-events-none" aria-hidden="true"></div>

          {/* Consumer (top of the loop) */}
          <div className="relative z-10 mx-auto w-fit h-14 flex items-center gap-2.5 pl-1.5 pr-2 rounded-full bg-white border-2 border-slate-300 shadow-sm">
            <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-500" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-slate-700 uppercase text-sm">Consumer</div>
              <div className="text-xs text-slate-500">Demand</div>
            </div>
            <div className="flex items-center gap-1 bg-amber-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
              <ClipboardList className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Demand:</span>
              {consumerDemand}
            </div>
          </div>

        {snapshots.map(({ role, inventory, backlog, orderPlaced, incomingOrder, downstreamShipment }) => {
          const Icon = role.icon;
          return (
            <React.Fragment key={role.id}>
              <FlowConnector order={incomingOrder} shipment={downstreamShipment} />
              <div className="relative z-10 mx-10 rounded-xl bg-white">
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border-2 ${role.bg} ${role.border} ${emphasis(role)}`}>
                <div className="w-9 h-9 shrink-0 bg-white rounded-lg flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${role.color}`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold ${role.color}`}>{role.label}</div>
                  <div className="text-xs text-slate-500">
                    Last wk order: <span className="font-mono font-bold text-amber-700">{orderPlaced}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase">Stock</div>
                  <div className={`text-xl font-bold font-mono leading-none ${inventory <= 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {inventory}
                  </div>
                  {backlog > 0 && (
                    <div className="mt-1 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      -{backlog}
                    </div>
                  )}
                </div>
              </div>
              </div>
            </React.Fragment>
          );
        })}

          <FlowConnector order={factoryOrder} shipment={factoryOrder} shipmentIcon={Package} />

          {/* Raw materials (bottom of the loop) */}
          <div className="relative z-10 mx-auto w-fit h-14 flex items-center gap-2.5 pl-1.5 pr-4 rounded-full bg-white border-2 border-slate-300 shadow-sm">
            <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-full flex items-center justify-center">
              <Factory className="w-5 h-5 text-slate-500" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-slate-700 uppercase text-sm">Raw Materials</div>
              <div className="text-xs text-slate-500">Orders become goods</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col items-center gap-2 mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 border-t-2 border-dashed border-amber-500" aria-hidden="true"></div>
            <Mail className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" /> Orders travel down the left (upstream)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 border-t-2 border-emerald-500" aria-hidden="true"></div>
            <Truck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Shipments return up the right (downstream)
          </div>
        </div>
      </div>

      {/* === HORIZONTAL LAYOUT (md and up) === */}
      <div className="hidden md:flex justify-center min-w-[900px]">
      <div className="relative flex items-start min-w-0">
        {/* Loop track: orders run right along the top row, shipments return left along the bottom row.
            Rails sit at the row centers (TOP_ROW_H h-20 -> 40px, BOT_ROW_H h-24 -> 80+64+48 = 192px)
            and the end columns (w-20) -> 40px in from each side. */}
        <div className="absolute left-10 right-10 top-10 h-[76px] border-2 border-b-0 border-dashed border-amber-400 rounded-t-3xl pointer-events-none" aria-hidden="true"></div>
        <div className="absolute left-10 right-10 top-[116px] h-[76px] border-2 border-t-0 border-emerald-400 rounded-b-3xl pointer-events-none" aria-hidden="true"></div>

        {/* === CONSUMER COLUMN === */}
        <div className="relative flex flex-col items-center w-20 shrink-0">
          {/* Top: Demand Source */}
          <div className={`${TOP_ROW_H} flex items-center justify-center`}>
            <div className="w-16 h-12 bg-white border-2 border-slate-300 rounded-lg flex items-center justify-center relative shadow-sm">
               <ClipboardList className="w-5 h-5 text-amber-600" />
               <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                 {consumerDemand}
               </div>
            </div>
          </div>
          <div className={`${GAP_H} relative w-full`}>
             <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase rotate-90 tracking-widest bg-white px-1.5">Demand</span>
          </div>
          {/* Bottom: Customer */}
          <div className={`${BOT_ROW_H} flex items-center justify-center`}>
             <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center shadow-sm">
                    <Users className="w-8 h-8 text-slate-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase">Consumer</span>
             </div>
          </div>
        </div>


        {/* === MAIN CHAIN LOOP === */}
        {snapshots.map(({ role, inventory, backlog, orderPlaced, incomingOrder, downstreamShipment }) => {
          const Icon = role.icon;

          return (
            <React.Fragment key={role.id}>

              {/* === CONNECTOR COLUMN (To the Left of Role) === */}
              <div className="flex flex-col w-28 px-2">
                 {/* Top Arrow: ORDERS (Left -> Right) */}
                 <div className={`${TOP_ROW_H} flex items-center justify-center w-full relative`}>
                    <div className="bg-white px-2 py-0.5 rounded-full border border-amber-400 flex items-center gap-1 z-10">
                      <Mail className="w-3 h-3 text-amber-600" />
                      <span className="text-[10px] font-mono font-bold text-amber-700">
                          {incomingOrder}
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-500" />
                    </div>
                 </div>

                 {/* Spacer */}
                 <div className={GAP_H}></div>

                 {/* Bottom Arrow: SHIPMENTS (Right -> Left) */}
                 <div className={`${BOT_ROW_H} flex items-center justify-center w-full relative`}>
                    <div className="bg-white px-2 py-0.5 rounded-full border border-emerald-400 flex items-center gap-1 z-10 shadow-sm">
                      <ArrowLeft className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-mono font-bold text-emerald-700">
                          {downstreamShipment}
                      </span>
                      <Truck className="w-3 h-3 text-emerald-600" />
                    </div>
                 </div>
              </div>


              {/* === ROLE COLUMN (Top Box & Bottom Box) === */}
              {/* Dim box contents, never the white backings, or the loop rails show through. */}
              <div className="flex flex-col items-center w-24">

                {/* TOP BOX: Order Desk */}
                <div className={`${TOP_ROW_H} w-full flex items-center justify-center`}>
                    <div className="w-full bg-white border border-slate-200 rounded-lg py-2 flex flex-col items-center shadow-sm relative group">
                      <div className={activeRoleId && role.id !== activeRoleId ? 'opacity-50 flex flex-col items-center' : 'flex flex-col items-center'}>
                        <div className="text-[9px] text-slate-500 uppercase tracking-tighter mb-1">Orders</div>
                        <div className="font-mono text-amber-700 font-bold text-lg leading-none">{orderPlaced}</div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-slate-900 text-xs text-white p-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        Last Wk Order
                      </div>
                    </div>
                </div>

                <div className={GAP_H}></div>

                {/* BOTTOM BOX: Inventory/Warehouse */}
                <div className={`${BOT_ROW_H} w-full flex items-center justify-center`}>
                    <div className="w-full rounded-xl bg-white relative">
                    <div className={`w-full aspect-square rounded-xl ${role.bg} ${role.border} border-2 flex flex-col items-center justify-center relative shadow-sm ${emphasis(role)}`}>
                      <Icon className={`w-6 h-6 ${role.color} mb-1`} />
                      <div className={`text-xl font-bold font-mono ${inventory <= 0 ? 'text-red-600' : 'text-slate-900'}`}>
                          {inventory}
                      </div>
                      {backlog > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white animate-pulse shadow-md">
                            -{backlog}
                          </div>
                      )}
                      <div className="absolute -bottom-6 text-[10px] font-bold text-slate-600 uppercase tracking-tight whitespace-nowrap">
                          {role.label}
                      </div>
                    </div>
                    </div>
                </div>

              </div>

            </React.Fragment>
          );
        })}

        {/* === FACTORY SOURCE COLUMN (Far Right) === */}
        <div className="flex flex-col w-28 px-2">
             {/* Top Arrow: Into Factory */}
             <div className={`${TOP_ROW_H} flex items-center justify-center w-full relative`}>
                <div className="bg-white px-2 py-0.5 rounded-full border border-amber-400 flex items-center gap-1 z-10">
                    <Mail className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] font-mono font-bold text-amber-700">
                      {factoryOrder}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                </div>
             </div>

             {/* Spacer */}
             <div className={GAP_H}></div>

             {/* Bottom Arrow: Production Output */}
             <div className={`${BOT_ROW_H} flex items-center justify-center w-full relative`}>
                <div className="bg-white px-2 py-0.5 rounded-full border border-emerald-400 flex items-center gap-1 z-10 shadow-sm">
                    <ArrowLeft className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-mono font-bold text-emerald-700">
                      {factoryOrder}
                    </span>
                    <Package className="w-3 h-3 text-emerald-600" />
                </div>
             </div>
        </div>

        <div className="relative flex flex-col items-center w-20 shrink-0">
            <div className={TOP_ROW_H}></div> {/* Spacer for alignment */}
            <div className={`${GAP_H} relative w-full`}>
               <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase -rotate-90 tracking-widest bg-white px-1.5">Production</span>
            </div>
            <div className={`${BOT_ROW_H} flex items-center justify-center`}>
               <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-white border-2 border-slate-300 rounded-full flex items-center justify-center shadow-sm">
                      <Factory className="w-8 h-8 text-slate-500" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase text-center leading-tight">Raw Material</span>
               </div>
            </div>
        </div>

      </div>
      </div>

      {/* Footer Legend */}
      <div className="hidden md:flex justify-center gap-8 mt-12 border-t border-slate-200 pt-4">
         <div className="flex items-center gap-2">
            <div className="w-8 border-t-2 border-dashed border-amber-500" aria-hidden="true"></div>
            <Mail className="w-3 h-3 text-amber-600" aria-hidden="true" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Order Flow (Upstream)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-8 border-t-2 border-emerald-500" aria-hidden="true"></div>
            <Truck className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Shipment Flow (Downstream)</span>
         </div>
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---

export default function BeerGame({ onProgressChange }) {
  const [gameState, setGameState] = useState('SETUP'); // SETUP, HANDOFF, PLAY, SUMMARY, GAME_OVER
  const [currentWeek, setCurrentWeek] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0); // 0 to 3 matching ROLES
  
  // Player Config: 'HUMAN' or 'AI'
  const [playerTypes, setPlayerTypes] = useState({
    retailer: 'HUMAN',
    wholesaler: 'HUMAN',
    distributor: 'HUMAN',
    manufacturer: 'HUMAN'
  });

  // AI Processing State
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiReasoning, setAiReasoning] = useState(null);

  // History is the single source of truth.
  const [history, setHistory] = useState(createSeedHistory);

  const [orderInput, setOrderInput] = useState('');

  useEffect(() => {
    onProgressChange?.(gameState !== 'SETUP' && gameState !== 'GAME_OVER');
  }, [gameState, onProgressChange]);

  const humanCount = ROLES.filter(r => playerTypes[r.id] === 'HUMAN').length;
  const teamCost = history.reduce((acc, h) => acc + (h.week > 0 ? h.cost : 0), 0);

  // --- LOGIC: RETRIEVAL ---

  const getHistoryEntry = (week, roleId) => {
    return history.find(h => h.week === week && h.roleId === roleId);
  };

  // Logic: Incoming Shipment (Looking Upstream, 2 weeks ago)
  const getIncomingShipment = (roleIndex, week) => {
    const shipmentDelayWeek = week - CONFIG.shippingDelay;
    
    // Manufacturer "ships" to themselves based on production requests (orders) from 2 weeks ago
    if (roleIndex === 3) {
      const selfHistory = getHistoryEntry(shipmentDelayWeek, ROLES[3].id);
      return selfHistory ? selfHistory.orderPlaced : 4; 
    }

    // Others receive what the upstream supplier SHIPPED 2 weeks ago
    const upstreamRole = ROLES[roleIndex + 1];
    const upstreamHistory = getHistoryEntry(shipmentDelayWeek, upstreamRole.id);
    return upstreamHistory ? upstreamHistory.shipped : 4;
  };

  // Logic: Incoming Demand (Looking Downstream, 1 week ago)
  const getIncomingDemand = (roleIndex, week) => {
    // Retailer receives direct consumer demand
    if (roleIndex === 0) {
      return getConsumerDemand(week);
    }

    // Others receive orders placed by downstream customer 1 week ago
    const orderDelayWeek = week - CONFIG.orderDelay;
    const downstreamRole = ROLES[roleIndex - 1];
    const downstreamHistory = getHistoryEntry(orderDelayWeek, downstreamRole.id);
    return downstreamHistory ? downstreamHistory.orderPlaced : 4;
  };

  // Goods already on their way to a role, or ordered but not yet shipped.
  const getPipeline = (roleIndex, week) => {
    const role = ROLES[roleIndex];
    const lastOrder = getHistoryEntry(week - 1, role.id)?.orderPlaced ?? 0;

    if (roleIndex === 3) {
      return [{ arrivalWeek: week + 1, label: 'Production', amount: lastOrder, dot: 'bg-emerald-500' }];
    }

    const upstream = ROLES[roleIndex + 1];
    const upstreamShipped = getHistoryEntry(week - 1, upstream.id)?.shipped ?? 0;
    return [
      { arrivalWeek: week + 1, label: `Shipped by ${upstream.label}`, amount: upstreamShipped, dot: upstream.dot },
      { arrivalWeek: week + 2, label: 'Your order (not yet shipped)', amount: lastOrder, dot: 'bg-amber-500' },
    ];
  };

  // --- LOGIC: GAME PLAY ---

  // Hot-seat handoffs only matter when more than one person shares the device.
  const beginTurn = (index) => {
    setTurnIndex(index);
    const skipHandoff = playerTypes[ROLES[index].id] === 'HUMAN' && humanCount <= 1;
    setGameState(skipHandoff ? 'PLAY' : 'HANDOFF');
  };

  const handleStartSetup = () => {
    setGameState('SETUP');
  };

  const handleStartGame = () => {
    setCurrentWeek(1);
    setHistory(createSeedHistory());
    beginTurn(0);
  };

  const processTurn = (orderAmount) => {
    const currentRole = ROLES[turnIndex];
    const prevWeekData = getHistoryEntry(currentWeek - 1, currentRole.id);

    // 1. Calculate Incomings
    const shipmentReceived = getIncomingShipment(turnIndex, currentWeek);
    const demandReceived = getIncomingDemand(turnIndex, currentWeek);

    // 2. Calculate State
    // Available to sell = Old Inventory + New Shipment
    const totalAvailable = prevWeekData.inventory + shipmentReceived;
    // Total Obligation = New Demand + Old Backlog
    const totalToShip = demandReceived + prevWeekData.backlog;

    // 3. Determine Shipments & New Stock
    const actuallyShipped = Math.min(totalAvailable, totalToShip);
    
    let newInventory = totalAvailable - actuallyShipped;
    let newBacklog = totalToShip - actuallyShipped;

    // 4. Calculate Costs
    const weekCost = (newInventory * CONFIG.costHolding) + (newBacklog * CONFIG.costBacklog);

    // 5. Commit to History
    const newEntry = {
      week: currentWeek,
      roleId: currentRole.id,
      inventory: newInventory,
      backlog: newBacklog,
      orderPlaced: orderAmount,
      shipped: actuallyShipped,
      cost: weekCost
    };

    setHistory(prev => [...prev, newEntry]);
    setOrderInput('');
    setAiReasoning(null); // Reset AI reasoning

    // 6. Advance Turn
    if (turnIndex < 3) {
      beginTurn(turnIndex + 1);
    } else {
      setGameState('SUMMARY');
    }
  };

  const submitTurn = (e) => {
    if (e) e.preventDefault();
    const orderAmount = parseInt(orderInput);
    if (isNaN(orderAmount) || orderAmount < 0) return;
    processTurn(orderAmount);
  };

  // --- AUTO-START AI TURN (SKIP HANDOFF) ---
  useEffect(() => {
    if (gameState === 'HANDOFF') {
      const currentRole = ROLES[turnIndex];
      const isAI = playerTypes[currentRole.id] === 'AI';
      
      if (isAI) {
         // Automatically transition to PLAY for AI players after a very brief delay
         // Delay allows the user to see "It's X's turn" for a split second, or we can make it instant.
         // Let's do 1 second so the flow isn't jarringly fast.
         const timer = setTimeout(() => {
             setGameState('PLAY');
         }, 1000);
         return () => clearTimeout(timer);
      }
    }
  }, [gameState, turnIndex, playerTypes]);

  // --- AI INTEGRATION: HOOK ---
  
  useEffect(() => {
    if (gameState === 'PLAY') {
      const currentRole = ROLES[turnIndex];
      const playerType = playerTypes[currentRole.id];

      if (playerType === 'AI' && !isAIThinking) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsAIThinking(true);
        
        // Gather context
        const prevWeekData = getHistoryEntry(currentWeek - 1, currentRole.id);
        const incomingShipment = getIncomingShipment(turnIndex, currentWeek);
        const incomingDemand = getIncomingDemand(turnIndex, currentWeek);

        // Call AI
        getAITurn(
            currentRole, 
            history, 
            currentWeek, 
            incomingShipment, 
            incomingDemand, 
            prevWeekData.backlog, 
            prevWeekData.inventory
        ).then(decision => {
            // Apply delay to simulate "thinking" and let UI update
            setTimeout(() => {
                setAiReasoning(decision.reasoning);
                setOrderInput(decision.order.toString());
                
                // Allow a brief moment for user to see the decision before auto-submitting?
                // Or just auto-submit. Let's auto-submit after another delay.
                setTimeout(() => {
                   processTurn(decision.order);
                   setIsAIThinking(false);
                }, 2000); 
            }, 1000);
        });
      }
    }
  }, [gameState, turnIndex, playerTypes, currentWeek]);


  const startNextWeek = () => {
    if (currentWeek >= CONFIG.totalWeeks) {
      setGameState('GAME_OVER');
    } else {
      setCurrentWeek(prev => prev + 1);
      beginTurn(0);
    }
  };

  // --- RENDERERS ---

  if (gameState === 'SETUP') {
    return (
      <div className={`${ui.page} flex flex-col items-center justify-center p-3 md:p-6`}>
        <div className={`max-w-2xl xl:max-w-[50rem] w-full ${ui.card} p-4 md:p-8`}>
          <div className="flex items-center gap-4 mb-5">
            <div className="p-3 bg-amber-100 rounded-full shrink-0">
              <Package className="w-8 h-8 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">The Beer Game</h1>
              <p className="text-slate-500">Supply chain and bullwhip effect simulation</p>
            </div>
          </div>

          <ul className="text-sm md:text-base text-slate-600 space-y-1.5 list-disc pl-5 mb-6">
            <li>Four roles pass beer from the Manufacturer down to the Retailer, who sells to consumers.</li>
            <li>Each week, every role fills what it can and orders more from its supplier. Orders take {CONFIG.orderDelay} week to reach the supplier, and shipments take {CONFIG.shippingDelay} weeks to arrive.</li>
            <li>Each case costs ${CONFIG.costHolding.toFixed(2)} per week to hold and ${CONFIG.costBacklog.toFixed(2)} per week if backlogged. Keep the team's total cost low over {CONFIG.totalWeeks} weeks.</li>
            <li>Humans take turns on this device. AI roles play automatically.</li>
          </ul>

          <h2 className={`${ui.cardTitle} mb-3`}>Choose who plays each role</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-6">
            {ROLES.map(role => (
              <div key={role.id} className={`p-3 md:p-4 rounded-xl border ${role.border} ${role.bg} flex max-md:flex-wrap items-center justify-between max-md:gap-2`}>
                <div className="flex items-center gap-2 md:gap-3">
                  <role.icon className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${role.color}`} />
                  <span className={`font-bold text-[15px] md:text-lg ${role.color}`}>{role.label}</span>
                </div>
                <div className="flex shrink-0 bg-white rounded-lg p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPlayerTypes(prev => ({...prev, [role.id]: 'HUMAN'}))}
                    aria-pressed={playerTypes[role.id] === 'HUMAN'}
                    className={`px-2 md:px-3 py-3.5 md:py-1.5 rounded-md text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${playerTypes[role.id] === 'HUMAN' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <User className="hidden md:block w-3 h-3" /> Human
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerTypes(prev => ({...prev, [role.id]: 'AI'}))}
                    aria-pressed={playerTypes[role.id] === 'AI'}
                    className={`px-2 md:px-3 py-3.5 md:py-1.5 rounded-md text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${playerTypes[role.id] === 'AI' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Bot className="hidden md:block w-3 h-3" /> AI
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleStartGame}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" /> Start simulation
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'HANDOFF') {
    const currentRole = ROLES[turnIndex];
    const isAI = playerTypes[currentRole.id] === 'AI';

    return (
      <div className={`${ui.page} flex flex-col`}>
        <BeerHeader role={`Next up: ${currentRole.label}`} week={currentWeek} cost={teamCost} />
        <div className="flex-1 flex flex-col items-center justify-center p-4">

          {/* Context Map on Handoff */}
          <div className="hidden md:block w-full max-w-5xl mb-8 opacity-60 pointer-events-none scale-75 origin-bottom" aria-hidden="true">
            <SupplyChainMap currentWeek={currentWeek} history={history} activeRoleId={currentRole.id} />
          </div>

          <div className={`w-full max-w-md p-6 md:p-8 rounded-2xl border-2 text-center shadow-lg ${currentRole.bg} ${currentRole.border}`}>
            <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Week {currentWeek}</h2>
            <h1 className={`text-3xl md:text-4xl font-bold mb-6 ${currentRole.color}`}>{currentRole.label}</h1>

            <div className="flex justify-center mb-6">
              {isAI ? (
                <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full border border-amber-300 flex items-center gap-2 animate-pulse">
                  <Bot className="w-5 h-5" /> AI agent playing
                </div>
              ) : (
                <div className="bg-white text-slate-700 px-4 py-2 rounded-full border border-slate-300 flex items-center gap-2">
                  <User className="w-5 h-5" /> Human player
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setGameState('PLAY')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors"
            >
              {isAI ? "Starting AI turn..." : `I am the ${currentRole.label}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'PLAY') {
    const role = ROLES[turnIndex];
    const isAI = playerTypes[role.id] === 'AI';
    const prevData = getHistoryEntry(currentWeek - 1, role.id);
    const incomingShipment = getIncomingShipment(turnIndex, currentWeek);
    const incomingDemand = getIncomingDemand(turnIndex, currentWeek);
    const roleHistory = history.filter(h => h.roleId === role.id && h.week > 0 && h.week < currentWeek);
    const maxOrder = Math.max(1, ...roleHistory.map(h => h.orderPlaced));
    const maxNet = Math.max(1, ...roleHistory.map(h => Math.abs(h.inventory - h.backlog)));

    return (
      <div className={`${ui.page} flex flex-col`}>
        <BeerHeader role={`${role.label} · ${isAI ? 'AI agent' : 'Human'}`} week={currentWeek} cost={teamCost} />
        <div className="p-4 max-w-6xl w-full mx-auto space-y-6">

          <SupplyChainMap currentWeek={currentWeek} history={history} activeRoleId={role.id} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="space-y-6">
              {/* Incoming this week */}
              <div className={`${ui.card} p-4 space-y-3`}>
                <h3 className={ui.cardTitle}>This week</h3>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border-l-4 border-emerald-500">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium">Shipment arriving</span>
                  </div>
                  <span className="text-xl font-bold font-mono">+{incomingShipment}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">{turnIndex === 0 ? 'Consumer demand' : `Order from ${ROLES[turnIndex - 1].label}`}</span>
                  </div>
                  <span className="text-xl font-bold font-mono">-{incomingDemand}</span>
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className={`${ui.card} p-3 md:p-4`}>
                  <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm">
                    <Package className="w-4 h-4 shrink-0" /> <span>Stock</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-600">{prevData.inventory}</div>
                  <div className="text-xs text-slate-500 mt-1">Holding cost: {formatCurrency(prevData.inventory * CONFIG.costHolding)}</div>
                </div>
                <div className={`${ui.card} p-3 md:p-4`}>
                  <div className="flex items-center gap-2 text-slate-500 mb-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span>Backlog</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-mono font-bold text-red-600">{prevData.backlog}</div>
                  <div className="text-xs text-slate-500 mt-1">Backlog cost: {formatCurrency(prevData.backlog * CONFIG.costBacklog)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <InTransitList title="On order" items={getPipeline(turnIndex, currentWeek)} currentWeek={currentWeek} />

              {/* Decision Area */}
              {isAI ? (
                <div className={`${ui.card} p-4 md:p-6 flex flex-col items-center justify-center min-h-[160px]`}>
                  {isAIThinking && !orderInput ? (
                    <>
                      <Cpu className="w-10 h-10 text-amber-500 animate-pulse mb-3" />
                      <h3 className="text-xl font-bold mb-1">AI agent is thinking...</h3>
                      <p className="text-slate-500 text-sm">Analyzing supply chain dynamics</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <Bot className="w-6 h-6 text-amber-600" />
                        <span className="text-xl font-bold">AI ordered {orderInput}</span>
                      </div>
                      {aiReasoning && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 w-full mb-4">
                          <p className="text-slate-600 text-sm italic">"{aiReasoning}"</p>
                        </div>
                      )}
                      <p className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">Submitting order...</p>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={submitTurn} className={`${ui.card} p-4 md:p-6 border-t-4 border-t-amber-500`}>
                  <label htmlFor="beer-order" className="block text-sm font-semibold text-slate-700 mb-2">
                    Order from {turnIndex === 3 ? 'production' : ROLES[turnIndex + 1].label}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="beer-order"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      autoFocus
                      value={orderInput}
                      onChange={(e) => setOrderInput(e.target.value)}
                      placeholder="Qty"
                      className={`${ui.input} flex-1 text-2xl focus:ring-amber-500`}
                    />
                    <button
                      type="submit"
                      disabled={!orderInput}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 md:px-6 py-3 rounded-lg transition-colors flex items-center shrink-0"
                    >
                      Send <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Your order reaches them in {CONFIG.orderDelay} week. Goods take {CONFIG.shippingDelay} more weeks to arrive.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* History (only after Week 1) */}
          {roleHistory.length > 0 && (
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
              <div className={`${ui.card} p-3 flex flex-col`}>
                <p className={`${ui.cardTitle} mb-2`}>Your orders</p>
                <div className="flex-1 min-h-[80px] flex items-end gap-1">
                  {roleHistory.map(h => (
                    <div key={h.week} tabIndex={0} className="flex-1 bg-amber-400 rounded-t-sm relative group hover:bg-amber-500 max-md:focus:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
                         style={{ height: `${Math.max((h.orderPlaced / maxOrder) * 100, 2)}%` }}>
                      <div className="opacity-0 group-hover:opacity-100 max-md:group-focus:opacity-100 group-focus-visible:opacity-100 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        W{h.week}: {h.orderPlaced}
                      </div>
                    </div>
                  ))}
                  <div className="flex-1 bg-slate-100 rounded-t-sm h-full border-b border-slate-300 flex items-end justify-center">
                    <span className="text-xs text-slate-400 mb-1">?</span>
                  </div>
                </div>
              </div>

              <div className={`${ui.card} p-3 flex flex-col`}>
                <div className="flex justify-between items-center mb-2">
                  <p className={ui.cardTitle}>Net stock</p>
                  <div className="flex gap-2 text-xs">
                    <span className="text-emerald-600">+ stock</span>
                    <span className="text-red-600">- backlog</span>
                  </div>
                </div>
                <div className="flex-1 min-h-[80px] relative flex items-center gap-1">
                  <div className="absolute top-1/2 w-full h-px bg-slate-300"></div>
                  {roleHistory.map(h => {
                    const net = h.inventory - h.backlog;
                    const isPos = net >= 0;
                    const pct = (Math.abs(net) / maxNet) * 45;
                    return (
                      <div key={h.week} tabIndex={0} className="flex-1 h-full relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                        <div
                          className={`absolute w-full rounded-sm ${isPos ? 'bg-emerald-500' : 'bg-red-500'} max-md:group-focus:brightness-110`}
                          style={{
                            height: `${Math.max(pct, 2)}%`,
                            bottom: isPos ? '50%' : 'auto',
                            top: isPos ? 'auto' : '50%'
                          }}
                        />
                        <div className="opacity-0 group-hover:opacity-100 max-md:group-focus:opacity-100 group-focus-visible:opacity-100 pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                          W{h.week}: {net}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex-1 h-full relative opacity-40">
                    <div className="absolute top-1/2 left-0 right-0 h-4 -mt-2 border-l border-r border-slate-400"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    const weekData = history.filter(h => h.week === currentWeek);
    const totalWeekCost = weekData.reduce((acc, curr) => acc + curr.cost, 0);

    return (
      <div className={`${ui.page} flex flex-col`}>
        <BeerHeader role="Week summary" week={currentWeek} cost={teamCost} />
        <div className="p-4 md:p-6 max-w-4xl w-full mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Week {currentWeek} summary</h2>

          {/* Card layout (narrow containers) */}
          <div className="md:hidden space-y-3 mb-8">
            {ROLES.map(role => {
              const data = weekData.find(d => d.roleId === role.id);
              return (
                <div key={role.id} className={`${ui.card} border-l-4 ${role.border} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-bold ${role.color}`}>{role.label}</span>
                    <span className="font-mono font-bold text-amber-700">{formatCurrency(data.cost)}</span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <dt className="text-xs text-slate-500 uppercase">Stock</dt>
                      <dd className="font-mono text-lg">{data.inventory}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase">Backlog</dt>
                      <dd className="font-mono text-lg text-red-600">{data.backlog > 0 ? data.backlog : '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase">Ordered</dt>
                      <dd className="font-mono text-lg">{data.orderPlaced}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
            <div className={`${ui.card} flex items-center justify-between p-4 font-bold`}>
              <span>Team cost this week</span>
              <span className="text-amber-700">{formatCurrency(totalWeekCost)}</span>
            </div>
          </div>

          {/* Table layout (wide containers) */}
          <div className={`hidden md:block overflow-x-auto ${ui.card} mb-8`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 text-slate-500 font-medium">Role</th>
                  <th className="p-4 text-slate-500 font-medium text-right">Stock</th>
                  <th className="p-4 text-slate-500 font-medium text-right">Backlog</th>
                  <th className="p-4 text-slate-500 font-medium text-right">Ordered</th>
                  <th className="p-4 text-slate-500 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map(role => {
                  const data = weekData.find(d => d.roleId === role.id);
                  return (
                    <tr key={role.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                      <td className={`p-4 font-bold ${role.color}`}>{role.label}</td>
                      <td className="p-4 text-right font-mono">{data.inventory}</td>
                      <td className="p-4 text-right font-mono text-red-600">{data.backlog > 0 ? data.backlog : '-'}</td>
                      <td className="p-4 text-right font-mono">{data.orderPlaced}</td>
                      <td className="p-4 text-right font-mono text-amber-700">{formatCurrency(data.cost)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-4" colSpan="4">Team cost this week</td>
                  <td className="p-4 text-right text-amber-700">{formatCurrency(totalWeekCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={startNextWeek}
              className="w-full md:w-auto justify-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
              {currentWeek === CONFIG.totalWeeks ? 'Finish simulation' : 'Start next week'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'GAME_OVER') {
    const chartData = WEEKS.map(w => {
      const row = { week: w, demand: getConsumerDemand(w) };
      ROLES.forEach(role => { row[role.id] = getHistoryEntry(w, role.id)?.orderPlaced ?? 0; });
      return row;
    });
    const ratio = amplification(chartData.map(r => r.manufacturer), chartData.map(r => r.demand));
    const roleCosts = ROLES.map(role => ({
      role,
      cost: history.filter(h => h.roleId === role.id && h.week > 0).reduce((a, h) => a + h.cost, 0),
    }));
    const costliest = roleCosts.reduce((a, b) => (b.cost > a.cost ? b : a));

    return (
      <div className={ui.page}>
        <EndReport
          subtitle="Beer Game · 20 weeks"
          accent={ACCENTS.beer}
          stats={[
            { label: 'Total team cost', value: formatCurrency(teamCost) },
            { label: `Highest cost: ${costliest.role.label}`, value: formatCurrency(costliest.cost) },
            { label: 'Peak manufacturer order', value: Math.max(...chartData.map(r => r.manufacturer)) },
          ]}
          chartTitle="The bullwhip effect"
          takeaway={
            <>
              Consumer demand changed only once, from <strong>4</strong> to <strong>8</strong> cases at week 5.
              {ratio !== null && <> Manufacturer orders varied <strong>{ratio.toFixed(1)}×</strong> as much.</>}
            </>
          }
          chartData={chartData}
          series={[
            { key: 'demand', name: 'Consumer demand', color: '#0f172a', dashed: true },
            ...ROLES.map(role => ({ key: role.id, name: role.label, color: role.hex })),
          ]}
          onRestart={handleStartSetup}
        >
          <h2 className="text-xl md:text-2xl font-bold text-center text-slate-700">By role</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {ROLES.map(role => {
              const rows = WEEKS.map(w => {
                const entry = getHistoryEntry(w, role.id);
                return { week: w, order: entry?.orderPlaced ?? 0, net: entry ? entry.inventory - entry.backlog : 0 };
              });
              return (
                <div key={role.id} className={`${ui.card} border-t-4 ${role.border} p-4 md:p-6`}>
                  <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${role.color}`}>
                    <span className={`w-3 h-3 rounded-full ${role.dot}`}></span>
                    {role.label}
                    {playerTypes[role.id] === 'AI' && <Bot className="w-5 h-5 opacity-75" aria-label="AI agent" />}
                  </h3>
                  <p className={`${ui.cardTitle} mb-1`}>Orders placed</p>
                  <div className="h-32 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rows} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="week" stroke={CHART.axis} tick={{ fontSize: 10 }} />
                        <YAxis stroke={CHART.axis} tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={CHART.tooltip} labelFormatter={w => `Week ${w}`} />
                        <Bar dataKey="order" name="Ordered" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className={`${ui.cardTitle} mb-1`}>Net stock (stock minus backlog)</p>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rows} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="week" stroke={CHART.axis} tick={{ fontSize: 10 }} />
                        <YAxis stroke={CHART.axis} tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={CHART.tooltip} labelFormatter={w => `Week ${w}`} />
                        <ReferenceLine y={0} stroke={CHART.axis} />
                        <Bar dataKey="net" name="Net stock" radius={[2, 2, 0, 0]}>
                          {rows.map(r => <Cell key={r.week} fill={r.net >= 0 ? '#10b981' : '#ef4444'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </EndReport>
      </div>
    );
  }

  return null;
}
