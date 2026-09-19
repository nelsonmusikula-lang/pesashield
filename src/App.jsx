import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Auth from './Auth';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shield');

  // Profile and budget state
  const [netIncome, setNetIncome] = useState(1200000);
  const [housing, setHousing] = useState(350000);
  const [food, setFood] = useState(250000);
  const [utilities, setUtilities] = useState(80000);
  const [transport, setTransport] = useState(100000);
  const [emergencyBuffer, setEmergencyBuffer] = useState(100000);

  // Debts state
  const [debts, setDebts] = useState([
    { id: 1, name: 'wee', balance: 112234, minPayment: 11, apr: 0 }
  ]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtBalance, setNewDebtBalance] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');
  const [newDebtApr, setNewDebtApr] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 font-medium">Loading PesaShield...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={(user) => setSession({ user })} />;
  }

  // Calculations
  const totalLivingCosts = housing + food + utilities + transport;
  const totalMinDebt = debts.reduce((sum, d) => sum + Number(d.minPayment), 0);
  const totalOutstanding = debts.reduce((sum, d) => sum + Number(d.balance), 0);
  const extraSurplus = netIncome - (totalLivingCosts + totalMinDebt + emergencyBuffer);

  const handleAddDebt = (e) => {
    e.preventDefault();
    if (!newDebtName || !newDebtBalance) return;
    const debtObj = {
      id: Date.now(),
      name: newDebtName,
      balance: Number(newDebtBalance),
      minPayment: Number(newDebtMin || 0),
      apr: Number(newDebtApr || 0),
      user_id: session.user.id
    };
    setDebts([...debts, debtObj]);
    setNewDebtName('');
    setNewDebtBalance('');
    setNewDebtMin('');
    setNewDebtApr('');
  };

  const handleDeleteDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start py-6 px-4">
      {/* Main Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border border-gray-100 relative pb-20">
        
        {/* App Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
              <h1 className="font-extrabold text-slate-900 tracking-wider text-sm">PESASHIELD</h1>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Financial Protection & Strategy</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase font-semibold">User Profile</span>
            <span className="text-xs font-bold text-slate-800 truncate max-w-[120px] block">{session.user.email.split('@')[0]}</span>
          </div>
        </div>

        {/* Tab Content Views */}
        <div className="p-5 flex-1 overflow-y-auto">
          
          {/* SHIELD TAB */}
          {activeTab === 'shield' && (
            <div className="space-y-4">
              <div className="flex space-x-2 border-b border-gray-100 pb-3">
                <button className="px-4 py-1.5 bg-slate-100 text-slate-900 rounded-full text-xs font-bold">Overview</button>
              </div>

              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-amber-900 flex items-center space-x-1 mb-1">
                  <span>⚠️</span> <span>Moderate Debt Burden</span>
                </h3>
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  Debt is consuming a significant portion of income. Limit discretionary spend and avoid new loans.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">Acceleration Surplus</span>
                  <span className="text-sm font-extrabold text-slate-900">TSH {extraSurplus.toLocaleString()}</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Monthly debt payload</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Safe Daily Spend</span>
                  <span className="text-sm font-extrabold text-slate-900">TSH 1,500</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Discretionary safe cap</span>
                </div>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-800 mb-3">Income & Allocation</h4>
                <div className="flex flex-col items-center justify-center py-4 relative">
                  <div className="w-36 h-36 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">NET INCOME</span>
                    <span className="text-xs font-black text-slate-900">TSH {netIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BUDGET & PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Logout Action Card */}
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-red-900">Current Session</h4>
                  <p className="text-[10px] text-red-600 truncate max-w-[180px]">{session.user.email}</p>
                </div>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-sm"
                >
                  Log Out
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-gray-100 text-xs">
                <div><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block mr-1"></span> Living Costs <br/><b>TSH {totalLivingCosts.toLocaleString()}</b></div>
                <div><span className="w-2 h-2 rounded-full bg-rose-500 inline-block mr-1"></span> Min Debt Pay <br/><b>TSH {totalMinDebt}</b></div>
                <div><span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1"></span> Safety Buffer <br/><b>TSH {emergencyBuffer.toLocaleString()}</b></div>
                <div><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1"></span> Extra Surplus <br/><b>TSH {extraSurplus.toLocaleString()}</b></div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Adjust Essentials</h4>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Monthly Net Income (TSH)</label>
                  <input type="number" value={netIncome} onChange={(e) => setNetIncome(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Housing</label>
                    <input type="number" value={housing} onChange={(e) => setHousing(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Food / Grocery</label>
                    <input type="number" value={food} onChange={(e) => setFood(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Utilities / Airtime</label>
                    <input type="number" value={utilities} onChange={(e) => setUtilities(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Transport</label>
                    <input type="number" value={transport} onChange={(e) => setTransport(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Emergency Buffer (TSH)</label>
                  <input type="number" value={emergencyBuffer} onChange={(e) => setEmergencyBuffer(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* DEBTS TAB */}
          {activeTab === 'debts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase">Your Debts</h3>
                  <p className="text-[10px] text-gray-400">Track balance, APRs, and min payments</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Outstanding</span>
                  <span className="text-xs font-extrabold">TSH {totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Min Monthly Obligations</span>
                  <span className="text-xs font-extrabold text-slate-900">TSH {totalMinDebt}</span>
                </div>
              </div>

              {/* Add Debt Form */}
              <form onSubmit={handleAddDebt} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase">Add New Debt</span>
                <input type="text" placeholder="Debt Name" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                <div className="grid grid-cols-3 gap-1">
                  <input type="number" placeholder="Balance" value={newDebtBalance} onChange={(e) => setNewDebtBalance(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" required />
                  <input type="number" placeholder="Min Pay" value={newDebtMin} onChange={(e) => setNewDebtMin(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                  <input type="number" placeholder="APR %" value={newDebtApr} onChange={(e) => setNewDebtApr(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                </div>
                <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Add Debt</button>
              </form>

              {/* Debt List */}
              <div className="space-y-2">
                {debts.map(debt => (
                  <div key={debt.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-3 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{debt.name}</h4>
                      <div className="flex space-x-3 mt-1 text-[10px] text-gray-500">
                        <span>Balance: <b>TSH {debt.balance.toLocaleString()}</b></span>
                        <span>Min: <b>TSH {debt.minPayment}</b></span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteDebt(debt.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAYOFF STRATEGY TAB */}
          {activeTab === 'payoff' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase">Payoff Strategy Engine</h3>
                <p className="text-[10px] text-gray-400">Compare Avalanche vs Snowball payoff paths</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Extra Monthly Payload (TSH)</span>
                <span className="text-xs font-black text-emerald-900">TSH {extraSurplus.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-50/60 border border-amber-200/50 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-900 block mb-1">🔥 Avalanche</span>
                  <span className="text-xs font-bold text-slate-800">3 mos to free</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-700 block mb-1">❄️ Snowball</span>
                  <span className="text-xs font-bold text-slate-800">3 mos to free</span>
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl text-[11px] text-blue-900">
                Both strategies perform effectively for your current balances.
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-6 flex justify-between items-center text-xs">
          <button onClick={() => setActiveTab('shield')} className={`flex flex-col items-center font-bold ${activeTab === 'shield' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span>🛡️</span>
            <span className="text-[9px] mt-0.5">Shield</span>
          </button>
          <button onClick={() => setActiveTab('debts')} className={`flex flex-col items-center font-bold ${activeTab === 'debts' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span>💲</span>
            <span className="text-[9px] mt-0.5">Debts</span>
          </button>
          <button onClick={() => setActiveTab('payoff')} className={`flex flex-col items-center font-bold ${activeTab === 'payoff' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span>📈</span>
            <span className="text-[9px] mt-0.5">Payoff</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center font-bold ${activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span>👤</span>
            <span className="text-[9px] mt-0.5">Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
}