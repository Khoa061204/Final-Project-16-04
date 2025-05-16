// front-end/src/Pages/TextEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
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
import { Editor } from '@tiptap/core';
import Page from '../components/Page';
import PagedEditor from './PagedEditor';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TextEditor = () => {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('connecting');
  const { id } = useParams();
  const navigate = useNavigate();
  const [editor, setEditor] = useState(null);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!id) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const provider = new WebsocketProvider('ws://localhost:1234', id, ydoc);
    providerRef.current = provider;

    provider.on('status', event => {
      setStatus(event.status);
      if (event.status === 'connected') {
        const newEditor = new Editor({
          extensions: [
            StarterKit.configure({ history: false }),
            Collaboration.configure({ document: ydoc, field: 'content' }),
            CollaborationCursor.configure({
              provider,
              user: {
                name: localStorage.getItem('username') || 'Anonymous',
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
              },
            }),
            Highlight,
            TextStyle,
          ],
          autofocus: true,
        });
        setEditor(newEditor);
      }
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
      if (editor) editor.destroy();
    };
    // eslint-disable-next-line
  }, [id]);

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
    console.log('Save button clicked', { editorPresent: !!editor, id });
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
          content: editor.getJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      // Show success message
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 2000);
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
    <Page>
      <div className="flex h-screen">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-white overflow-y-auto">
            {/* Document title with Return to Home button */}
            <div className="p-4 flex items-center">
              <button
                onClick={handleReturnHome}
                className="mr-4 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
              >
                ← Home
              </button>
            </div>

            {/* Toolbar */}
            <div className="border-b border-gray-200 p-2 flex items-center flex-wrap">
              {/* Font Family */}
              <select
                className="mr-2 px-2 py-1 border rounded text-sm"
                onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
                defaultValue="inherit"
              >
                <option value="inherit">Font</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>
              {/* Font Size */}
              <select
                className="mr-2 px-2 py-1 border rounded text-sm"
                onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}
                defaultValue="16px"
              >
                <option value="12px">12</option>
                <option value="14px">14</option>
                <option value="16px">16</option>
                <option value="18px">18</option>
                <option value="24px">24</option>
                <option value="32px">32</option>
              </select>
              {/* Highlight */}
              <MenuButton
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                active={editor.isActive('highlight')}
              >
                <span style={{ background: 'yellow', padding: '0 4px' }}>H</span>
              </MenuButton>
              {/* Alignment */}
              <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>L</MenuButton>
              <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>C</MenuButton>
              <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>R</MenuButton>
              <MenuButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}>J</MenuButton>
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
              <MenuButton onClick={saveDocument} disabled={!editor || !id}>
                Save
              </MenuButton>
            </div>

            {/* Editor */}
            {document && document.type === 'pdf' && document.pdfUrl ? (
              <div style={{ width: '100%', height: '90vh', background: '#eee' }}>
                <iframe
                  src={document.pdfUrl}
                  title={document.title}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              </div>
            ) : (
              <div className="tiptap-paged-editor">
                <div className="tiptap-page" style={{ position: 'relative' }}>
                  {error ? (
                    <div className="text-red-500">{error}</div>
                  ) : (
                    <EditorContent editor={editor} className="prose max-w-none" />
                  )}
                  {/* Page Number */}
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 24,
                    fontSize: '0.9rem',
                    color: '#aaa'
                  }}>
                    Page 1
                  </div>
                </div>
              </div>
            )}

            {/* Word Counter */}
            <div className="fixed bottom-0 left-0 w-full bg-gray-100 border-t border-gray-300 py-2 px-8 flex justify-end items-center z-50" style={{height: '40px'}}>
              <span className="text-gray-700 text-sm">Word count: {editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0}</span>
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
            {saveSuccess && (
              <div className="fixed bottom-16 right-4 bg-green-500 text-white px-4 py-2 rounded shadow">
                Document saved!
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
};

export default TextEditor;