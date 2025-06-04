// front-end/src/Pages/TextEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import Topbar from '../components/Topbar';
import {
  FaBold,
  FaItalic,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaRedo,
  FaUndo,
  FaHeading,
  FaCode,
  FaStrikethrough,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaSubscript,
  FaSuperscript,
  FaIndent,
  FaOutdent,
  FaLink,
  FaUnlink,
  FaTable,
  FaImage,
  FaUnderline,
  FaHighlighter,
} from 'react-icons/fa';
import { Editor } from '@tiptap/core';
import Page from '../components/Page';
import PagedEditor from './PagedEditor';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CollabUserList from '../components/CollabUserList';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { useContext } from 'react';
import { AuthContext } from '../App';
import CollaborationCursorOverlay from '../components/CollaborationCursorOverlay';

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
  const { user } = useContext(AuthContext);
  const overlayRef = useRef(null);

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
        
        // If it's a PDF, convert it to text
        if (data.document.file_type === 'pdf') {
          try {
            const convertResponse = await fetch(`${API_BASE_URL}/documents/${id}/convert-pdf`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
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
        
        // If there's content and editor is ready, set the content
        if (data.document.content && editor) {
          try {
            let content = data.document.content;
            if (typeof content === 'string') {
              content = JSON.parse(content);
            }
            // Defensive clean: strip 'attrs' from 'text' nodes
            const cleanTextNodeAttrs = (node) => {
              if (!node) return node;
              if (Array.isArray(node)) return node.map(cleanTextNodeAttrs);
              if (node.type === 'text' && node.attrs) {
                const { attrs, ...rest } = node;
                return rest;
              }
              if (node.content) {
                return { ...node, content: cleanTextNodeAttrs(node.content) };
              }
              return node;
            };
            content = cleanTextNodeAttrs(content);
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

  // Initialize editor when provider is connected
  useEffect(() => {
    if (status !== 'connected' || !ydocRef.current || !providerRef.current) return;

    // Helper to clear overlay
    function clearOverlay() {
      if (overlayRef.current) {
        overlayRef.current.innerHTML = '';
      }
    }

    const newEditor = new Editor({
      extensions: [
        StarterKit.configure({
          // Disable default underline to use our custom one
          underline: false,
        }),
        TextStyle,
        Underline,
        Color.configure({
          types: ['textStyle'],
        }),
        Subscript,
        Superscript,
        Link,
        Image,
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        Collaboration.configure({
          document: ydocRef.current,
        }),
        CollaborationCursor.configure({
          provider: providerRef.current,
          user: {
            name: user?.name || user?.username || user?.email || 'Anonymous',
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
          },
          renderLabel() {
            // Always return null, label is rendered by React overlay
            return null;
          }
        }),
        Highlight,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        },
      },
      content: document?.content,
      editable: true,
    });

    setEditor(newEditor);

    // Clean up overlay on unmount
    return () => {
      clearOverlay();
      if (newEditor) {
        newEditor.destroy();
      }
    };
  }, [status, document?.content, user]);

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

  // Add this useEffect after the state declarations in TextEditor
  useEffect(() => {
    if (!id) return;
    // Create a new Yjs document
    ydocRef.current = new Y.Doc();
    // Connect to the WebSocket server on the correct port
    providerRef.current = new WebsocketProvider(
      'ws://localhost:1234', // Changed from ws://localhost:3000/ws
      `document-${id}`,
      ydocRef.current
    );
    providerRef.current.on('status', event => {
      setStatus(event.status); // "connected" or "disconnected"
    });
    return () => {
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, [id]);

  if (!editor) {
    return (
      <div className="flex h-screen">
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
          {/* Show active collaborators above the editor */}
          <CollabUserList provider={providerRef.current} />
          <div className="flex-1 bg-white overflow-y-auto" style={{ position: 'relative' }}>
            {/* Overlay for floating cursor labels */}
            <CollaborationCursorOverlay editor={editor} provider={providerRef.current} />
            {/* Document title with Return to Home button */}
            <div className="p-4 flex items-center">
              <button
                onClick={handleReturnHome}
                className="mr-4 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
              >
                ← Home
              </button>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>

            {/* Toolbar */}
            <div className="border-b border-gray-200 p-2 flex items-center flex-wrap gap-1 bg-gray-50">
              {/* Text Formatting Group */}
              <div className="flex items-center border-r border-gray-200 pr-2">
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
              <div className="flex items-center border-r border-gray-200 pr-2">
                <input
                  type="color"
                  onChange={e => {
                    editor.chain().focus().setColor(e.target.value).run();
                  }}
                  className="w-8 h-8 p-1 rounded cursor-pointer"
                  title="Text Color"
                />
                <MenuButton
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  title="Remove Color"
                >
                  <span className="text-gray-500">×</span>
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleHighlight().run()}
                  active={editor.isActive('highlight')}
                  title="Highlight"
                >
                  <FaHighlighter />
                </MenuButton>
              </div>

              {/* Alignment Group */}
              <div className="flex items-center border-r border-gray-200 pr-2">
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
              <div className="flex items-center border-r border-gray-200 pr-2">
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
              <div className="flex items-center border-r border-gray-200 pr-2">
                <MenuButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  active={editor.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  H1
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  active={editor.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  H2
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  active={editor.isActive('heading', { level: 3 })}
                  title="Heading 3"
                >
                  H3
                </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
                  title="Blockquote"
            >
              <FaQuoteLeft />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
                  title="Code Block"
            >
              <FaCode />
            </MenuButton>
              </div>

              {/* Links and Media Group */}
              <div className="flex items-center border-r border-gray-200 pr-2">
                <MenuButton
                  onClick={() => {
                    const url = window.prompt('Enter URL');
                    if (url) {
                      editor.chain().focus().setLink({ href: url }).run();
                    }
                  }}
                  active={editor.isActive('link')}
                  title="Add Link"
                >
                  <FaLink />
                </MenuButton>
                <MenuButton
                  onClick={() => editor.chain().focus().unsetLink().run()}
                  disabled={!editor.isActive('link')}
                  title="Remove Link"
                >
                  <FaUnlink />
                </MenuButton>
                <MenuButton
                  onClick={() => {
                    const url = window.prompt('Enter image URL');
                    if (url) {
                      editor.chain().focus().setImage({ src: url }).run();
                    }
                  }}
                  title="Insert Image"
                >
                  <FaImage />
                </MenuButton>
                <MenuButton
                  onClick={() => {
                    // Add table insertion logic here
                    editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run();
                  }}
                  title="Insert Table"
                >
                  <FaTable />
                </MenuButton>
              </div>

              {/* History Group */}
              <div className="flex items-center">
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
                <button
                  onClick={saveDocument}
                  disabled={!editor || !id}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  title="Save Document"
                >
                  Save
                </button>
              </div>
          </div>

          {/* Editor */}
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