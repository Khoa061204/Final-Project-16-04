import React from 'react';
import { EditorContent } from '@tiptap/react';

// Constants for page size (in blocks, as a proxy for height)
const BLOCKS_PER_PAGE = 15;

function splitBlocksIntoPages(blocks, blocksPerPage) {
  const pages = [];
  for (let i = 0; i < blocks.length; i += blocksPerPage) {
    pages.push(blocks.slice(i, i + blocksPerPage));
  }
  return pages;
}

const PagedEditor = ({ editor }) => {
  if (!editor) return null;

  // Get the editor content as JSON
  const json = editor.getJSON();
  // Get block nodes (assume json.content is an array of blocks)
  const blocks = Array.isArray(json.content) ? json.content : [];
  // Split blocks into pages
  const pages = splitBlocksIntoPages(blocks, BLOCKS_PER_PAGE);

  return (
    <div className="tiptap-paged-editor">
      {pages.map((pageBlocks, pageIndex) => (
        <div key={pageIndex} className="tiptap-page" style={{ position: 'relative' }}>
          {/* Render each block as its own EditorContent */}
          <EditorContent
            editor={editor}
            content={{ type: 'doc', content: pageBlocks }}
            className="prose max-w-none"
          />
          {/* Page Number */}
          <div style={{
            position: 'absolute',
            bottom: 8,
            right: 24,
            fontSize: '0.9rem',
            color: '#aaa'
          }}>
            Page {pageIndex + 1}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PagedEditor; 