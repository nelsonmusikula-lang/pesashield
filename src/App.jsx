import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const SUPABASE_URL = 'https://whatksidsddgixhazxi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZWYy...'; // Replace with your actual anon public key if needed
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState(null);

  // App data state
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
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

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

    // Fetch income sources
    const { data: incomeData } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', userId);
    
    setIncomeSources(incomeData || []);

    // Fetch debts
    const { data: debtData } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId);

    setDebts(debtData || []);
  };

  // Safe upsert for profile fields to avoid 409 conflicts
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
      .single();

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
    } else {
      console.error('Error adding income:', error);
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
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>PESASHIELD</h2>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Log Out
        </button>
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3>Sources of Income</h3>
        <form onSubmit={addIncomeSource} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Income Source Name (e.g. Salary)" 
            value={newIncomeName} 
            onChange={(e) => setNewIncomeName(e.target.value)} 
            style={{ flex: 2, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input 
            type="number" 
            placeholder="Amount" 
            value={newIncomeAmount} 
            onChange={(e) => setNewIncomeAmount(e.target.value)} 
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Add
          </button>
        </form>

        <ul>
          {incomeSources.length === 0 ? <p style={{ color: '#888' }}>No income sources added yet.</p> : 
            incomeSources.map(inc => (
              <li key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                <span>{inc.name}</span>
                <strong>TSH {Number(inc.amount).toLocaleString()}</strong>
              </li>
            ))
          }
        </ul>

        <h3 style={{ marginTop: '30px' }}>Living Costs & Essentials</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666' }}>HOUSING</label>
            <input 
              type="number" 
              value={housing} 
              onChange={(e) => { setHousing(e.target.value); updateProfileField('housing', e.target.value); }} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666' }}>FOOD / GROCERY</label>
            <input 
              type="number" 
              value={food} 
              onChange={(e) => { setFood(e.target.value); updateProfileField('food', e.target.value); }} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666' }}>UTILITIES / AIRTIME</label>
            <input 
              type="number" 
              value={utilities} 
              onChange={(e) => { setUtilities(e.target.value); updateProfileField('utilities', e.target.value); }} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666' }}>TRANSPORT</label>
            <input 
              type="number" 
              value={transport} 
              onChange={(e) => { setTransport(e.target.value); updateProfileField('transport', e.target.value); }} 
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}