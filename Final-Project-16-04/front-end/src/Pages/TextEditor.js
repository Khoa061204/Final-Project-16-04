// front-end/src/Pages/TextEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaRedo,
  FaUndo,
  FaHeading,
  FaCode,
} from 'react-icons/fa';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TextEditor = () => {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('connecting');
  const { id } = useParams();
  const navigate = useNavigate();

  // Initialize Yjs document and provider
  const ydoc = useRef(new Y.Doc());
  const provider = useRef(null);

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc.current,
        field: 'content',
      }),
      CollaborationCursor.configure({
        provider: provider.current,
        user: {
          name: localStorage.getItem('username') || 'Anonymous',
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        },
      }),
    ],
    autofocus: true,
  });

  // Set up WebSocket connection
  useEffect(() => {
    if (!id || !editor) return;

    // Connect to WebSocket provider
    provider.current = new WebsocketProvider(
      'ws://localhost:1234',
      id,
      ydoc.current
    );

    provider.current.on('status', event => {
      setStatus(event.status);
    });

    // Cleanup on unmount
    return () => {
      if (provider.current) {
        provider.current.destroy();
      }
      if (ydoc.current) {
        ydoc.current.destroy();
      }
    };
  }, [id, editor]);

  // Load document content
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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
        setTitle(data.document.title || 'Untitled Document');
        
        // If there's content and editor is ready, set the content
        if (data.document.content && editor) {
          try {
            const content = JSON.parse(data.document.content);
            editor.commands.setContent(content);
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

    if (id && editor) {
      loadDocument();
    }
  }, [id, editor, navigate]);

  // Save document content
  const saveDocument = async () => {
    if (!editor || !id) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          content: JSON.stringify(editor.getJSON())
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    if (!editor || !id) return;

    const timeoutId = setTimeout(() => {
      saveDocument();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [editor?.getHTML(), title]);

  // Redirect if no document ID
  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
  }, [id, navigate]);

  if (!editor) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  const MenuButton = ({ onClick, active, children }) => (
    <button
      onClick={onClick}
      className={`p-2 mx-1 rounded transition-colors ${
        active ? 'bg-gray-200' : 'hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <div className="flex-1 bg-white">
          {/* Document title */}
          <div className="border-b border-gray-200 p-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-medium w-full outline-none"
              placeholder="Untitled Document"
            />
          </div>

          {/* Toolbar */}
          <div className="border-b border-gray-200 p-2 flex items-center flex-wrap">
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
            >
              <FaBold />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
            >
              <FaItalic />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
            >
              <FaUnderline />
            </MenuButton>
            
            <div className="mx-2 h-6 w-px bg-gray-200" />
            
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
            >
              <FaHeading />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
            >
              <FaListUl />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
            >
              <FaListOl />
            </MenuButton>
            
            <div className="mx-2 h-6 w-px bg-gray-200" />
            
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
            >
              <FaQuoteLeft />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
            >
              <FaCode />
            </MenuButton>
            
            <div className="mx-2 h-6 w-px bg-gray-200" />
            
            <MenuButton onClick={() => editor.chain().focus().undo().run()}>
              <FaUndo />
            </MenuButton>
            <MenuButton onClick={() => editor.chain().focus().redo().run()}>
              <FaRedo />
            </MenuButton>
          </div>

          {/* Editor */}
          <div className="p-8 max-w-4xl mx-auto">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <EditorContent editor={editor} className="prose max-w-none" />
            )}
          </div>

          {/* Status */}
          <div className="fixed bottom-4 right-4 flex items-center space-x-4">
            <span className={`inline-block w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm text-gray-500">
              {status === 'connected' ? 
                (saving ? 'Saving...' : 'All changes saved') : 
                'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;