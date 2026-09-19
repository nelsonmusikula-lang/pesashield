import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { 
  Shield, 
  DollarSign, 
  TrendingUp, 
  User, 
  Trash2, 
  Plus, 
  AlertTriangle,
  Info,
  X
} from "lucide-react";

// Helper: Amortization Calculator for Avalanche & Snowball strategies
function calculatePayoffStrategy(debtsList, extraPayload, strategyType) {
  if (!debtsList || debtsList.length === 0) {
    return { months: 0, totalInterest: 0, month1Payments: {} };
  }

  // Clone debts so original state isn't mutated
  let debts = debtsList.map(d => ({ ...d, currentBalance: Number(d.balance) || 0 }));
  
  // Sort debts based on strategy
  if (strategyType === "avalanche") {
    debts.sort((a, b) => b.apr - a.apr); // Highest APR first
  } else if (strategyType === "snowball") {
    debts.sort((a, b) => a.balance - b.balance); // Smallest Balance first
  }

  let totalInterest = 0;
  let month = 0;
  let month1Payments = {};
  const maxMonths = 360; // Safety cap (30 years)

  while (debts.some(d => d.currentBalance > 0) && month < maxMonths) {
    month++;
    let availableExtra = parseFloat(extraPayload) || 0;

    // 1. Accrue monthly interest
    debts.forEach(d => {
      if (d.currentBalance > 0) {
        const monthlyInterest = (d.currentBalance * (d.apr / 100)) / 12;
        d.currentBalance += monthlyInterest;
        totalInterest += monthlyInterest;
      }
    });

    // 2. Apply minimum payments
    debts.forEach(d => {
      if (d.currentBalance > 0) {
        const minPay = Number(d.min_payment) || 0;
        const payAmount = Math.min(d.currentBalance, minPay);
        d.currentBalance -= payAmount;
        if (month === 1) {
          month1Payments[d.id] = (month1Payments[d.id] || 0) + payAmount;
        }
      }
    });

    // 3. Apply extra payload to priority debt target
    for (let d of debts) {
      if (d.currentBalance > 0 && availableExtra > 0) {
        const extraPay = Math.min(d.currentBalance, availableExtra);
        d.currentBalance -= extraPay;
        availableExtra -= extraPay;
        if (month === 1) {
          month1Payments[d.id] = (month1Payments[d.id] || 0) + extraPay;
        }
      }
    }
  }

  return { months: month, totalInterest: Math.round(totalInterest), month1Payments };
}

// Bottom Navigation Bar
function BottomNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center max-w-md mx-auto z-40">
      <Link to="/" className={`flex flex-col items-center text-xs font-medium ${isActive("/") ? "text-emerald-600 font-bold" : "text-gray-400 hover:text-gray-600"}`}>
        <Shield className="w-5 h-5 mb-0.5" />
        <span>Shield</span>
      </Link>

      <Link to="/debts" className={`flex flex-col items-center text-xs font-medium ${isActive("/debts") ? "text-emerald-600 font-bold" : "text-gray-400 hover:text-gray-600"}`}>
        <DollarSign className="w-5 h-5 mb-0.5" />
        <span>Debts</span>
      </Link>

      <Link to="/strategy" className={`flex flex-col items-center text-xs font-medium ${isActive("/strategy") ? "text-emerald-600 font-bold" : "text-gray-400 hover:text-gray-600"}`}>
        <TrendingUp className="w-5 h-5 mb-0.5" />
        <span>Payoff</span>
      </Link>

      <Link to="/profile" className={`flex flex-col items-center text-xs font-medium ${isActive("/profile") ? "text-emerald-600 font-bold" : "text-gray-400 hover:text-gray-600"}`}>
        <User className="w-5 h-5 mb-0.5" />
        <span>Profile</span>
      </Link>
    </div>
  );
}

// Header Component
function Header() {
  return (
    <div className="flex justify-between items-center mb-6 pt-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
          <Shield className="w-5 h-5 fill-current text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">PESASHIELD</h1>
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">Financial Protection & Strategy</p>
        </div>
      </div>

      <div className="text-right">
        <p className="text-[10px] text-gray-400">User Profile</p>
        <p className="text-xs font-bold text-gray-800">Amani</p>
      </div>
    </div>
  );
}

// 1. Shield View
function ShieldView() {
  return (
    <div className="space-y-4 pb-20">
      <Header />

      <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-medium text-gray-600">
        <button className="flex-1 py-1.5 rounded-lg bg-white shadow-sm text-center font-bold text-gray-800 flex justify-center items-center gap-1">
          <Shield className="w-3.5 h-3.5" /> Overview
        </button>
        <button className="flex-1 py-1.5 rounded-lg text-center hover:text-gray-800">
          History
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Moderate Debt Burden</span>
        </div>
        <p className="text-xs text-amber-700/90 leading-relaxed">
          Debt is consuming a significant portion of income. Limit discretionary spend and avoid new loans.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 p-3.5 rounded-2xl shadow-sm">
          <p className="text-[11px] text-purple-600 font-medium mb-1">Acceleration Surplus</p>
          <p className="text-sm font-bold text-gray-900">TSh 45,000</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Monthly debt payload</p>
        </div>

        <div className="bg-white border border-gray-100 p-3.5 rounded-2xl shadow-sm">
          <p className="text-[11px] text-emerald-600 font-medium mb-1">Safe Daily Spend</p>
          <p className="text-sm font-bold text-gray-900">TSh 1,500</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Discretionary safe cap</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-gray-800">Income & Allocation</h2>

        <div className="flex justify-center items-center relative py-4">
          <div className="w-44 h-44 rounded-full border-[18px] border-sky-400 border-t-rose-500 border-r-amber-400 flex flex-col justify-center items-center">
            <span className="text-[9px] font-bold text-gray-400 tracking-wider">NET INCOME</span>
            <span className="text-xs font-extrabold text-gray-900">TSh 1,200,000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Debts View
function DebtsView({ debts, setDebts, loading }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activePaymentDebt, setActivePaymentDebt] = useState(null);

  // Form states
  const [newDebtName, setNewDebtName] = useState("");
  const [newDebtType, setNewDebtType] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [newMinPayment, setNewMinPayment] = useState("");
  const [newApr, setNewApr] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const totalOutstanding = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
  const totalMinObligations = debts.reduce((sum, d) => sum + (Number(d.min_payment) || 0), 0);

  // Add Debt to Supabase
  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!newDebtName || !newBalance) return;

    const newEntry = {
      name: newDebtName,
      type: newDebtType || "Loan",
      balance: parseFloat(newBalance) || 0,
      min_payment: parseFloat(newMinPayment) || 0,
      apr: parseFloat(newApr) || 0,
    };

    const { data, error } = await supabase
      .from("debts")
      .insert([newEntry])
      .select();

    if (error) {
      alert("Error adding debt: " + error.message);
    } else if (data) {
      setDebts([...debts, data[0]]);
      setNewDebtName("");
      setNewDebtType("");
      setNewBalance("");
      setNewMinPayment("");
      setNewApr("");
      setIsAddModalOpen(false);
    }
  };

  // Delete Debt from Supabase
  const handleDeleteDebt = async (id) => {
    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error deleting debt: " + error.message);
    } else {
      setDebts(debts.filter((d) => d.id !== id));
    }
  };

  // Log Payment to Supabase
  const handleLogPayment = async (e) => {
    e.preventDefault();
    if (!activePaymentDebt || !paymentAmount) return;

    const payVal = parseFloat(paymentAmount) || 0;
    const newBal = Math.max(0, activePaymentDebt.balance - payVal);

    const { data, error } = await supabase
      .from("debts")
      .update({ balance: newBal })
      .eq("id", activePaymentDebt.id)
      .select();

    if (error) {
      alert("Error updating balance: " + error.message);
    } else if (data) {
      setDebts(debts.map((d) => (d.id === activePaymentDebt.id ? data[0] : d)));
      setPaymentAmount("");
      setActivePaymentDebt(null);
    }
  };

  return (
    <div className="space-y-4 pb-20 relative">
      <Header />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-gray-900">Your Debts</h2>
          <p className="text-[10px] text-gray-400">Track balance, APRs, and min payments</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm hover:bg-slate-800 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Debt
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-sm">
          <p className="text-[10px] text-gray-400 mb-1">Total Outstanding</p>
          <p className="text-xs font-bold">TSh {totalOutstanding.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-gray-100 p-3.5 rounded-2xl shadow-sm">
          <p className="text-[10px] text-gray-400 mb-1">Min Monthly Obligations</p>
          <p className="text-xs font-bold text-gray-900">TSh {totalMinObligations.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
            Loading debts from Supabase...
          </div>
        ) : debts.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
            No active debts recorded. Click "+ Add Debt" to create one.
          </div>
        ) : (
          debts.map((debt) => (
            <div key={debt.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{debt.name}</h3>
                  <p className="text-[10px] text-gray-400">{debt.type}</p>
                </div>
                <button
                  onClick={() => handleDeleteDebt(debt.id)}
                  className="text-gray-400 hover:text-red-500 transition"
                  title="Delete Debt"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left">
                <div>
                  <p className="text-[9px] text-gray-400">Balance</p>
                  <p className="text-xs font-bold text-gray-900">TSh {Number(debt.balance).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400">Min Payment</p>
                  <p className="text-xs font-bold text-gray-900">TSh {Number(debt.min_payment).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400">APR Rate</p>
                  <p className="text-xs font-bold text-amber-600">{debt.apr}%</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActivePaymentDebt(debt);
                  setPaymentAmount((debt.min_payment || 0).toString());
                }}
                className="w-full bg-slate-900 text-white text-xs font-medium py-2 rounded-xl flex justify-center items-center gap-1.5 shadow-sm hover:bg-slate-800 transition"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Log Payment
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add New Debt */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-gray-900">Add New Debt</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Debt Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bank Loan"
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Provider / Category</label>
                <input
                  type="text"
                  placeholder="e.g. CRDB / M-Pawa"
                  value={newDebtType}
                  onChange={(e) => setNewDebtType(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Balance (TSh)</label>
                  <input
                    type="number"
                    placeholder="1000000"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Min Pay (TSh)</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={newMinPayment}
                    onChange={(e) => setNewMinPayment(e.target.value)}
                    className="w-full p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">APR Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="18.5"
                  value={newApr}
                  onChange={(e) => setNewApr(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white text-xs font-medium py-2.5 rounded-xl shadow-sm hover:bg-slate-800 transition mt-2"
              >
                Save Debt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Payment */}
      {activePaymentDebt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-gray-900">Log Payment</h3>
                <p className="text-[10px] text-gray-400">{activePaymentDebt.name}</p>
              </div>
              <button onClick={() => setActivePaymentDebt(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="space-y-3">
              <div className="bg-gray-50 p-2.5 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-gray-500">
                  <span>Current Balance:</span>
                  <span className="font-bold text-gray-900">TSh {Number(activePaymentDebt.balance).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Payment Amount (TSh)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 text-xs font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white text-xs font-medium py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition"
              >
                Confirm Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Dynamic Strategy View
function StrategyView({ debts }) {
  const [extraPayload, setExtraPayload] = useState(45000);
  const [selectedStrategy, setSelectedStrategy] = useState("avalanche");

  const avalancheResults = calculatePayoffStrategy(debts, extraPayload, "avalanche");
  const snowballResults = calculatePayoffStrategy(debts, extraPayload, "snowball");

  const activeResults = selectedStrategy === "avalanche" ? avalancheResults : snowballResults;
  const savings = Math.max(0, snowballResults.totalInterest - avalancheResults.totalInterest);

  return (
    <div className="space-y-4 pb-20">
      <Header />

      <div>
        <h2 className="text-base font-bold text-gray-900">Payoff Strategy Engine</h2>
        <p className="text-[10px] text-gray-400">Compare Avalanche (Interest-focused) vs Snowball (Psychological Wins)</p>
      </div>

      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-500 font-medium">Extra Monthly Payload (TSh)</span>
          <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Shield Surplus: TSh 45,000</span>
        </div>
        <input 
          type="number" 
          value={extraPayload}
          onChange={(e) => setExtraPayload(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-full p-2.5 text-xs font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Avalanche Card */}
        <div 
          onClick={() => setSelectedStrategy("avalanche")}
          className={`cursor-pointer p-3.5 rounded-2xl border transition ${
            selectedStrategy === "avalanche" 
              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-sm" 
              : "bg-amber-50/30 border-amber-200/50 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center gap-1 text-amber-700 font-bold text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Avalanche</span>
          </div>
          <p className="text-[9px] text-gray-400">Highest APR First</p>
          
          <div className="mt-2">
            <p className="text-[9px] text-gray-400">Time to Free</p>
            <p className="text-xs font-bold text-gray-900">{avalancheResults.months} mos</p>
          </div>
          <div className="mt-1">
            <p className="text-[9px] text-gray-400">Total Interest</p>
            <p className="text-xs font-bold text-amber-600">TSh {avalancheResults.totalInterest.toLocaleString()}</p>
          </div>
        </div>

        {/* Snowball Card */}
        <div 
          onClick={() => setSelectedStrategy("snowball")}
          className={`cursor-pointer p-3.5 rounded-2xl border transition ${
            selectedStrategy === "snowball" 
              ? "bg-sky-50/80 border-sky-400 ring-2 ring-sky-400/20 shadow-sm" 
              : "bg-sky-50/30 border-sky-100 hover:border-sky-200"
          }`}
        >
          <div className="flex items-center gap-1 text-sky-700 font-bold text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Snowball</span>
          </div>
          <p className="text-[9px] text-gray-400">Smallest Balance First</p>
          
          <div className="mt-2">
            <p className="text-[9px] text-gray-400">Time to Free</p>
            <p className="text-xs font-bold text-gray-900">{snowballResults.months} mos</p>
          </div>
          <div className="mt-1">
            <p className="text-[9px] text-gray-400">Total Interest</p>
            <p className="text-xs font-bold text-sky-600">TSh {snowballResults.totalInterest.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-sky-50/80 border border-sky-100 p-3 rounded-2xl flex items-center gap-2 text-sky-800 text-xs">
        <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
        <span>
          {savings > 0 
            ? `Avalanche saves you TSh ${savings.toLocaleString()} in total interest compared to Snowball.`
            : "Both strategies perform equally for your current balances."}
        </span>
      </div>

      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">MONTH 1 TARGET PAYMENTS</h3>
          <span className="text-[10px] font-bold text-gray-500 capitalize">{selectedStrategy} Mode</span>
        </div>
        
        <div className="space-y-2.5 text-xs">
          {debts.map((debt) => {
            const minPay = Number(debt.min_payment) || 0;
            const totalTarget = activeResults.month1Payments[debt.id] || minPay;
            const extraPart = totalTarget - minPay;

            return (
              <div key={debt.id} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold text-gray-900">{debt.name}</p>
                  <p className="text-[9px] text-gray-400">Min: TSh {minPay.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">TSh {Math.round(totalTarget).toLocaleString()}</p>
                  {extraPart > 0 && (
                    <p className="text-[9px] text-emerald-600 font-medium">+TSh {Math.round(extraPart).toLocaleString()} extra</p>
                  )}
                </div>
              </div>
            );
          })}

          {debts.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Add debts in the Debts tab to calculate payments.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 4. Profile View
function ProfileView() {
  return (
    <div className="space-y-4 pb-20">
      <Header />

      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <div>
            <p className="text-gray-400 text-[9px]">Living Costs</p>
            <p className="text-gray-900">TSh 780,000</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <div>
            <p className="text-gray-400 text-[9px]">Min Debt Pay</p>
            <p className="text-gray-900">TSh 275,000</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <div>
            <p className="text-gray-400 text-[9px]">Safety Buffer</p>
            <p className="text-gray-900">TSh 100,000</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <div>
            <p className="text-gray-400 text-[9px]">Extra Surplus</p>
            <p className="text-gray-900">TSh 45,000</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-gray-800">Adjust Essentials</h3>

        <div>
          <label className="text-[10px] font-medium text-gray-400 block mb-1">Monthly Net Income (TSh)</label>
          <input 
            type="text" 
            defaultValue="1200000" 
            className="w-full p-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-gray-400 block mb-1">Housing</label>
            <input 
              type="text" 
              defaultValue="350000" 
              className="w-full p-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-gray-400 block mb-1">Food / Grocery</label>
            <input 
              type="text" 
              defaultValue="250000" 
              className="w-full p-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-gray-400 block mb-1">Utilities / Airtime</label>
            <input 
              type="text" 
              defaultValue="80000" 
              className="w-full p-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-gray-400 block mb-1">Transport</label>
            <input 
              type="text" 
              defaultValue="100000" 
              className="w-full p-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium text-gray-400 block mb-1">Emergency Buffer (TSh)</label>
          <input 
            type="text" 
            defaultValue="100000" 
            className="w-full p-2.5 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>
      </div>
    </div>
  );
}

// Main App Shell
export default function App() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch debts from Supabase database
  useEffect(() => {
    fetchDebts();
  }, []);

  async function fetchDebts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .order("id", { ascending: true });

      if (error) console.error("Error fetching debts:", error.message);
      else setDebts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex justify-center items-start pt-4 pb-12 font-sans">
        <div className="w-full max-w-md bg-white border border-gray-200 min-h-[90vh] rounded-3xl p-4 shadow-xl relative overflow-hidden">
          <Routes>
            <Route path="/" element={<ShieldView />} />
            <Route path="/debts" element={<DebtsView debts={debts} setDebts={setDebts} loading={loading} />} />
            <Route path="/strategy" element={<StrategyView debts={debts} />} />
            <Route path="/profile" element={<ProfileView />} />
          </Routes>
          <BottomNav />
        </div>
      </div>
    </Router>
  );
}