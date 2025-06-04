import React, { useEffect, useState } from 'react';

// Floating overlay for collaboration cursor labels
const CollaborationCursorOverlay = ({ editor, provider }) => {
  const [cursors, setCursors] = useState([]);

  useEffect(() => {
    if (!provider || !editor) return;
    const awareness = provider.awareness;

    const updateCursors = () => {
      const states = Array.from(awareness.getStates().entries());
      const newCursors = [];
      for (const [clientID, state] of states) {
        if (!state.user || typeof state.cursor?.anchor !== 'number') continue;
        // Use anchor as the cursor position
        const pos = state.cursor.anchor;
        // Get coordinates in the editor
        let coords = null;
        try {
          coords = editor.view.coordsAtPos(pos);
        } catch (e) {
          continue;
        }
        newCursors.push({
          clientID,
          name: state.user.name,
          color: state.user.color,
          left: coords.left - editor.view.dom.getBoundingClientRect().left,
          top: coords.top - editor.view.dom.getBoundingClientRect().top - 28, // float above caret
        });
      }
      setCursors(newCursors);
    };

    awareness.on('change', updateCursors);
    updateCursors();
    return () => {
      awareness.off('change', updateCursors);
    };
  }, [provider, editor]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 100 }}>
      {cursors.map(cursor => (
        <React.Fragment key={cursor.clientID}>
          {/* Caret: always 2px wide, 20px tall, never full width */}
          <span
            style={{
              position: 'absolute',
              left: cursor.left,
              top: cursor.top + 18,
              width: 2,
              height: 20,
              backgroundColor: cursor.color,
              borderRadius: 1,
              pointerEvents: 'none',
              zIndex: 100,
              display: 'inline-block',
              boxShadow: '0 0 2px rgba(0,0,0,0.2)',
            }}
          />
          {/* Username label above caret */}
          <span
            style={{
              position: 'absolute',
              left: cursor.left + 4,
              top: cursor.top,
              background: cursor.color,
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 101,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            {cursor.name}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default CollaborationCursorOverlay; 