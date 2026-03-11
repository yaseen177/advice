import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Notes({ user }) {
  const [allTemplates, setAllTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableConditions, setAvailableConditions] = useState([]);
  const [activeConditions, setActiveConditions] = useState([]);
  
  const [includeEyesHealthy, setIncludeEyesHealthy] = useState(true);
  const [includeComeSooner, setIncludeComeSooner] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const q = query(collection(db, 'templates'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const items = [];
        const uniqueConditions = new Set();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          items.push({ id: doc.id, parentId: '', ...data, selected: false });
          uniqueConditions.add(data.condition);
        });
        
        const conditionsArray = Array.from(uniqueConditions).sort();
        setAvailableConditions(conditionsArray);
        setAllTemplates(items);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [user.uid]);

  const toggleCondition = (condition) => {
    setActiveConditions(prev => {
      const isCurrentlyActive = prev.includes(condition);
      const newActiveConditions = isCurrentlyActive 
        ? prev.filter(c => c !== condition) 
        : [...prev, condition];
        
      setAllTemplates(currentTemplates => currentTemplates.map(item => {
        if (item.condition === condition) {
          if (!isCurrentlyActive) {
            return { ...item, selected: !item.parentId }; 
          } else {
            return { ...item, selected: false }; 
          }
        }
        return item;
      }));
      return newActiveConditions;
    });
  };

  const toggleItem = (id) => {
    setAllTemplates(prev => {
      const targetItem = prev.find(i => i.id === id);
      if (!targetItem) return prev;
      
      const newSelectedStatus = !targetItem.selected;
      const isParent = !targetItem.parentId;

      return prev.map(item => {
        if (item.id === id) {
          return { ...item, selected: newSelectedStatus };
        }
        if (isParent && item.parentId === id && !newSelectedStatus) {
          return { ...item, selected: false };
        }
        return item;
      });
    });
  };

  const copyToClipboard = async () => {
    const activeNotes = allTemplates.filter(item => activeConditions.includes(item.condition));
    const roots = activeNotes.filter(item => !item.parentId && item.selected).sort((a, b) => a.priority - b.priority);
    
    const formattedSequence = [];
    const seenText = new Set();

    roots.forEach(root => {
      const children = activeNotes
        .filter(child => child.parentId === root.id && child.selected)
        .sort((a, b) => a.priority - b.priority);
        
      if (children.length > 0) {
        children.forEach(child => {
           if (!seenText.has(child.text)) {
              formattedSequence.push(child);
              seenText.add(child.text);
           }
        });
      } else {
        if (!seenText.has(root.text)) {
          formattedSequence.push(root);
          seenText.add(root.text);
        }
      }
    });

    if (includeEyesHealthy) {
      formattedSequence.push({ text: 'Reassured, eyes healthy' });
      formattedSequence.push({ text: 'Routine recall' });
    }
    
    if (includeComeSooner) {
      formattedSequence.push({ text: 'Any probs come sooner' });
    }

    // Always pulls from .text, so your clipboard remains fully detailed
    const formattedText = formattedSequence
      .map((item, index) => `${index + 1}) ${item.text}`)
      .join('\n');

    if (!formattedText) {
      alert('Please ensure at least one item is ticked to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(formattedText);
      alert('Clinical record copied to clipboard!');
      
      setAllTemplates(prev => prev.map(item => ({ ...item, selected: false })));
      setActiveConditions([]);
      setIncludeEyesHealthy(true); 
      setIncludeComeSooner(true);   
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const activeNotes = allTemplates.filter(item => activeConditions.includes(item.condition));
  const rootNotes = activeNotes.filter(item => !item.parentId).sort((a, b) => a.priority - b.priority);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ marginBottom: '15px' }}>Patient Conditions</h2>
        {isLoading ? (
          <p>Loading conditions...</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {availableConditions.map(cond => {
              const isActive = activeConditions.includes(cond);
              return (
                <button
                  key={cond}
                  onClick={() => toggleCondition(cond)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '15px',
                    border: isActive ? '2px solid #0d6efd' : '1px solid #ccc',
                    backgroundColor: isActive ? '#e7f1ff' : '#f8f9fa',
                    color: isActive ? '#0d6efd' : '#333',
                    fontWeight: isActive ? 'bold' : 'normal',
                  }}
                >
                  {cond}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '15px' }}>Advice & Management</h2>
        
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', minHeight: '150px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          
          <div>
            {activeConditions.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: '10px 0' }}>No specific clinical conditions selected.</p>
            ) : rootNotes.length === 0 ? (
              <p>No management options found.</p>
            ) : (
              rootNotes.map((rootItem) => (
                <React.Fragment key={rootItem.id}>
                  <div style={{ margin: '12px 0', display: 'flex', alignItems: 'flex-start' }}>
                    <input 
                      type="checkbox" id={`item-${rootItem.id}`} checked={rootItem.selected} 
                      onChange={() => toggleItem(rootItem.id)}
                      style={{ marginRight: '12px', marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Displays the short title if provided, otherwise the full text */}
                      <label htmlFor={`item-${rootItem.id}`} style={{ cursor: 'pointer', fontSize: '16px', fontWeight: rootItem.selected ? 'bold' : 'normal' }}>
                        {rootItem.title || rootItem.text}
                      </label>
                    </div>
                  </div>

                  {rootItem.selected && activeNotes
                    .filter(child => child.parentId === rootItem.id)
                    .sort((a, b) => a.priority - b.priority)
                    .map(childItem => (
                      <div key={childItem.id} style={{ margin: '8px 0 8px 30px', display: 'flex', alignItems: 'flex-start', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', borderLeft: '3px solid #0d6efd' }}>
                        <input 
                          type="checkbox" id={`item-${childItem.id}`} checked={childItem.selected} 
                          onChange={() => toggleItem(childItem.id)}
                          style={{ marginRight: '10px', marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {/* Displays the short title for sub-items if provided */}
                        <label htmlFor={`item-${childItem.id}`} style={{ cursor: 'pointer', fontSize: '15px', color: '#333' }}>
                          {childItem.title || childItem.text}
                        </label>
                      </div>
                  ))}
                </React.Fragment>
              ))
            )}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px dashed #eee', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <input 
                type="checkbox" 
                id="eyes-healthy" 
                checked={includeEyesHealthy} 
                onChange={() => setIncludeEyesHealthy(!includeEyesHealthy)}
                style={{ marginRight: '12px', marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="eyes-healthy" style={{ cursor: 'pointer', fontSize: '16px', fontWeight: includeEyesHealthy ? 'bold' : 'normal', color: '#198754' }}>
                Reassured, eyes healthy & Routine recall
              </label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <input 
                type="checkbox" 
                id="come-sooner" 
                checked={includeComeSooner} 
                onChange={() => setIncludeComeSooner(!includeComeSooner)}
                style={{ marginRight: '12px', marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="come-sooner" style={{ cursor: 'pointer', fontSize: '16px', fontWeight: includeComeSooner ? 'bold' : 'normal', color: '#0056b3' }}>
                Any probs come sooner
              </label>
            </div>
          </div>

        </div>
      </div>

      <button 
        onClick={copyToClipboard} 
        style={{ padding: '14px 20px', fontSize: '16px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}
      >
        Copy to Clinical Record
      </button>
    </div>
  );
}