import React, { useEffect, useState, useRef } from 'react';

// Helper to convert hex color to rgba with alpha
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Floating overlay for collaboration cursor labels and carets
const CollaborationCursorOverlay = ({ editor, provider }) => {
  const [cursors, setCursors] = useState([]);
  const overlayRef = useRef(null); // Ref for the overlay div

  useEffect(() => {
    if (!provider || !editor || !overlayRef.current) return;
    const awareness = provider.awareness;
    const editorDOM = editor.view.dom; // The ProseMirror editor div
    const overlayDOM = overlayRef.current; // The overlay div
    const overlayRect = overlayDOM.getBoundingClientRect(); // Get overlay's position relative to viewport

    const updateCursors = () => {
      const states = Array.from(awareness.getStates().entries());
      const newCursors = [];
      for (const [clientID, state] of states) {
        // Skip our own cursor, it's handled by the editor itself
        if (clientID === provider.awareness.clientID) continue;

        if (!state.user || typeof state.cursor?.anchor !== 'number') {
          continue;
        }
        const pos = state.cursor.anchor;

        // Get coordinates in the editor relative to the viewport
        let coords = null;
        try {
          coords = editor.view.coordsAtPos(pos);
        } catch (e) {
           console.error('Error getting coordsAtPos:', e);
           continue;
        }

        // Calculate position relative to the overlay div
        const left = coords.left - overlayRect.left;
        const top = coords.top - overlayRect.top;

        // Get line height from editor for caret height
        const domAtPos = editor.view.domAtPos(pos);
        const node = domAtPos.node;
        let lineElement = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
        while (lineElement && lineElement.nodeType !== 1) {
            lineElement = lineElement.parentNode;
        }

        const lineHeight = lineElement ? parseFloat(getComputedStyle(lineElement).lineHeight) : 24;

        newCursors.push({
          clientID,
          name: state.user.name,
          color: state.user.color,
          left: left,
          top: top,
          caretHeight: lineHeight,
        });
      }
      setCursors(newCursors);
    };

    awareness.on('change', updateCursors);
    updateCursors(); // Initial call
    return () => {
      awareness.off('change', updateCursors);
    };
  }, [provider, editor, overlayRef.current]); // Added overlayRef.current to dependencies

  return (
    <div ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 100 }}>
      {cursors.map(cursor => (
        <React.Fragment key={cursor.clientID}>
          {/* Caret: thin vertical line */}
          <div
            style={{
              position: 'absolute',
              left: cursor.left,
              top: cursor.top,
              width: 2,
              height: cursor.caretHeight,
              backgroundColor: cursor.color,
              pointerEvents: 'none',
              zIndex: 100,
            }}
            className="collaboration-caret-blink"
          />
          {/* Username label above caret */}
          <div
            style={{
              position: 'absolute',
              left: cursor.left + 4,
              top: cursor.top - 20,
              background: hexToRgba(cursor.color, 0.8),
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 101,
              whiteSpace: 'nowrap',
            }}
          >
            {cursor.name}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default CollaborationCursorOverlay; 