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

  // Budget & Profile State
  const [netIncome, setNetIncome] = useState(12000000);
  const [housing, setHousing] = useState(1000000);
  const [food, setFood] = useState(250000);
  const [utilities, setUtilities] = useState(200000);
  const [transport, setTransport] = useState(400000);
  const [emergencyBuffer, setEmergencyBuffer] = useState(100000);

  // Dynamic Custom Essentials
  const [customEssentials, setCustomEssentials] = useState([]);
  const [newEssentialName, setNewEssentialName] = useState('');
  const [newEssentialAmount, setNewEssentialAmount] = useState('');

  // Debts State (with Payment Logs)
  const [debts, setDebts] = useState([
    { 
      id: 1, 
      name: 'K-Finance', 
      balance: 10000000, 
      minPayment: 1300000, 
      apr: 18, 
      durationMonths: 12,
      payments: [] 
    },
    { 
      id: 2, 
      name: 'Helen', 
      balance: 4000000, 
      minPayment: 500000, 
      apr: 10, 
      durationMonths: 10,
      payments: [] 
    }
  ]);
  
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtBalance, setNewDebtBalance] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');
  const [newDebtApr, setNewDebtApr] = useState('');
  const [newDebtDuration, setNewDebtDuration] = useState('');

  // Payment Logging Input State
  const [paymentInput, setPaymentInput] = useState({});

  // Payoff Strategy State
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche');

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
  const baseLivingCosts = housing + food + utilities + transport;
  const customEssentialsTotal = customEssentials.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalLivingCosts = baseLivingCosts + customEssentialsTotal;
  
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
      durationMonths: Number(newDebtDuration || 12),
      payments: [],
      user_id: session.user.id
    };
    setDebts([...debts, debtObj]);
    setNewDebtName('');
    setNewDebtBalance('');
    setNewDebtMin('');
    setNewDebtApr('');
    setNewDebtDuration('');
  };

  const handleDeleteDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const handleLogPayment = (debtId) => {
    const amountPaid = Number(paymentInput[debtId]);
    if (!amountPaid || amountPaid <= 0) return;

    const currentMonth = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });

    setDebts(debts.map(debt => {
      if (debt.id === debtId) {
        const newBalance = Math.max(0, debt.balance - amountPaid);
        const newPaymentRecord = {
          id: Date.now(),
          month: currentMonth,
          amount: amountPaid
        };
        return {
          ...debt,
          balance: newBalance,
          payments: [newPaymentRecord, ...(debt.payments || [])]
        };
      }
      return debt;
    }));

    // Clear input for this specific debt
    setPaymentInput({ ...paymentInput, [debtId]: '' });
  };

  const handleAddEssential = (e) => {
    e.preventDefault();
    if (!newEssentialName || !newEssentialAmount) return;
    setCustomEssentials([...customEssentials, { id: Date.now(), name: newEssentialName, amount: Number(newEssentialAmount) }]);
    setNewEssentialName('');
    setNewEssentialAmount('');
  };

  const handleDeleteEssential = (id) => {
    setCustomEssentials(customEssentials.filter(item => item.id !== id));
  };

  // Strategy sorting
  const sortedDebts = [...debts].sort((a, b) => {
    if (selectedStrategy === 'avalanche') {
      return b.apr - a.apr;
    } else {
      return a.balance - b.balance;
    }
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border border-gray-100 relative pb-20">
        
        {/* App Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
              <h1 className="font-extrabold text-slate-900 tracking-wider text-xs">PESASHIELD</h1>
            </div>
            <p className="text-[9px] text-gray-400 font-medium">{session.user.email}</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition shadow-sm"
          >
            Log Out
          </button>
        </div>

        {/* Views */}
        <div className="p-5 flex-1 overflow-y-auto">
          
          {/* SHIELD TAB */}
          {activeTab === 'shield' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-amber-900 flex items-center space-x-1 mb-1">
                  <span>⚠️</span> <span>Moderate Debt Burden</span>
                </h3>
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  Debt is consuming a significant portion of income. Limit discretionary spend and follow your chosen payoff roadmap.
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
                  <span className="text-sm font-extrabold text-slate-900">TSH 3,500</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Discretionary safe cap</span>
                </div>
              </div>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-800 mb-3">Income & Allocation Overview</h4>
                <div className="flex flex-col items-center justify-center py-2 relative">
                  <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">NET INCOME</span>
                    <span className="text-xs font-black text-slate-900">TSH {netIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEBTS & PAYMENT LOG TAB */}
          {activeTab === 'debts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase">Debts & Monthly Payment Log</h3>
                <p className="text-[10px] text-gray-400">Log payments to automatically deduct remaining balances</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Outstanding</span>
                  <span className="text-xs font-extrabold">TSH {totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Min Monthly Obligations</span>
                  <span className="text-xs font-extrabold text-slate-900">TSH {totalMinDebt.toLocaleString()}</span>
                </div>
              </div>

              {/* Add Debt Form */}
              <form onSubmit={handleAddDebt} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase">Add New Debt</span>
                <input type="text" placeholder="Lender / Debt Name" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="Balance (TSH)" value={newDebtBalance} onChange={(e) => setNewDebtBalance(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" required />
                  <input type="number" placeholder="Min Pay (TSH)" value={newDebtMin} onChange={(e) => setNewDebtMin(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" required />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="APR %" value={newDebtApr} onChange={(e) => setNewDebtApr(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                  <input type="number" placeholder="Duration (Months)" value={newDebtDuration} onChange={(e) => setNewDebtDuration(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                </div>
                <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Add Debt</button>
              </form>

              {/* Debts List with Payment Logs */}
              <div className="space-y-3">
                {debts.map(debt => {
                  const duration = debt.durationMonths || 12;
                  const endDate = new Date();
                  endDate.setMonth(endDate.getMonth() + duration);
                  const formattedEndDate = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                  return (
                    <div key={debt.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-3 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{debt.name}</h4>
                          <div className="grid grid-cols-2 gap-x-4 mt-1 text-[10px] text-gray-500">
                            <span>Balance: <b className="text-slate-900">TSH {debt.balance.toLocaleString()}</b></span>
                            <span>Min Pay: <b>TSH {debt.minPayment.toLocaleString()}</b></span>
                            <span className="text-emerald-700">Duration: <b>{duration} mos</b></span>
                            <span className="text-indigo-600">End Date: <b>{formattedEndDate}</b></span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteDebt(debt.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                      </div>

                      {/* Log Payment Input Box */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2">
                        <input 
                          type="number" 
                          placeholder="Amount paid this month" 
                          value={paymentInput[debt.id] || ''} 
                          onChange={(e) => setPaymentInput({ ...paymentInput, [debt.id]: e.target.value })} 
                          className="flex-1 px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                        />
                        <button 
                          onClick={() => handleLogPayment(debt.id)} 
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          Log Payment
                        </button>
                      </div>

                      {/* Payment History Log Display */}
                      {debt.payments && debt.payments.length > 0 && (
                        <div className="border-t border-gray-100 pt-2 space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Payment History</span>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {debt.payments.map(p => (
                              <div key={p.id} className="flex justify-between items-center text-[10px] bg-emerald-50/50 px-2 py-1 rounded-lg text-slate-700">
                                <span>📅 {p.month}</span>
                                <span className="font-bold text-emerald-800">- TSH {p.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAYOFF STRATEGY TAB */}
          {activeTab === 'payoff' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase">Payoff Strategy Engine</h3>
                <p className="text-[10px] text-gray-400">Click strategy card to select your roadmap</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Extra Monthly Payload</span>
                <span className="text-xs font-black text-emerald-900">TSH {extraSurplus.toLocaleString()}</span>
              </div>

              {/* Clickable Strategy Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => setSelectedStrategy('avalanche')}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition ${selectedStrategy === 'avalanche' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300' : 'bg-slate-50 border-slate-100'}`}
                >
                  <span className="text-[10px] font-bold text-amber-900 block mb-0.5">🔥 Avalanche</span>
                  <span className="text-[9px] text-gray-500 block mb-1">Highest APR First</span>
                  <span className="text-xs font-extrabold text-slate-900">12 mos to free</span>
                </div>

                <div 
                  onClick={() => setSelectedStrategy('snowball')}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition ${selectedStrategy === 'snowball' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300' : 'bg-slate-50 border-slate-100'}`}
                >
                  <span className="text-[10px] font-bold text-blue-900 block mb-0.5">❄️ Snowball</span>
                  <span className="text-[9px] text-gray-500 block mb-1">Smallest Balance First</span>
                  <span className="text-xs font-extrabold text-slate-900">13 mos to free</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Active Roadmap: {selectedStrategy === 'avalanche' ? '🔥 Avalanche Strategy' : '❄️ Snowball Strategy'}
                </h4>
                
                <div className="space-y-2">
                  {sortedDebts.map((debt, index) => (
                    <div key={debt.id} className="bg-white border border-gray-100 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{debt.name}</span>
                        <div className="text-[10px] text-gray-400">Min: TSH {debt.minPayment.toLocaleString()} {index === 0 && <span className="text-emerald-600 font-bold ml-1">(+ Extra Target)</span>}</div>
                      </div>
                      <span className="font-extrabold text-slate-800">
                        TSH {(debt.minPayment + (index === 0 ? extraSurplus : 0)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROFILE & ESSENTIALS TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-gray-100 text-xs">
                <div><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block mr-1"></span> Living Costs <br/><b>TSH {totalLivingCosts.toLocaleString()}</b></div>
                <div><span className="w-2 h-2 rounded-full bg-rose-500 inline-block mr-1"></span> Min Debt Pay <br/><b>TSH {totalMinDebt.toLocaleString()}</b></div>
                <div><span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1"></span> Safety Buffer <br/><b>TSH {emergencyBuffer.toLocaleString()}</b></div>
                <div><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1"></span> Extra Surplus <br/><b>TSH {extraSurplus.toLocaleString()}</b></div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Adjust Essentials & Income</h4>
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

              {/* Add Missing Essentials Option */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Add Missing Essential Categories</h4>
                <form onSubmit={handleAddEssential} className="space-y-2">
                  <input type="text" placeholder="Essential Name (e.g., Insurance, Medical)" value={newEssentialName} onChange={(e) => setNewEssentialName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                  <input type="number" placeholder="Monthly Amount (TSH)" value={newEssentialAmount} onChange={(e) => setNewEssentialAmount(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                  <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Add Essential</button>
                </form>

                {customEssentials.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {customEssentials.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-xl text-xs">
                        <span>{item.name}: <b>TSH {item.amount.toLocaleString()}</b></span>
                        <button onClick={() => handleDeleteEssential(item.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation */}
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