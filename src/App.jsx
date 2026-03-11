import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import Notes from './Notes';
import TemplateManager from './TemplateManager';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('notes');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Checking credentials...</div>;
  }

  if (user) {
    return (
      <div>
        <nav style={{ backgroundColor: '#212529', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', fontFamily: 'sans-serif' }}>
          <div>
            <strong style={{ fontSize: '18px', marginRight: '20px' }}>Clinical Portal</strong>
            <button 
              onClick={() => setCurrentView('notes')}
              style={{ background: 'none', border: 'none', color: currentView === 'notes' ? '#fff' : '#aaa', cursor: 'pointer', fontSize: '16px', marginRight: '15px', fontWeight: currentView === 'notes' ? 'bold' : 'normal' }}
            >
              Patient Notes
            </button>
            <button 
              onClick={() => setCurrentView('manage')}
              style={{ background: 'none', border: 'none', color: currentView === 'manage' ? '#fff' : '#aaa', cursor: 'pointer', fontSize: '16px', fontWeight: currentView === 'manage' ? 'bold' : 'normal' }}
            >
              Manage Templates
            </button>
          </div>
          <button 
            onClick={handleLogout}
            style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Log Out
          </button>
        </nav>

        <div style={{ padding: '20px' }}>
          {/* We now pass the 'user' prop to TemplateManager as well */}
          {currentView === 'notes' ? <Notes user={user} /> : <TemplateManager user={user} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', fontFamily: 'sans-serif', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>
        {isRegistering ? 'Register Account' : 'Clinical Portal Log In'}
      </h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }} />
        <button type="submit" style={{ padding: '12px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isRegistering ? 'Sign Up' : 'Log In'}
        </button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}>
          {isRegistering ? 'Already have an account? Log in here' : 'Need an account? Register here'}
        </button>
      </div>
    </div>
  );
}