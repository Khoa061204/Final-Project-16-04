import { useEffect, useCallback } from 'react';

const useKeyboardShortcuts = ({
  onSearch,
  onNewFile,
  onNewFolder,
  onNewDocument,
  onDelete,
  onSelectAll,
  onDeselectAll,
  onRefresh,
  onUpload,
  onToggleSelectionMode,
  onEscape,
  onEnter,
  onBackspace,
  isSelectionMode = false,
  selectedItems = [],
  currentFolderId = null
}) => {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.tagName === 'SELECT' ||
        event.target.contentEditable === 'true') {
      return;
    }

    const { key, ctrlKey, shiftKey, metaKey, altKey } = event;

    // Ctrl/Cmd + F: Search
    if ((ctrlKey || metaKey) && key === 'f') {
      event.preventDefault();
      onSearch?.();
      return;
    }

    // Ctrl/Cmd + N: New item
    if ((ctrlKey || metaKey) && key === 'n') {
      event.preventDefault();
      if (shiftKey) {
        onNewFolder?.();
      } else {
        onNewDocument?.();
      }
      return;
    }

    // Ctrl/Cmd + U: Upload
    if ((ctrlKey || metaKey) && key === 'u') {
      event.preventDefault();
      onUpload?.();
      return;
    }

    // Delete/Backspace: Delete selected items
    if (key === 'Delete' || key === 'Backspace') {
      if (isSelectionMode && selectedItems.length > 0) {
        event.preventDefault();
        onDelete?.();
        return;
      }
    }

    // Ctrl/Cmd + A: Select all
    if ((ctrlKey || metaKey) && key === 'a') {
      event.preventDefault();
      if (isSelectionMode) {
        onSelectAll?.();
      } else {
        onToggleSelectionMode?.();
      }
      return;
    }

    // Escape: Cancel selection mode or close modals
    if (key === 'Escape') {
      event.preventDefault();
      onEscape?.();
      return;
    }

    // Enter: Open selected item
    if (key === 'Enter') {
      event.preventDefault();
      onEnter?.();
      return;
    }

    // Ctrl/Cmd + R: Refresh
    if ((ctrlKey || metaKey) && key === 'r') {
      event.preventDefault();
      onRefresh?.();
      return;
    }

    // Ctrl/Cmd + Shift + N: New folder
    if ((ctrlKey || metaKey) && shiftKey && key === 'N') {
      event.preventDefault();
      onNewFolder?.();
      return;
    }

    // Ctrl/Cmd + D: Deselect all
    if ((ctrlKey || metaKey) && key === 'd') {
      event.preventDefault();
      onDeselectAll?.();
      return;
    }

    // Alt + Arrow keys for navigation
    if (altKey) {
      switch (key) {
        case 'ArrowLeft':
          event.preventDefault();
          // Navigate back
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Navigate forward
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Navigate to parent folder
          break;
        default:
          break;
      }
    }

    // Number keys for quick actions (when not in input)
    if (!ctrlKey && !metaKey && !altKey && !shiftKey) {
      switch (key) {
        case '1':
          // Switch to "All" tab
          break;
        case '2':
          // Switch to "Recent" tab
          break;
        case '3':
          // Switch to "Shared" tab
          break;
        case '4':
          // Switch to "Favorites" tab
          break;
        default:
          break;
      }
    }
  }, [
    onSearch,
    onNewFile,
    onNewFolder,
    onNewDocument,
    onDelete,
    onSelectAll,
    onDeselectAll,
    onRefresh,
    onUpload,
    onToggleSelectionMode,
    onEscape,
    onEnter,
    onBackspace,
    isSelectionMode,
    selectedItems.length
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

export default useKeyboardShortcuts; 