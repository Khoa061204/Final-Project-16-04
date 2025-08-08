import React, { useState, useEffect, useRef, useContext } from 'react';
import { EditorContent } from '@tiptap/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@tiptap/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import jsPDF from 'jspdf';

// TipTap Extensions
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Collaboration from '@tiptap/extension-collaboration';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Dropcursor } from '@tiptap/extension-dropcursor';
import { Gapcursor } from '@tiptap/extension-gapcursor';
import { ListItem } from '@tiptap/extension-list-item';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Code } from '@tiptap/extension-code';
import { CodeBlock } from '@tiptap/extension-code-block';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from '@tiptap/extension-font-size';

// Icons
import {
  FaBold, FaItalic, FaListUl, FaListOl, FaQuoteLeft, FaRedo, FaUndo,
  FaHeading, FaCode, FaStrikethrough, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaAlignJustify, FaSubscript, FaSuperscript, FaIndent, FaOutdent, FaLink,
  FaUnlink, FaTable, FaImage, FaUnderline, FaHighlighter, FaEraser, FaMinus,
  FaPlus, FaColumns, FaTrash, FaParagraph, FaShareAlt, FaFont, FaPalette,
  FaTextHeight, FaUpload,
} from 'react-icons/fa';

// Components
import Topbar from '../components/Topbar';
import Page from '../components/Page';
import CollabUserList from '../components/CollabUserList';
import ShareModal from '../components/ShareModal';

// Contexts & Utils
import { AuthContext } from '../App';
import { useTheme } from '../contexts/ThemeContext';
import { getApiUrl, getAuthHeaders } from '../config/api';

// Custom Cursor Overlay Component
const CursorOverlay = ({ editor, remoteCursors, editorRef }) => {
  if (!editor || !editorRef.current || remoteCursors.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
        {remoteCursors.map((cursor) => {
        if (!cursor.anchor || !cursor.user) return null;
        
        try {
          // Get the DOM node at the cursor position
          const domAtPos = editor.view.domAtPos(cursor.anchor);
          if (!domAtPos.node) return null;
          
          // Get the bounding rect of the cursor position
          const range = document.createRange();
          if (domAtPos.node.nodeType === Node.TEXT_NODE) {
            range.setStart(domAtPos.node, Math.min(domAtPos.offset, domAtPos.node.textContent.length));
            range.setEnd(domAtPos.node, Math.min(domAtPos.offset, domAtPos.node.textContent.length));
          } else {
            range.selectNode(domAtPos.node);
          }
          
          const rect = range.getBoundingClientRect();
          const editorRect = editorRef.current.getBoundingClientRect();
          
          // Calculate position relative to editor
          const left = rect.left - editorRect.left;
          const top = rect.top - editorRect.top;
          
          return (
            <div
              key={cursor.clientId}
              className="absolute"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                transform: 'translateX(-1px)',
              }}
            >
              {/* Cursor line with blinking animation */}
              <div
                className="w-0.5 h-5"
                style={{ 
                  backgroundColor: cursor.user.color,
                  animation: 'cursor-blink 1.2s infinite',
                  boxShadow: `0 0 4px ${cursor.user.color}40`
                }}
              />
              
              {/* User name label */}
              <div
                className="absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{ 
                  backgroundColor: cursor.user.color,
                  fontSize: '11px',
                  minWidth: 'max-content'
                }}
              >
                {cursor.user.name}
              </div>
            </div>
          );
        } catch (error) {
          return null;
        }
      })}
    </div>
  );
};

// Helper to extract plain text from Tiptap/ProseMirror JSON
function extractPlainTextFromTiptap(doc) {
  if (!doc) return '';
  if (typeof doc === 'string') {
    try { doc = JSON.parse(doc); } catch { return doc; }
  }
  let text = '';
  function traverse(node) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      text += node.text;
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse);
      text += '\n'; // Add newlines between paragraphs
    }
  }
  traverse(doc);
  return text.trim();
}

const TextEditor = () => {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const { id } = useParams();
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);
  const socketRef = useRef(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useTheme();
  const overlayRef = useRef(null);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [isReceivingChanges, setIsReceivingChanges] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userPermission, setUserPermission] = useState('view');
  const [isOwner, setIsOwner] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  // Y.js collaboration state
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const [collaborativeUsers, setCollaborativeUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState([]);
  const autoSaveTimeoutRef = useRef(null);
  const editorRef = useRef(null);
  const initializingRef = useRef(false);
  const contentLoadedRef = useRef(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState('Inter');
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // State for collapsible headers
  const [collapsedHeaders, setCollapsedHeaders] = useState(new Set());

  // Helper function to toggle header collapse
  const toggleHeaderCollapse = (headerId) => {
    const newCollapsed = new Set(collapsedHeaders);
    if (newCollapsed.has(headerId)) {
      newCollapsed.delete(headerId);
    } else {
      newCollapsed.add(headerId);
    }
    setCollapsedHeaders(newCollapsed);
  };

  // Helper functions for editor commands
  const insertTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const addColumnBefore = () => {
    if (editor) {
      editor.chain().focus().addColumnBefore().run();
    }
  };

  const addColumnAfter = () => {
    if (editor) {
      editor.chain().focus().addColumnAfter().run();
    }
  };

  const deleteColumn = () => {
    if (editor) {
      editor.chain().focus().deleteColumn().run();
    }
  };

  const addRowBefore = () => {
    if (editor) {
      editor.chain().focus().addRowBefore().run();
    }
  };

  const addRowAfter = () => {
    if (editor) {
      editor.chain().focus().addRowAfter().run();
    }
  };

  const deleteRow = () => {
    if (editor) {
      editor.chain().focus().deleteRow().run();
    }
  };

  const deleteTable = () => {
    if (editor) {
      editor.chain().focus().deleteTable().run();
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const uploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file && editor) {
        const reader = new FileReader();
        reader.onload = (event) => {
          editor.chain().focus().setImage({ src: event.target.result }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const setTextColor = (color) => {
    if (editor) {
      editor.chain().focus().setColor(color).run();
    }
    setShowColorPicker(false);
  };

  const setHighlightColor = (color) => {
    if (editor) {
      editor.chain().focus().setHighlight({ color }).run();
    }
    setShowHighlightPicker(false);
  };

  const changeFontSize = (size) => {
    if (editor) {
      // Check if we're in a header and adjust accordingly
      if (editor.isActive('heading', { level: 1 })) {
        // For H1, make it larger than normal text
        const h1Size = Math.max(parseInt(size) + 8, 20); // At least 20px for headers
        editor.chain().focus().setFontSize(`${h1Size}px`).run();
      } else if (editor.isActive('heading', { level: 2 })) {
        // For H2, make it medium larger
        const h2Size = Math.max(parseInt(size) + 4, 18);
        editor.chain().focus().setFontSize(`${h2Size}px`).run();
      } else if (editor.isActive('heading', { level: 3 })) {
        // For H3, make it slightly larger
        const h3Size = Math.max(parseInt(size) + 2, 16);
        editor.chain().focus().setFontSize(`${h3Size}px`).run();
      } else {
        // Normal text
        editor.chain().focus().setFontSize(`${size}px`).run();
      }
    }
    setFontSize(size);
  };

  const changeFontFamily = (family) => {
    if (editor) {
      editor.chain().focus().setFontFamily(family).run();
    }
    setFontFamily(family);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  };

  // Load document content
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch(getApiUrl(`/documents/${id}`), {
          headers: getAuthHeaders(token)
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Document not found');
            setTimeout(() => navigate('/'), 2000);
            return;
          }
          throw new Error('Failed to load document');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to load document');
        }
        
        // If it's a PDF, convert it to text
        if (data.document.file_type === 'pdf') {
          try {
            const convertResponse = await fetch(getApiUrl(`/documents/${id}/convert-pdf`), {
              method: 'POST',
              headers: getAuthHeaders(token)
            });

            if (!convertResponse.ok) {
              throw new Error('Failed to convert PDF');
            }

            const convertedData = await convertResponse.json();
            // Navigate to the new converted document
            navigate(`/document/${convertedData.document.id}`);
            return;
          } catch (err) {
            console.error('Error converting PDF:', err);
            setError('Failed to convert PDF. Please try again.');
            return;
          }
        }

        setTitle(data.document.title || 'Untitled Document');
        
        // Set user permissions for this document
        setUserPermission(data.document.userPermission || 'view');
        setIsOwner(data.document.isOwner || false);
        
        // Document loaded successfully
        
        // Store initial content for Y.js initialization
        if (data.document.content) {
          try {
            let content = data.document.content;
            if (typeof content === 'string') {
              content = JSON.parse(content);
            }
            // Defensive clean: sanitize white color marks to dark, preserve others
            const cleanTextNodeAttrs = (node) => {
              if (!node) return node;
              if (Array.isArray(node)) return node.map(cleanTextNodeAttrs);
              if (node.type === 'text' && node.marks) {
                // If any mark is color and is white, change to #111
                const newMarks = node.marks.map(mark => {
                  if (mark.type === 'textStyle' && mark.attrs && (mark.attrs.color === '#fff' || mark.attrs.color === '#ffffff' || mark.attrs.color === 'white')) {
                    return { ...mark, attrs: { ...mark.attrs, color: '#111' } };
                  }
                  return mark;
                });
                return { ...node, marks: newMarks };
              }
              if (node.content) {
                return { ...node, content: cleanTextNodeAttrs(node.content) };
              }
              return node;
            };
            content = cleanTextNodeAttrs(content);
            
            // Set content to Y.js document when editor is ready and document is empty
            const globalContentKey = `content_loaded_${id}`;
            if (!contentLoadedRef.current && !sessionStorage.getItem(globalContentKey)) {
              window.initialDocumentContent = content;
              sessionStorage.setItem(globalContentKey, 'true');
            }
          } catch (err) {
            console.error('Error parsing document content:', err);
            setError('Failed to load document content');
          }
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      }
    };

    if (id) {
      loadDocument();
    }
  }, [id, navigate]); // Remove editor dependency to prevent reloading on editor changes

  // Track connection status based on Y.js provider
  useEffect(() => {
    if (!providerRef.current) return;

    const provider = providerRef.current;
    
    if (provider) {
      provider.on('status', ({ status }) => {
        console.log('[YJS] provider status:', status);
        setStatus(status === 'connected' ? 'connected' : 'disconnected');
      });
      provider.on('connection-close', (ev) => {
        console.warn('[YJS] connection-close', ev?.code, ev?.reason || ev);
      });
      provider.on('connection-error', (ev) => {
        console.error('[YJS] connection-error', ev);
      });
      // Mark connected quickly once initial doc state is synced
      provider.once('synced', () => {
        console.log('[YJS] initial sync complete');
        setStatus('connected');
      });
    }

    return () => {
      // Cleanup is handled in the editor initialization useEffect
    };
  }, [providerRef.current]);

  // Initialize TipTap editor with Y.js collaboration
  useEffect(() => {
    if (!id) return;
    
    // Prevent duplicate initialization
    if (editor || initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    // Clear any existing content loaded flag on new initialization
    contentLoadedRef.current = false;

    let ydoc, provider, useCollaboration = false;

    // Create Y.js document and WebSocket provider
    try {
      ydoc = new Y.Doc();

      // Only enable collaboration if a y-websocket endpoint is configured
      const configuredWsUrl = process.env.REACT_APP_Y_WEBSOCKET_URL || process.env.REACT_APP_WS_URL || 'ws://localhost:1234';
      console.log('[YJS] configured websocket url:', configuredWsUrl);
      if (configuredWsUrl) {
        // Step 2: Create WebsocketProvider (room name only, no query params)
        const roomName = `document-${id}`;
        const wsBaseUrl = configuredWsUrl; // e.g. ws://localhost:1234

        try {
          console.log('[YJS] Creating WebsocketProvider', { url: wsBaseUrl, room: roomName });
          provider = new WebsocketProvider(wsBaseUrl, roomName, ydoc, { connect: true });
          providerRef.current = provider;
          useCollaboration = true;
        } catch (e) {
          // If provider fails to construct, fallback to single-user mode silently
          provider = null;
          useCollaboration = false;
        }
      } else {
        // No collaboration server configured → single-user mode
        provider = null;
        useCollaboration = false;
      }

      // Set up user awareness for collaborative cursors
      if (provider && user) {
        const userColor = `hsl(${(user.id * 137) % 360}, 70%, 50%)`;
        
        provider.awareness.setLocalStateField('user', {
          name: user.username || user.email || 'Anonymous',
          color: userColor,
          id: user.id,
          timestamp: Date.now(),
          browserTab: Math.random().toString(36).substr(2, 9)
        });
      }

      // Listen for connection status
      if (provider) {
        provider.on('status', ({ status }) => {
          setStatus(status === 'connected' ? 'connected' : 'disconnected');
        });
      }

      // Step 5: Listen for awareness changes (collaborative users)
      if (provider && provider.awareness) {
        provider.awareness.on('change', () => {
          try {
            const states = Array.from(provider.awareness.getStates().entries());
            const allUsers = states
              .filter(([clientId, state]) => clientId !== provider.awareness.clientID && state.user)
              .map(([clientId, state]) => ({
                clientId,
                ...state.user
              }));
            
            // Filter to keep only the latest session per user ID and remove stale connections
            const uniqueUsers = [];
            const userMap = new Map();
            const currentTime = Date.now();
            const staleThreshold = 30000; // 30 seconds
            
            allUsers.forEach(user => {
              // Skip stale connections (older than 30 seconds)
              if (currentTime - user.timestamp > staleThreshold) {
                return;
              }
              
              if (!userMap.has(user.id) || user.timestamp > userMap.get(user.id).timestamp) {
                userMap.set(user.id, user);
              }
            });
            
            uniqueUsers.push(...userMap.values());
            
            setCollaborativeUsers(uniqueUsers);
            setConnectedUsers(uniqueUsers.length + 1);
          } catch (err) {
            // Silently handle errors
          }
        });
      }

      // Store references
      ydocRef.current = ydoc;
      providerRef.current = provider;
      useCollaboration = !!provider;
      setStatus(provider ? 'connecting' : 'disconnected');

    } catch (error) {
      useCollaboration = false;
      setStatus('disconnected');
      setConnectedUsers(1);
    }

    // Step 6: Configure TipTap extensions (avoid duplicates with StarterKit)
    const extensions = [
      StarterKit.configure({
        dropcursor: true,
        gapcursor: true,
        // If collaboration is enabled, disable history to avoid conflicts with yjs
        history: useCollaboration ? false : {
          depth: 100,
          newGroupDelay: 500
        }
      }),
      Placeholder.configure({
        placeholder: 'Start typing here...',
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      // HorizontalRule, HardBreak, Dropcursor, Gapcursor are provided by StarterKit
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // ListItem, BulletList, OrderedList, Blockquote, Code, CodeBlock - already in StarterKit
    ];

    // Add collaboration extensions if Y.js is working
    if (useCollaboration && ydoc && provider) {
      try {
        extensions.push(
          Collaboration.configure({
            document: ydoc,
          })
        );
        // Note: CollaborationCursor is incompatible with y-websocket
        // Using custom cursor implementation instead
      } catch (error) {
        // Handle errors silently, fall back to single-user mode
        useCollaboration = false;
      }
    }

    // Step 8: Initialize TipTap editor
    const newEditor = new Editor({
      extensions,
      editorProps: {
        attributes: {
          class: 'custom-editor mx-auto focus:outline-none min-h-[500px] px-4 py-4',
        },
      },
      editable: userPermission === 'edit' || userPermission === 'admin' || isOwner,
      onUpdate: ({ editor }) => {
        setHasUnsavedChanges(true);
        
        // Auto-save to database periodically
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          saveDocument();
        }, 3000);
      },
    });

    setEditor(newEditor);
    initializingRef.current = false;

    // Custom cursor implementation for y-websocket
    if (useCollaboration && provider && newEditor) {
      const setupCursorTracking = () => {
        const userColor = `hsl(${(user.id * 137) % 360}, 70%, 50%)`;
        
        // Track cursor position changes
        newEditor.on('selectionUpdate', ({ editor }) => {
          if (provider.awareness && user) {
            const selection = editor.state.selection;
            provider.awareness.setLocalStateField('cursor', {
              anchor: selection.anchor,
              head: selection.head,
              user: {
                name: user.username || user.email || 'Anonymous',
                color: userColor,
                id: user.id,
              }
            });
          }
        });
        
        // Listen for other users' cursor changes
        provider.awareness.on('change', () => {
          const states = Array.from(provider.awareness.getStates().entries());
          const allCursors = states
            .filter(([clientId, state]) => clientId !== provider.awareness.clientID && state.cursor)
            .map(([clientId, state]) => ({ clientId, ...state.cursor }));
          
          // Keep only the latest cursor per user
          const cursorMap = new Map();
          allCursors.forEach(cursor => {
            if (cursor.user?.id) {
              if (!cursorMap.has(cursor.user.id) || 
                  (cursor.user.timestamp > (cursorMap.get(cursor.user.id).user?.timestamp || 0))) {
                cursorMap.set(cursor.user.id, cursor);
              }
            }
          });
          
          setRemoteCursors(Array.from(cursorMap.values()));
        });
      };
      
      setTimeout(setupCursorTracking, 100);
      
      // Heartbeat to keep user active
      const heartbeatInterval = setInterval(() => {
        if (provider.awareness && user) {
          const currentState = provider.awareness.getLocalState();
          if (currentState?.user) {
            provider.awareness.setLocalStateField('user', {
              ...currentState.user,
              timestamp: Date.now()
            });
          }
        }
      }, 10000);
      
      newEditor.heartbeatInterval = heartbeatInterval;
    }

    // Load initial content (only once and only if document is empty)
    const globalContentKey = `content_loaded_${id}`;
    const hasLoadedBefore = sessionStorage.getItem(globalContentKey);
    
    if (window.initialDocumentContent && !contentLoadedRef.current && !hasLoadedBefore) {
      setTimeout(() => {
        const yjsText = ydoc.getText('prosemirror');
        const isYjsEmpty = yjsText.length === 0;
        const isEditorEmpty = newEditor.getHTML() === '<p></p>' || newEditor.getHTML() === '';
        
        if (isYjsEmpty && isEditorEmpty) {
          newEditor.commands.setContent(window.initialDocumentContent);
          contentLoadedRef.current = true;
          sessionStorage.setItem(`content_initialized_${id}`, 'true');
        }
        
        delete window.initialDocumentContent;
      }, 150);
    } else if (window.initialDocumentContent) {
      delete window.initialDocumentContent;
    }

    return () => {
      // Cleanup resources
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (newEditor) {
        if (newEditor.heartbeatInterval) {
          clearInterval(newEditor.heartbeatInterval);
        }
        newEditor.destroy();
      }
      if (provider) {
        if (provider.awareness) {
          provider.awareness.destroy();
        }
        provider.disconnect();
        provider.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
      
      // Clear refs
      ydocRef.current = null;
      providerRef.current = null;
      
      // Reset state
      setEditor(null);
      setCollaborativeUsers([]);
      setConnectedUsers(1);
      setStatus('disconnected');
    };
  }, [id]);

  // Keep editability in sync without reinitializing the editor
  useEffect(() => {
    if (!editor) return;
    const canEdit = userPermission === 'edit' || userPermission === 'admin' || isOwner;
    editor.setEditable(canEdit);
  }, [editor, userPermission, isOwner]);

  // Update awareness user payload when user changes
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || !user) return;
    try {
      const userColor = `hsl(${(user.id * 137) % 360}, 70%, 50%)`;
      const current = provider.awareness.getLocalState()?.user || {};
      provider.awareness.setLocalStateField('user', {
        ...current,
        name: user.username || user.email || 'Anonymous',
        color: userColor,
        id: user.id,
        timestamp: Date.now(),
      });
    } catch (_) {}
  }, [user]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      if (providerRef.current) {
        if (providerRef.current.awareness) {
          providerRef.current.awareness.destroy();
        }
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (editor) {
        editor.destroy();
        setEditor(null);
      }
    };
  }, []);

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Page unload cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (providerRef.current) {
        if (providerRef.current.awareness) {
          providerRef.current.awareness.setLocalState(null);
          providerRef.current.awareness.destroy();
        }
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && providerRef.current?.awareness) {
        // Mark user as inactive when tab becomes hidden
        const currentState = providerRef.current.awareness.getLocalState();
        if (currentState?.user) {
          providerRef.current.awareness.setLocalStateField('user', {
            ...currentState.user,
            inactive: true,
            lastSeen: Date.now()
          });
        }
      } else if (!document.hidden && providerRef.current?.awareness) {
        // Mark user as active when tab becomes visible
        const currentState = providerRef.current.awareness.getLocalState();
        if (currentState?.user) {
          providerRef.current.awareness.setLocalStateField('user', {
            ...currentState.user,
            inactive: false,
            timestamp: Date.now()
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update cursor positions when editor content changes
  useEffect(() => {
    if (editor && remoteCursors.length > 0) {
      // Force re-render of cursor overlay when content changes
      const handleUpdate = () => {
        // Trigger a re-render by updating state
        setRemoteCursors(prev => [...prev]);
      };
      
      editor.on('update', handleUpdate);
      
      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor, remoteCursors.length]);

  // Periodically clean up stale connections
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (providerRef.current?.awareness) {
        // Force trigger awareness change to clean up stale connections
        const currentState = providerRef.current.awareness.getLocalState();
        if (currentState?.user) {
          providerRef.current.awareness.setLocalStateField('user', {
            ...currentState.user,
            timestamp: Date.now()
          });
        }
      }
    }, 15000); // Clean up every 15 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Save document content
  const saveDocument = async () => {
    if (!editor || !id) return;
    
    // Check if user has edit permission
    if (userPermission === 'view' && !isOwner) {
      setError('You do not have permission to edit this document');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(getApiUrl(`/documents/${id}`), {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          title,
          content: editor.getJSON()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save document');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to save document');
      }

      // Show success message
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Clear content loading flags when content is actually saved
      // This allows fresh content to be loaded if the document changes
      const globalContentKey = `content_loaded_${id}`;
      sessionStorage.removeItem(globalContentKey);
      sessionStorage.removeItem(`content_initialized_${id}`);
    } catch (err) {
      console.error('Error saving document:', err);
      setError(err.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when content changes (debounced)
  useEffect(() => {
    if (!editor || !id) return;

    const timeoutId = setTimeout(() => {
      if (hasUnsavedChanges) {
        saveDocument();
      }
    }, 2000); // 2 second delay

    return () => clearTimeout(timeoutId);
  }, [editor?.getHTML(), title]);

  // Redirect if no document ID
  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
  }, [id, navigate]);

  // Track unsaved changes
  useEffect(() => {
    if (!editor) return;
    const updateUnsaved = () => setHasUnsavedChanges(true);
    editor.on('update', updateUnsaved);
    return () => editor && editor.off('update', updateUnsaved);
  }, [editor]);

  // Confirm before leaving if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleReturnHome = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) return;
    }
    navigate('/');
  };

  // Add this above the return statement in TextEditor
  const handleExportPDF = () => {
    if (!editor) return;
    const doc = new jsPDF();
    // Get plain text from Tiptap JSON
    const plainText = extractPlainTextFromTiptap(editor.getJSON());
    // Split text into lines to avoid overflow
    const lines = doc.splitTextToSize(plainText, 180);
    doc.text(lines, 10, 10);
    // Remove any extension from title before adding .pdf
    let baseName = (title || 'document').replace(/\.[^/.]+$/, '');
    doc.save(`${baseName}.pdf`);
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  const MenuButton = ({ onClick, active, children, ...props }) => (
    <button
      onClick={onClick}
      className={`p-2.5 mx-0.5 rounded-lg transition-all duration-200 ${
        active 
          ? isDarkMode 
            ? 'bg-blue-600 text-white shadow-sm' 
            : 'bg-blue-100 text-blue-700 shadow-sm'
          : isDarkMode
            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
      {...props}
    >
      {React.isValidElement(children)
        ? React.cloneElement(children, { 
            className: (children.props.className || '') + ` ${
              active 
                ? isDarkMode ? 'text-white' : 'text-blue-700'
                : isDarkMode ? 'text-gray-300' : 'text-gray-600'
            } w-4 h-4` 
          })
        : children}
    </button>
  );

  return (
    <Page>
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
          {/* Show active collaborators above the editor */}
          {connectedUsers > 1 ? (
            <CollabUserList users={collaborativeUsers} userCount={connectedUsers} />
          ) : (
            <div className={`p-2 border-b text-sm ${
              status === 'connected' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : status === 'connecting'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            }`}>
                              {status === 'connected' && '🎉 Real-time collaboration active!'}
                {status === 'connecting' && '🔄 Connecting to collaboration server...'}
                {status === 'disconnected' && '📝 Single-user mode (start collaboration server for real-time editing)'}
            </div>
          )}
          <div className="flex-1 bg-white overflow-y-auto" style={{ position: 'relative' }}>
            {/* Document title with Return to Home button */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleReturnHome}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center ${
                    isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  ← Home
                </button>
                
                <div className="flex flex-col">
                  <h1 className={`text-2xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{title}</h1>
                  
                  {/* Connection Status and User Count */}
                  <div className="flex items-center space-x-3 mt-1">
                    <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs ${
                      status === 'connected' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>{status === 'connected' ? 'Connected' : 'Disconnected'}</span>
                    </div>

                    {connectedUsers > 1 && (
                      <div className="flex items-center space-x-2 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span>{connectedUsers} users</span>
                      </div>
                    )}

                    {hasUnsavedChanges && (
                      <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400 text-xs">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                        <span>Unsaved</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Collaborator Avatars */}
                {collaborators.length > 0 && (
                  <div className="flex items-center space-x-2 mr-4">
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Active:
                    </span>
                    <div className="flex -space-x-1">
                      {collaborators.slice(0, 4).map((collaborator) => (
                        <div
                          key={collaborator.userId}
                          className="relative group"
                          title={`${collaborator.username}${collaborator.isTyping ? ' (typing...)' : ''}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-gray-800 ${
                            collaborator.isTyping 
                              ? 'bg-green-500 animate-pulse' 
                              : 'bg-gradient-to-br from-blue-500 to-purple-600'
                          }`}>
                            {collaborator.username.charAt(0).toUpperCase()}
                          </div>
                          {collaborator.isTyping && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                          )}
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {collaborator.username}
                            {collaborator.isTyping && (
                              <span className="text-green-300"> (typing...)</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {collaborators.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-semibold ring-2 ring-white dark:ring-gray-800">
                          +{collaborators.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={saveDocument}
                  disabled={saving || (userPermission === 'view' && !isOwner)}
                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center ${
                    (userPermission === 'view' && !isOwner) 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
                  }`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (userPermission === 'view' && !isOwner) ? (
                    'Read Only'
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2 ${
                    isDarkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <FaShareAlt className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center ${
                    isDarkMode
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                >
                  Export PDF
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className={`px-6 py-3 flex items-center flex-wrap gap-2 border-b shadow-sm ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-100'
            }`}>
              {/* Font Controls Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                {/* Header Size Indicator */}
                {editor && (editor.isActive('heading', { level: 1 }) || editor.isActive('heading', { level: 2 }) || editor.isActive('heading', { level: 3 })) && (
                  <span className={`text-xs px-2 py-1 rounded mr-2 ${
                    isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {editor.isActive('heading', { level: 1 }) && 'H1'}
                    {editor.isActive('heading', { level: 2 }) && 'H2'}
                    {editor.isActive('heading', { level: 3 }) && 'H3'}
                  </span>
                )}
                {/* Font Family */}
                <select
                  value={fontFamily}
                  onChange={(e) => changeFontFamily(e.target.value)}
                  className={`px-2 py-1 rounded text-sm mr-2 ${
                    isDarkMode
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-white text-gray-900 border-gray-300'
                  } border`}
                >
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Monaco">Monaco</option>
                </select>

                {/* Font Size */}
                <select
                  value={fontSize}
                  onChange={(e) => changeFontSize(e.target.value)}
                  className={`px-2 py-1 rounded text-sm ${
                    isDarkMode
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-white text-gray-900 border-gray-300'
                  } border`}
                  title="Font Size (Headers will be automatically larger)"
                >
                  <option value="8">8px</option>
                  <option value="9">9px</option>
                  <option value="10">10px</option>
                  <option value="11">11px</option>
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                  <option value="22">22px</option>
                  <option value="24">24px</option>
                  <option value="26">26px</option>
                  <option value="28">28px</option>
                  <option value="30">30px</option>
                  <option value="32">32px</option>
                  <option value="36">36px</option>
                  <option value="40">40px</option>
                  <option value="44">44px</option>
                  <option value="48">48px</option>
                  <option value="54">54px</option>
                  <option value="60">60px</option>
                  <option value="72">72px</option>
                </select>
              </div>

              {/* Text Formatting Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
                  title="Bold"
            >
              <FaBold />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
                  title="Italic"
            >
              <FaItalic />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
                  title="Strikethrough"
                >
                  <FaStrikethrough />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  active={editor.isActive('underline')}
                  title="Underline"
            >
              <FaUnderline />
            </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleSubscript().run()}
                  active={editor.isActive('subscript')}
                  title="Subscript"
                >
                  <FaSubscript />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleSuperscript().run()}
                  active={editor.isActive('superscript')}
                  title="Superscript"
                >
                  <FaSuperscript />
                </MenuButton>
              </div>

              {/* Text Color Group */}
              <div className={`flex items-center border-r pr-4 mr-4 relative ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <div className="relative">
                  <MenuButton
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title="Text Color"
                  >
                    <FaPalette />
                  </MenuButton>
                  {showColorPicker && (
                    <div className={`absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg z-50 ${
                      isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                    } border`}>
                      <div className="grid grid-cols-6 gap-1">
                        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
                          '#00FFFF', '#FFA500', '#800080', '#008000', '#800000', '#808080',
                          '#C0C0C0', '#FF69B4', '#32CD32', '#4169E1', '#FFD700', '#DC143C'].map(color => (
                          <button
                            key={color}
                            onClick={() => setTextColor(color)}
                            className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetColor().run();
                          setShowColorPicker(false);
                        }}
                        className={`mt-2 w-full px-2 py-1 text-xs rounded ${
                          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        Remove Color
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative ml-2">
                  <MenuButton
                    onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                    active={editor.isActive('highlight')}
                    title="Highlight"
                  >
                    <FaHighlighter />
                  </MenuButton>
                  {showHighlightPicker && (
                    <div className={`absolute top-full left-0 mt-1 p-2 rounded-lg shadow-lg z-50 ${
                      isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                    } border`}>
                      <div className="grid grid-cols-6 gap-1">
                        {['#FFFF00', '#00FF00', '#00FFFF', '#FF69B4', '#FFA500', '#FF0000',
                          '#800080', '#0000FF', '#32CD32', '#FFD700', '#DC143C', '#C0C0C0'].map(color => (
                          <button
                            key={color}
                            onClick={() => setHighlightColor(color)}
                            className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetHighlight().run();
                          setShowHighlightPicker(false);
                        }}
                        className={`mt-2 w-full px-2 py-1 text-xs rounded ${
                          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        Remove Highlight
                      </button>
                    </div>
                  )}
                </div>
              </div>



              {/* Alignment Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <MenuButton
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  active={editor.isActive({ textAlign: 'left' })}
                  title="Align Left"
                >
                  <FaAlignLeft />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  active={editor.isActive({ textAlign: 'center' })}
                  title="Align Center"
                >
                  <FaAlignCenter />
                </MenuButton>
            <MenuButton
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  active={editor.isActive({ textAlign: 'right' })}
                  title="Align Right"
            >
                  <FaAlignRight />
            </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  active={editor.isActive({ textAlign: 'justify' })}
                  title="Justify"
                >
                  <FaAlignJustify />
                </MenuButton>
              </div>

              {/* Lists and Indentation Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
                  title="Bullet List"
            >
              <FaListUl />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
                  title="Numbered List"
            >
              <FaListOl />
            </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().indent().run()}
                  title="Indent"
                >
                  <FaIndent />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().outdent().run()}
                  title="Outdent"
                >
                  <FaOutdent />
                </MenuButton>
              </div>

              {/* Headings and Blocks Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-2.5 mx-0.5 rounded-lg transition-all duration-200 ${
                    editor.isActive('heading', { level: 1 })
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-500'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-blue-700 hover:text-white border-2 border-transparent hover:border-blue-500'
                        : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700 border-2 border-transparent hover:border-blue-300'
                  }`}
                  title="Heading 1 - Large Blue Header"
                >
                  <span className="font-bold text-lg" style={{ color: editor.isActive('heading', { level: 1 }) ? 'white' : '#0078d4' }}>H1</span>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2.5 mx-0.5 rounded-lg transition-all duration-200 ${
                    editor.isActive('heading', { level: 2 })
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-500'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-blue-700 hover:text-white border-2 border-transparent hover:border-blue-500'
                        : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700 border-2 border-transparent hover:border-blue-300'
                  }`}
                  title="Heading 2 - Medium Blue Header"
                >
                  <span className="font-bold" style={{ color: editor.isActive('heading', { level: 2 }) ? 'white' : '#106ebe' }}>H2</span>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-2.5 mx-0.5 rounded-lg transition-all duration-200 ${
                    editor.isActive('heading', { level: 3 })
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-500'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-blue-700 hover:text-white border-2 border-transparent hover:border-blue-500'
                        : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700 border-2 border-transparent hover:border-blue-300'
                  }`}
                  title="Heading 3 - Small Blue Header"
                >
                  <span className="font-bold" style={{ color: editor.isActive('heading', { level: 3 }) ? 'white' : '#2b88d8' }}>H3</span>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-2.5 mx-0.5 rounded-lg transition-all duration-200 ${
                    editor.isActive('blockquote')
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-500'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-blue-700 hover:text-white border-2 border-transparent hover:border-blue-500'
                        : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700 border-2 border-transparent hover:border-blue-300'
                  }`}
                  title="Blockquote - Styled Quote Block"
                >
                  <FaQuoteLeft className={editor.isActive('blockquote') ? 'text-white' : 'text-blue-600'} />
                </button>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
                  title="Code Block"
            >
              <FaCode />
            </MenuButton>
              </div>

              {/* Links and Media Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <MenuButton
                  onClick={insertLink}
                  active={editor.isActive('link')}
                  title="Add Link"
                >
                  <FaLink />
                </MenuButton>
                <MenuButton
                  onClick={removeLink}
                  disabled={!editor.isActive('link')}
                  title="Remove Link"
                >
                  <FaUnlink />
                </MenuButton>
                <MenuButton
                  onClick={insertImage}
                  title="Insert Image (URL)"
                >
                  <FaImage />
                </MenuButton>
                <MenuButton
                  onClick={uploadImage}
                  title="Upload Image"
                >
                  <FaUpload />
                </MenuButton>
                <MenuButton
                  onClick={insertTable}
                  title="Insert Table"
                >
                  <FaTable />
                </MenuButton>
              </div>

              {/* Special Elements Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <MenuButton
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  title="Horizontal Rule"
                >
                  <FaMinus />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().setHardBreak().run()}
                  title="Line Break"
                >
                  <FaPlus />
                </MenuButton>
              </div>

              {/* Table Controls Group */}
              {editor && editor.isActive('table') && (
                <div className={`flex items-center border-r pr-4 mr-4 ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <MenuButton
                    onClick={addColumnBefore}
                    disabled={!editor.can().addColumnBefore()}
                    title="Add Column Before"
                  >
                    <span className="text-xs">+Col</span>
                  </MenuButton>
                  <MenuButton
                    onClick={addColumnAfter}
                    disabled={!editor.can().addColumnAfter()}
                    title="Add Column After"
                  >
                    <span className="text-xs">Col+</span>
                  </MenuButton>
                  <MenuButton
                    onClick={deleteColumn}
                    disabled={!editor.can().deleteColumn()}
                    title="Delete Column"
                  >
                    <span className="text-xs">-Col</span>
                  </MenuButton>
                  <MenuButton
                    onClick={addRowBefore}
                    disabled={!editor.can().addRowBefore()}
                    title="Add Row Before"
                  >
                    <span className="text-xs">+Row</span>
                  </MenuButton>
                  <MenuButton
                    onClick={addRowAfter}
                    disabled={!editor.can().addRowAfter()}
                    title="Add Row After"
                  >
                    <span className="text-xs">Row+</span>
                  </MenuButton>
                  <MenuButton
                    onClick={deleteRow}
                    disabled={!editor.can().deleteRow()}
                    title="Delete Row"
                  >
                    <span className="text-xs">-Row</span>
                  </MenuButton>
                  <MenuButton
                    onClick={deleteTable}
                    disabled={!editor.can().deleteTable()}
                    title="Delete Table"
                  >
                    <FaTrash />
                  </MenuButton>
                </div>
              )}

              {/* Typography and Formatting Group */}
              <div className={`flex items-center border-r pr-4 mr-4 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <MenuButton
                  onClick={() => editor.chain().focus().clearNodes().run()}
                  title="Clear Formatting"
                >
                  <FaEraser />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  active={editor.isActive('paragraph')}
                  title="Paragraph"
                >
                  <FaParagraph />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  active={editor.isActive('code')}
                  title="Inline Code"
                >
                  <FaCode />
                </MenuButton>
              </div>

              {/* History Group */}
              <div className="flex items-center ml-4">
                <MenuButton
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  title="Undo"
                >
              <FaUndo />
            </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  title="Redo"
                >
              <FaRedo />
            </MenuButton>
              </div>
          </div>

          {/* Editor */}
          <div className={`flex-1 overflow-y-auto ${
            isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="max-w-4xl mx-auto my-8">
              <div className={`rounded-lg shadow-sm border min-h-[800px] ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                {error ? (
                  <div className="p-8 text-center">
                    <div className="text-red-500 text-lg font-medium">{error}</div>
                  </div>
                ) : (
                  <div className="relative">
                    <EditorContent 
                      ref={editorRef}
                      editor={editor} 
                      className="custom-editor-content max-w-none p-8 focus:outline-none" 
                      style={{ 
                        color: isDarkMode ? '#ffffff' : '#374151',
                        fontSize: '16px',
                        lineHeight: '1.6'
                      }} 
                    />
                    
                    {/* Custom Cursor Overlay */}
                    <CursorOverlay 
                      editor={editor}
                      remoteCursors={remoteCursors}
                      editorRef={editorRef}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className={`border-t px-6 py-3 flex items-center justify-between ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center space-x-2 text-sm ${
                status === 'connected' ? 'text-green-500' : 'text-yellow-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span>
                  {status === 'connected' ? 
                    (saving ? 'Saving...' : 'All changes saved') : 
                    'Connecting...'}
                </span>
              </span>
              
              {/* Permission indicator */}
              {!isOwner && (
                <span className={`inline-flex items-center space-x-2 text-sm ${
                  userPermission === 'view' ? 'text-orange-500' : 'text-blue-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    userPermission === 'view' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <span>
                    Shared with {userPermission} access
                  </span>
                </span>
              )}
            </div>
            <div className={`flex items-center space-x-4 text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <span>Word count: {editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0}</span>
              <span>Page 1</span>
            </div>
          </div>

          {/* Save Success Notification */}
          {saveSuccess && (
            <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Document saved successfully!</span>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        resourceType="document"
        resourceId={id}
        resourceName={title || `Document ${id}`}
        onShareSuccess={() => {
          setShowShareModal(false);
          console.log('✅ Document shared successfully');
          // Note: No need to refresh shared items here since we're in the editor
        }}
      />
    </Page>
  );
};

export default TextEditor;