import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [condition, setCondition] = useState('Cataracts');
  const [text, setText] = useState('');
  const [priority, setPriority] = useState(1);
  const [parentId, setParentId] = useState(''); // New state for linking
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchTemplates = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'templates'));
      const items = [];
      querySnapshot.forEach((document) => {
        items.push({ id: document.id, parentId: '', ...document.data() });
      });
      setTemplates(items);
    } catch (error) {
      console.error("Error fetching templates: ", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) return;
    
    setIsSubmitting(true);
    const templateData = {
      condition,
      text,
      priority: Number(priority),
      parentId: parentId || '' // Save the link, or an empty string if it's a main item
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'templates', editingId), templateData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'templates'), templateData);
        setPriority(Number(priority) + 1);
      }
      setText('');
      setParentId(''); // Reset the parent link
      await fetchTemplates();
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Failed to save template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (item) => {
    setCondition(item.condition);
    setText(item.text);
    setPriority(item.priority);
    setParentId(item.parentId || '');
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setText('');
    setPriority(1);
    setParentId('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this? Sub-items will be orphaned.')) {
      try {
        await deleteDoc(doc(db, 'templates', id));
        await fetchTemplates();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  // Find valid parent options (items in the same condition that aren't children themselves)
  const validParents = templates
    .filter(t => t.condition === condition && !t.parentId && t.id !== editingId)
    .sort((a, b) => a.priority - b.priority);

  // Group items logically for the table display: Parents followed by their children
  const displayItems = [];
  const uniqueConditions = Array.from(new Set(templates.map(t => t.condition))).sort();
  
  uniqueConditions.forEach(cond => {
    const conditionItems = templates.filter(t => t.condition === cond);
    const roots = conditionItems.filter(t => !t.parentId).sort((a, b) => a.priority - b.priority);
    
    roots.forEach(root => {
      displayItems.push(root);
      const children = conditionItems
        .filter(t => t.parentId === root.id)
        .sort((a, b) => a.priority - b.priority);
      displayItems.push(...children);
    });
  });

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Manage Clinical Templates</h2>
      
      <div style={{ backgroundColor: editingId ? '#fff3cd' : '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: editingId ? '1px solid #ffe69c' : '1px solid #dee2e6' }}>
        <h3>{editingId ? 'Edit Template Item' : 'Add New Item'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1', minWidth: '150px' }}>
              <label style={{ marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Condition</label>
              <input type="text" value={condition} onChange={(e) => setCondition(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: '2', minWidth: '200px' }}>
              <label style={{ marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Management Text</label>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., Update Varifocals" required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: '80px' }}>
              <label style={{ marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Priority</label>
              <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} min="1" required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Linked To (Optional Sub-item)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', maxWidth: '400px' }}>
              <option value="">-- None (Primary Item) --</option>
              {validParents.map(p => (
                <option key={p.id} value={p.id}>Link to: "{p.text}"</option>
              ))}
            </select>
            <small style={{ color: '#666', marginTop: '4px' }}>If linked, this advice will only appear when its parent is ticked.</small>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={isSubmitting} style={{ padding: '9px 20px', backgroundColor: editingId ? '#ffc107' : '#198754', color: editingId ? '#000' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {isSubmitting ? 'Saving...' : (editingId ? 'Update Item' : 'Add Item')}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} style={{ padding: '9px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      <h3>Current Templates</h3>
      <div style={{ border: '1px solid #ccc', borderRadius: '5px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f1f1f1' }}>
            <tr>
              <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>Condition</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>Text</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>Priority</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ccc', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee', backgroundColor: editingId === item.id ? '#fff3cd' : 'transparent' }}>
                <td style={{ padding: '10px' }}>{item.condition}</td>
                <td style={{ padding: '10px', paddingLeft: item.parentId ? '30px' : '10px', color: item.parentId ? '#555' : '#000' }}>
                  {item.parentId && '↳ '}{item.text}
                </td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.priority}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <button onClick={() => handleEditClick(item)} style={{ padding: '5px 10px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}