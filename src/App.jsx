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

  // Income Sources State
  const [incomeSources, setIncomeSources] = useState([]);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');

  // Budget & Profile State
  const [profileId, setProfileId] = useState(null);
  const [housing, setHousing] = useState(0);
  const [food, setFood] = useState(0);
  const [utilities, setUtilities] = useState(0);
  const [transport, setTransport] = useState(0);
  const [emergencyBuffer, setEmergencyBuffer] = useState(0);

  // Dynamic Custom Essentials
  const [customEssentials, setCustomEssentials] = useState([]);
  const [newEssentialName, setNewEssentialName] = useState('');
  const [newEssentialAmount, setNewEssentialAmount] = useState('');

  // Debts State
  const [debts, setDebts] = useState([]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtBalance, setNewDebtBalance] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');
  const [newDebtApr, setNewDebtApr] = useState('');
  const [newDebtDuration, setNewDebtDuration] = useState('');
  const [newDebtDueDay, setNewDebtDueDay] = useState('');

  // Payment Logging Input State
  const [paymentInput, setPaymentInput] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'short', year: 'numeric' }));

  // Payoff Strategy State
  const [selectedStrategy, setSelectedStrategy] = useState('avalanche');

  // Notification Status State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      // 1. Fetch Profile / Budget Costs
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfileId(profileData.id);
        setHousing(profileData.housing || 0);
        setFood(profileData.food || 0);
        setUtilities(profileData.utilities || 0);
        setTransport(profileData.transport || 0);
        setEmergencyBuffer(profileData.emergency_buffer || 0);
      } else {
        // Create initial clean profile row at zero
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ user_id: userId, housing: 0, food: 0, utilities: 0, transport: 0, emergency_buffer: 0 }])
          .select()
          .single();
        if (newProfile) setProfileId(newProfile.id);
      }

      // 2. Fetch Income Sources (Starts empty if none added yet)
      const { data: incomeData } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId);
      if (incomeData) setIncomeSources(incomeData);

      // 3. Fetch Custom Essentials
      const { data: essentialData } = await supabase
        .from('custom_essentials')
        .select('*')
        .eq('user_id', userId);
      if (essentialData) setCustomEssentials(essentialData);

      // 4. Fetch Debts (Starts empty if none added yet)
      const { data: debtData } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', userId);
      if (debtData) setDebts(debtData);

    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 font-medium">Loading PesaShield...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={(user) => { setSession({ user }); fetchUserData(user.id); }} />;
  }

  // Calculations
  const totalNetIncome = incomeSources.reduce((sum, item) => sum + Number(item.amount), 0);
  const baseLivingCosts = housing + food + utilities + transport;
  const customEssentialsTotal = customEssentials.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalLivingCosts = baseLivingCosts + customEssentialsTotal;
  
  const totalMinDebt = debts.reduce((sum, d) => sum + Number(d.min_payment || d.minPayment), 0);
  const totalOutstanding = debts.reduce((sum, d) => sum + Number(d.balance), 0);
  const disposableIncome = totalNetIncome - (totalLivingCosts + totalMinDebt + emergencyBuffer);

  const pendingDebtsCount = debts.filter(debt => {
    const paidThisMonth = debt.payments?.some(p => p.month === selectedMonth);
    return !paidThisMonth && debt.balance > 0;
  }).length;

  const requestBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      new Notification("PesaShield Reminders Enabled", {
        body: "You will now receive alerts for upcoming debt due dates and monthly payments.",
        icon: "/favicon.ico"
      });
    } else {
      alert("Notification permission denied.");
    }
  };

  const handleAddIncomeSource = async (e) => {
    e.preventDefault();
    if (!newIncomeName || !newIncomeAmount) return;
    const newSource = { name: newIncomeName, amount: Number(newIncomeAmount), user_id: session.user.id };
    
    const { data, error } = await supabase.from('income_sources').insert([newSource]).select().single();
    if (!error && data) {
      setIncomeSources([...incomeSources, data]);
      setNewIncomeName('');
      setNewIncomeAmount('');
    }
  };

  const handleDeleteIncomeSource = async (id) => {
    const { error } = await supabase.from('income_sources').delete().eq('id', id);
    if (!error) {
      setIncomeSources(incomeSources.filter(item => item.id !== id));
    }
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!newDebtName || !newDebtBalance) return;
    const debtObj = {
      name: newDebtName,
      balance: Number(newDebtBalance),
      min_payment: Number(newDebtMin || 0),
      apr: Number(newDebtApr || 0),
      duration_months: Number(newDebtDuration || 12),
      due_day: Number(newDebtDueDay || 28),
      payments: [],
      user_id: session.user.id
    };

    const { data, error } = await supabase.from('debts').insert([debtObj]).select().single();
    if (!error && data) {
      setDebts([...debts, data]);
      setNewDebtName('');
      setNewDebtBalance('');
      setNewDebtMin('');
      setNewDebtApr('');
      setNewDebtDuration('');
      setNewDebtDueDay('');
    }
  };

  const handleDeleteDebt = async (id) => {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      setDebts(debts.filter(d => d.id !== id));
    }
  };

  const handleLogPayment = async (debtId) => {
    const amountPaid = Number(paymentInput[debtId]);
    if (!amountPaid || amountPaid <= 0) return;

    const targetDebt = debts.find(d => d.id === debtId);
    if (!targetDebt) return;

    const newBalance = Math.max(0, targetDebt.balance - amountPaid);
    const newPaymentRecord = {
      id: Date.now(),
      month: selectedMonth,
      amount: amountPaid
    };
    const updatedPayments = [newPaymentRecord, ...(targetDebt.payments || [])];

    const { error } = await supabase
      .from('debts')
      .update({ balance: newBalance, payments: updatedPayments })
      .eq('id', debtId);

    if (!error) {
      setDebts(debts.map(debt => {
        if (debt.id === debtId) {
          if (notificationsEnabled && "Notification" in window) {
            new Notification(`Payment Logged: ${debt.name}`, {
              body: `Successfully recorded TSH ${amountPaid.toLocaleString()} for ${selectedMonth}. Remaining balance: TSH ${newBalance.toLocaleString()}`
            });
          }
          return { ...debt, balance: newBalance, payments: updatedPayments };
        }
        return debt;
      }));
      setPaymentInput({ ...paymentInput, [debtId]: '' });
    }
  };

  const handleAddEssential = async (e) => {
    e.preventDefault();
    if (!newEssentialName || !newEssentialAmount) return;
    const newEss = { name: newEssentialName, amount: Number(newEssentialAmount), user_id: session.user.id };

    const { data, error } = await supabase.from('custom_essentials').insert([newEss]).select().single();
    if (!error && data) {
      setCustomEssentials([...customEssentials, data]);
      setNewEssentialName('');
      setNewEssentialAmount('');
    }
  };

  const handleDeleteEssential = async (id) => {
    const { error } = await supabase.from('custom_essentials').delete().eq('id', id);
    if (!error) {
      setCustomEssentials(customEssentials.filter(item => item.id !== id));
    }
  };

  const updateProfileField = async (field, value) => {
    const updates = { [field]: value, user_id: session.user.id };
    if (profileId) {
      await supabase.from('profiles').update(updates).eq('id', profileId);
    } else {
      const { data } = await supabase.from('profiles').insert([updates]).select().single();
      if (data) setProfileId(data.id);
    }
  };

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
              
              <div className={`border rounded-2xl p-4 transition ${pendingDebtsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`text-xs font-bold flex items-center space-x-1 ${pendingDebtsCount > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                    <span>{pendingDebtsCount > 0 ? '🔔' : '✅'}</span> 
                    <span>{pendingDebtsCount > 0 ? `${pendingDebtsCount} Payment(s) Due for ${selectedMonth}` : `All Payments Settled for ${selectedMonth}`}</span>
                  </h3>
                  {!notificationsEnabled && (
                    <button 
                      onClick={requestBrowserNotifications}
                      className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm"
                    >
                      Enable Push Alerts
                    </button>
                  )}
                </div>
                <p className={`text-[11px] ${pendingDebtsCount > 0 ? 'text-amber-800/80' : 'text-emerald-800/80'}`}>
                  {pendingDebtsCount > 0 
                    ? 'Check your Debts tab to log payments and keep your payment streaks active.' 
                    : debts.length === 0 ? 'Add your income and debts in the Profile & Debts tabs to begin!' : 'Fantastic job! Your active debt reminders and milestones are fully up to date.'}
                </p>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Gross Income</span>
                  <span className="text-xs font-bold text-emerald-400">TSH {totalNetIncome.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 space-y-1 text-[11px] text-slate-300">
                  <div className="flex justify-between"><span>Less Living Essentials:</span> <span className="text-rose-400">- TSH {totalLivingCosts.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Less Debt Minimums:</span> <span className="text-rose-400">- TSH {totalMinDebt.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Less Emergency Buffer:</span> <span className="text-amber-400">- TSH {emergencyBuffer.toLocaleString()}</span></div>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">Net Disposable Income</span>
                  <span className="text-sm font-black text-emerald-400">TSH {disposableIncome.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">Acceleration Surplus</span>
                  <span className="text-sm font-extrabold text-slate-900">TSH {disposableIncome.toLocaleString()}</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Available for debt payload</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Safe Daily Spend</span>
                  <span className="text-sm font-extrabold text-slate-900">TSH {Math.max(0, Math.round(disposableIncome / 30)).toLocaleString()}</span>
                  <span className="text-[9px] text-gray-400 block mt-0.5">Daily discretionary limit</span>
                </div>
              </div>
            </div>
          )}

          {/* DEBTS & REMINDERS TAB */}
          {activeTab === 'debts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase">Debts & Payment Reminders</h3>
                <p className="text-[10px] text-gray-400">Track due dates, log monthly payments, and trigger notifications</p>
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

              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-900 uppercase">Target Payment Month:</span>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-indigo-200 px-3 py-1 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none"
                >
                  <option value="Jan 2026">Jan 2026</option>
                  <option value="Feb 2026">Feb 2026</option>
                  <option value="Mar 2026">Mar 2026</option>
                  <option value="Apr 2026">Apr 2026</option>
                  <option value="May 2026">May 2026</option>
                  <option value="Jun 2026">Jun 2026</option>
                  <option value="Jul 2026">Jul 2026</option>
                  <option value="Aug 2026">Aug 2026</option>
                  <option value="Sep 2026">Sep 2026</option>
                  <option value="Oct 2026">Oct 2026</option>
                  <option value="Nov 2026">Nov 2026</option>
                  <option value="Dec 2026">Dec 2026</option>
                  <option value="Jan 2027">Jan 2027</option>
                  <option value="Feb 2027">Feb 2027</option>
                  <option value="Mar 2027">Mar 2027</option>
                  <option value="Apr 2027">Apr 2027</option>
                  <option value="May 2027">May 2027</option>
                  <option value="Jun 2027">Jun 2027</option>
                  <option value="Jul 2027">Jul 2027</option>
                  <option value="Aug 2027">Aug 2027</option>
                  <option value="Sep 2027">Sep 2027</option>
                  <option value="Oct 2027">Oct 2027</option>
                  <option value="Nov 2027">Nov 2027</option>
                  <option value="Dec 2027">Dec 2027</option>
                </select>
              </div>

              <form onSubmit={handleAddDebt} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase">Add New Debt & Due Day</span>
                <input type="text" placeholder="Lender / Debt Name" value={newDebtName} onChange={(e) => setNewDebtName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" placeholder="Balance (TSH)" value={newDebtBalance} onChange={(e) => setNewDebtBalance(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" required />
                  <input type="number" placeholder="Min Pay (TSH)" value={newDebtMin} onChange={(e) => setNewDebtMin(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" required />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <input type="number" placeholder="APR %" value={newDebtApr} onChange={(e) => setNewDebtApr(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                  <input type="number" placeholder="Duration (Mos)" value={newDebtDuration} onChange={(e) => setNewDebtDuration(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                  <input type="number" placeholder="Due Day (1-31)" value={newDebtDueDay} onChange={(e) => setNewDebtDueDay(e.target.value)} className="px-2 py-1.5 border rounded-lg text-xs" />
                </div>
                <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Add Debt</button>
              </form>

              <div className="space-y-3">
                {debts.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No debts added yet. Add your first debt above!</p>
                ) : (
                  debts.map(debt => {
                    const duration = debt.duration_months || debt.durationMonths || 12;
                    const dueDay = debt.due_day || debt.dueDay || 28;
                    const minPaymentVal = debt.min_payment || debt.minPayment || 0;
                    const isPaidThisMonth = debt.payments?.some(p => p.month === selectedMonth);

                    return (
                      <div key={debt.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-3 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs font-bold text-slate-800">{debt.name}</h4>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${isPaidThisMonth ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {isPaidThisMonth ? '✓ Paid this month' : `Due on day ${dueDay}`}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 mt-1 text-[10px] text-gray-500">
                              <span>Balance: <b className="text-slate-900">TSH {debt.balance.toLocaleString()}</b></span>
                              <span>Min Pay: <b>TSH {minPaymentVal.toLocaleString()}</b></span>
                              <span className="text-emerald-700">Duration: <b>{duration} mos</b></span>
                              <span className="text-indigo-600">Reminder: <b>Monthly on {dueDay}th</b></span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteDebt(debt.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2">
                          <input 
                            type="number" 
                            placeholder={`Pay amount for ${selectedMonth}`} 
                            value={paymentInput[debt.id] || ''} 
                            onChange={(e) => setPaymentInput({ ...paymentInput, [debt.id]: e.target.value })} 
                            className="flex-1 px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                          />
                          <button 
                            onClick={() => handleLogPayment(debt.id)} 
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                          >
                            Log
                          </button>
                        </div>

                        {debt.payments && debt.payments.length > 0 && (
                          <div className="border-t border-gray-100 pt-2 space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Payment Records</span>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {debt.payments.map(p => (
                                <div key={p.id} className="flex justify-between items-center text-[10px] bg-emerald-50/50 px-2.5 py-1 rounded-lg text-slate-700">
                                  <span className="font-semibold text-emerald-900">📅 {p.month}</span>
                                  <span className="font-bold text-emerald-800">- TSH {p.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
                <span className="text-xs font-black text-emerald-900">TSH {disposableIncome.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div 
                  onClick={() => setSelectedStrategy('avalanche')}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition ${selectedStrategy === 'avalanche' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300' : 'bg-slate-50 border-slate-100'}`}
                >
                  <span className="text-[10px] font-bold text-amber-900 block mb-0.5">🔥 Avalanche</span>
                  <span className="text-[9px] text-gray-500 block mb-1">Highest APR First</span>
                  <span className="text-xs font-extrabold text-slate-900">Optimized interest</span>
                </div>

                <div 
                  onClick={() => setSelectedStrategy('snowball')}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition ${selectedStrategy === 'snowball' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300' : 'bg-slate-50 border-slate-100'}`}
                >
                  <span className="text-[10px] font-bold text-blue-900 block mb-0.5">❄️ Snowball</span>
                  <span className="text-[9px] text-gray-500 block mb-1">Smallest Balance First</span>
                  <span className="text-xs font-extrabold text-slate-900">Quick wins</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Active Roadmap: {selectedStrategy === 'avalanche' ? '🔥 Avalanche Strategy' : '❄️ Snowball Strategy'}
                </h4>
                
                <div className="space-y-2">
                  {debts.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4">Add your debts to generate your automated payoff roadmap.</p>
                  ) : (
                    sortedDebts.map((debt, index) => {
                      const minPay = debt.min_payment || debt.minPayment || 0;
                      return (
                        <div key={debt.id} className="bg-white border border-gray-100 p-3 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{debt.name}</span>
                            <div className="text-[10px] text-gray-400">Min: TSH {minPay.toLocaleString()} {index === 0 && <span className="text-emerald-600 font-bold ml-1">(+ Extra Target)</span>}</div>
                          </div>
                          <span className="font-extrabold text-slate-800">
                            TSH {(minPay + (index === 0 ? disposableIncome : 0)).toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              
              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Sources of Income</h4>
                <form onSubmit={handleAddIncomeSource} className="space-y-2">
                  <input type="text" placeholder="Source Name (e.g., Salary, Consulting)" value={newIncomeName} onChange={(e) => setNewIncomeName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                  <input type="number" placeholder="Monthly Amount (TSH)" value={newIncomeAmount} onChange={(e) => setNewIncomeAmount(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                  <button type="submit" className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">Add Income Source</button>
                </form>

                <div className="space-y-2 pt-2">
                  {incomeSources.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-2">No income sources added yet.</p>
                  ) : (
                    incomeSources.map(source => (
                      <div key={source.id} className="flex justify-between items-center bg-slate-50 border border-gray-100 p-2.5 rounded-xl text-xs">
                        <span className="font-medium text-slate-800">{source.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-emerald-700">TSH {source.amount.toLocaleString()}</span>
                          <button onClick={() => handleDeleteIncomeSource(source.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Living Costs & Essentials</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Housing</label>
                    <input type="number" value={housing} onChange={(e) => { setHousing(Number(e.target.value)); updateProfileField('housing', Number(e.target.value)); }} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Food / Grocery</label>
                    <input type="number" value={food} onChange={(e) => { setFood(Number(e.target.value)); updateProfileField('food', Number(e.target.value)); }} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Utilities / Airtime</label>
                    <input type="number" value={utilities} onChange={(e) => { setUtilities(Number(e.target.value)); updateProfileField('utilities', Number(e.target.value)); }} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-semibold">Transport</label>
                    <input type="number" value={transport} onChange={(e) => { setTransport(Number(e.target.value)); updateProfileField('transport', Number(e.target.value)); }} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-semibold">Emergency Buffer (TSH)</label>
                  <input type="number" value={emergencyBuffer} onChange={(e) => { setEmergencyBuffer(Number(e.target.value)); updateProfileField('emergency_buffer', Number(e.target.value)); }} className="w-full mt-1 px-3 py-2 border rounded-xl text-xs font-medium" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Add Custom Essential Category</h4>
                <form onSubmit={handleAddEssential} className="space-y-2">
                  <input type="text" placeholder="Category Name (e.g., Insurance)" value={newEssentialName} onChange={(e) => setNewEssentialName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                  <input type="number" placeholder="Monthly Amount (TSH)" value={newEssentialAmount} onChange={(e) => setNewEssentialAmount(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs" required />
                  <button type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Add Category</button>
                </form>

                {customEssentials.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {customEssentials.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded-xl text-xs">
                        <span>{item.name}: <b>TSH {item.amount.toLocaleString()}</b></span>
                        <button onClick={() => handleDeleteEssential(item.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
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