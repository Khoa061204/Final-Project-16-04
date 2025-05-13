// front-end/src/Pages/TextEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const TextEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [title, setTitle] = useState('Untitled Document');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  // Get auth token from localStorage
  const getToken = () => localStorage.getItem('authToken');

  // Load document content
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const response = await fetch(`http://localhost:5000/documents/${id}`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load document');
        }

        const data = await response.json();
        setTitle(data.document.title);
        
        // Convert the stored content back to EditorState
        if (data.document.content) {
          const content = JSON.parse(data.document.content);
          const contentState = convertFromRaw(content);
          setEditorState(EditorState.createWithContent(contentState));
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      }
    };

    if (id) {
      loadDocument();
    }
  }, [id]);

  // Save document content
  const saveDocument = async () => {
    setSaving(true);
    try {
      const content = convertToRaw(editorState.getCurrentContent());
      
      const response = await fetch(`http://localhost:5000/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          title,
          content: JSON.stringify(content)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      setSaving(false);
    } catch (err) {
      console.error('Error saving document:', err);
      setError('Failed to save document');
      setSaving(false);
    }
  };

  // Auto-save when content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (id) {
        saveDocument();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [editorState, title]);

  // Handle keyboard shortcuts
  const handleKeyCommand = (command) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  // Style buttons
  const StyleButton = ({ style, icon, active }) => {
    return (
      <button
        className={`p-2 mx-1 rounded ${
          active ? 'bg-gray-200' : 'hover:bg-gray-100'
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setEditorState(RichUtils.toggleInlineStyle(editorState, style));
        }}
      >
        {icon}
      </button>
    );
  };

  // Block type buttons
  const BlockButton = ({ block, icon, active }) => {
    return (
      <button
        className={`p-2 mx-1 rounded ${
          active ? 'bg-gray-200' : 'hover:bg-gray-100'
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setEditorState(RichUtils.toggleBlockType(editorState, block));
        }}
      >
        {icon}
      </button>
    );
  };

  const currentStyle = editorState.getCurrentInlineStyle();
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

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
          <div className="border-b border-gray-200 p-2 flex items-center">
            <StyleButton
              style="BOLD"
              icon="B"
              active={currentStyle.has('BOLD')}
            />
            <StyleButton
              style="ITALIC"
              icon="I"
              active={currentStyle.has('ITALIC')}
            />
            <StyleButton
              style="UNDERLINE"
              icon="U"
              active={currentStyle.has('UNDERLINE')}
            />
            <div className="mx-2 h-6 w-px bg-gray-200" />
            <BlockButton
              block="header-one"
              icon="H1"
              active={blockType === 'header-one'}
            />
            <BlockButton
              block="header-two"
              icon="H2"
              active={blockType === 'header-two'}
            />
            <BlockButton
              block="unordered-list-item"
              icon="•"
              active={blockType === 'unordered-list-item'}
            />
            <BlockButton
              block="ordered-list-item"
              icon="1."
              active={blockType === 'ordered-list-item'}
            />
          </div>

          {/* Editor */}
          <div 
            className="p-8 max-w-4xl mx-auto"
            onClick={() => editorRef.current?.focus()}
          >
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <Editor
                ref={editorRef}
                editorState={editorState}
                onChange={setEditorState}
                handleKeyCommand={handleKeyCommand}
                placeholder="Start typing..."
              />
            )}
          </div>

          {/* Save status */}
          <div className="fixed bottom-4 right-4">
            <span className="text-sm text-gray-500">
              {saving ? 'Saving...' : 'All changes saved'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;