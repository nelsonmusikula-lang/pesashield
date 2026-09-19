import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://whattksidsddgixhazxi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YDAnYAAolVL7ey5QC1cNhw_1Jv1Zi9O';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [profileId, setProfileId] = useState(null);
  const [incomeSources, setIncomeSources] = useState([]);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');

  const [housing, setHousing] = useState(0);
  const [food, setFood] = useState(0);
  const [utilities, setUtilities] = useState(0);
  const [transport, setTransport] = useState(0);
  const [emergencyBuffer, setEmergencyBuffer] = useState(0);

  const [debts, setDebts] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    // Use maybeSingle() to avoid 406 errors when profile doesn't exist yet
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
      setProfileId(null);
      setHousing(0);
      setFood(0);
      setUtilities(0);
      setTransport(0);
      setEmergencyBuffer(0);
    }

    const { data: incomeData } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', userId);
    
    setIncomeSources(incomeData || []);

    const { data: debtData } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId);

    setDebts(debtData || []);
  };

  const updateProfileField = async (field, value) => {
    if (!session) return;
    const updates = { 
      user_id: session.user.id, 
      [field]: Number(value) || 0 
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (!error && data) {
      setProfileId(data.id);
    }
  };

  const addIncomeSource = async (e) => {
    e.preventDefault();
    if (!newIncomeName || !newIncomeAmount || !session) return;

    const { data, error } = await supabase
      .from('income_sources')
      .insert([{ 
        user_id: session.user.id, 
        name: newIncomeName, 
        amount: Number(newIncomeAmount) 
      }])
      .select();

    if (!error && data) {
      setIncomeSources([...incomeSources, data[0]]);
      setNewIncomeName('');
      setNewIncomeAmount('');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else alert('Sign up successful! Please check your email or log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading PesaShield...</div>;

  if (!session) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#0f766e' }}>PESASHIELD</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          {authError && <p style={{ color: 'red', fontSize: '14px' }}>{authError}</p>}
          <button type="submit" style={{ padding: '10px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', fontSize: '14px' }}>
            {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '480px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '90vh', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f766e', fontSize: '16px' }}>● PESASHIELD</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{session.user.email}</span>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
          Log Out
        </button>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <h4 style={{ marginTop: 0, color: '#1e293b' }}>Sources of Income</h4>
        <form onSubmit={addIncomeSource} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Income Source Name (e.g. Salary)" 
            value={newIncomeName} 
            onChange={(e) => setNewIncomeName(e.target.value)} 
            style={{ flex: 2, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
          />
          <input 
            type="number" 
            placeholder="Amount" 
            value={newIncomeAmount} 
            onChange={(e) => setNewIncomeAmount(e.target.value)} 
            style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
          />
          <button type="submit" style={{ padding: '10px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Add
          </button>
        </form>

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 25px 0' }}>
          {incomeSources.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', margin: '10px 0' }}>No income sources added yet.</p> : 
            incomeSources.map(inc => (
              <li key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', marginBottom: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#334155' }}>{inc.name}</span>
                <strong style={{ color: '#059669' }}>TSH {Number(inc.amount).toLocaleString()}</strong>
              </li>
            ))
          }
        </ul>

        <h4 style={{ color: '#1e293b' }}>Living Costs & Essentials</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>HOUSING</label>
            <input 
              type="number" 
              value={housing} 
              onChange={(e) => { setHousing(e.target.value); updateProfileField('housing', e.target.value); }} 
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>FOOD / GROCERY</label>
            <input 
              type="number" 
              value={food} 
              onChange={(e) => { setFood(e.target.value); updateProfileField('food', e.target.value); }} 
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>UTILITIES / AIRTIME</label>
            <input 
              type="number" 
              value={utilities} 
              onChange={(e) => { setUtilities(e.target.value); updateProfileField('utilities', e.target.value); }} 
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>TRANSPORT</label>
            <input 
              type="number" 
              value={transport} 
              onChange={(e) => { setTransport(e.target.value); updateProfileField('transport', e.target.value); }} 
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}