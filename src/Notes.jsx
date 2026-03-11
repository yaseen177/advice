import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Notes({ user, onLogout }) {
  const [templateItems, setTemplateItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch templates from Firestore when the component loads
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Querying the database for management advice related to Cataracts
        const templatesRef = collection(db, 'templates');
        const q = query(templatesRef, where('condition', '==', 'Cataracts'));
        const querySnapshot = await getDocs(q);
        
        const items = [];
        querySnapshot.forEach((doc) => {
          // Combine the database ID with the document data and add a selected state
          items.push({ id: doc.id, ...doc.data(), selected: false });
        });
        
        // Sort items by priority initially so they appear logically on screen
        items.sort((a, b) => a.priority - b.priority);
        setTemplateItems(items);
      } catch (error) {
        console.error('Error fetching templates: ', error);
        alert('Failed to load templates. Check your console and database rules.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const toggleItem = (id) => {
    setTemplateItems(templateItems.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const copyToClipboard = async () => {
    // Filter only the options you ticked
    const selectedNotes = templateItems.filter(item => item.selected);
    
    // Sort them by your pre-defined clinical priority
    selectedNotes.sort((a, b) => a.priority - b.priority);
    
    // Format into the 1), 2), 3) structure
    const formattedText = selectedNotes
      .map((item, index) => `${index + 1}) ${item.text}`)
      .join('\n');

    if (!formattedText) {
      alert('Please select at least one item to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(formattedText);
      alert('Clinical record copied to clipboard!');
      
      // Optional: Reset checkboxes after copying
      setTemplateItems(templateItems.map(item => ({ ...item, selected: false })));
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy. Your browser may be blocking clipboard access.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Advice & Management: Cataracts</h2>
        <button 
          onClick={onLogout} 
          style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Log Out
        </button>
      </div>
      
      <p style={{ color: '#555' }}>Logged in as: <strong>{user.email}</strong></p>
      
      {isLoading ? (
        <p>Loading your clinical templates...</p>
      ) : (
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
          {templateItems.length === 0 ? (
            <p>No templates found. Please add them to your Firestore database.</p>
          ) : (
            templateItems.map((item) => (
              <div key={item.id} style={{ margin: '10px 0', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  id={`item-${item.id}`}
                  checked={item.selected} 
                  onChange={() => toggleItem(item.id)}
                  style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor={`item-${item.id}`} style={{ cursor: 'pointer', fontSize: '16px', userSelect: 'none' }}>
                  {item.text}
                </label>
              </div>
            ))
          )}
        </div>
      )}

      <button 
        onClick={copyToClipboard} 
        disabled={isLoading || templateItems.length === 0}
        style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
      >
        Copy to Clinical Record
      </button>
    </div>
  );
}