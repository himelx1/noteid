/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Menu,
  FileText,
  Search,
  Pin,
  Lock,
  LayoutGrid,
  List,
  ArrowUpDown,
  Clock,
  X,
  FolderOpen,
  Trash2
} from "lucide-react";
import { Note, Folder } from "../types";
import { getTimeSticker, stripHtml, getCardBackgroundClass } from "../utils";
import { saveNote } from "../db";
import { ConfirmationDialog } from "./ConfirmationDialog";

interface NoteListProps {
  username: string;
  activeProfile: 'personal' | 'work';
  notes: Note[];
  folders: Folder[];
  selectedFolderId: string;
  onSelectNote: (note: Note | null) => void;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  onRefreshData: () => void;
  
  viewMode: 'list' | 'grid';
  onViewModeChange: (view: 'list' | 'grid') => void;
  sortBy: 'updated' | 'created';
  onSortByChange: (sort: 'updated' | 'created') => void;
}

export function NoteList({
  username,
  activeProfile,
  notes,
  folders,
  selectedFolderId,
  onSelectNote,
  onOpenMenu,
  onOpenSearch,
  onRefreshData,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: NoteListProps) {
  // Sorted notes reference
  // Sorting: Pinned notes first, then chosen criteria (Last edited or Date created)
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    if (sortBy === "created") {
      return b.createdAt - a.createdAt;
    }
    return b.updatedAt - a.updatedAt;
  });

  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Multi-selection states
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [preventClick, setPreventClick] = useState<boolean>(false);

  // Bulk actions Dialog states
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [showFolderSelector, setShowFolderSelector] = useState<boolean>(false);
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string | null>(null);
  const [isConfirmingMove, setIsConfirmingMove] = useState<boolean>(false);
  
  // Lazy loading state for scalable performance with thousands of notes
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  // Reset pagination count when active profile, folder, note count, or sort changes
  React.useEffect(() => {
    setVisibleCount(20);
  }, [selectedFolderId, activeProfile, notes.length, sortBy]);

  // Set up intersection observer to dynamically load more notes when scrolled to the bottom
  React.useEffect(() => {
    if (visibleCount >= sortedNotes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, sortedNotes.length));
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleCount, sortedNotes.length]);

  const handleSelectToggle = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      if (prev.includes(noteId)) {
        return prev.filter((id) => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };

  const startPress = (noteId: string) => {
    setPreventClick(false);
    const timer = setTimeout(() => {
      handleSelectToggle(noteId);
      setPreventClick(true);
    }, 600);
    setLongPressTimer(timer);
  };

  const endPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (preventClick) {
      setPreventClick(false);
      return;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (selectedNoteIds.length > 0) {
      handleSelectToggle(note.id);
    } else {
      onSelectNote(note);
    }
  };

  const selectedNotes = sortedNotes.filter(n => selectedNoteIds.includes(n.id));
  const allSelectedPinned = selectedNotes.length > 0 && selectedNotes.every(n => n.isPinned);

  const displayedNotes = sortedNotes.slice(0, visibleCount);

  const handleBulkPin = async () => {
    try {
      const pinValue = !allSelectedPinned;
      for (const note of selectedNotes) {
        const updated: Note = {
          ...note,
          isPinned: pinValue,
          updatedAt: Date.now()
        };
        await saveNote(updated);
      }
      setSelectedNoteIds([]);
      onRefreshData();
    } catch (err) {
      console.error("Failed to pin/unpin notes in bulk:", err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const now = Date.now();
      for (const note of selectedNotes) {
        const updated: Note = {
          ...note,
          isDeleted: true,
          deletedAt: now,
          updatedAt: now
        };
        await saveNote(updated);
      }
      setSelectedNoteIds([]);
      setIsConfirmingDelete(false);
      onRefreshData();
    } catch (err) {
      console.error("Failed to delete notes in bulk:", err);
    }
  };

  const handleBulkMove = async () => {
    if (!selectedTargetFolderId) return;
    try {
      const folderIdVal = selectedTargetFolderId === "uncategorized" ? undefined : selectedTargetFolderId;
      const now = Date.now();
      for (const note of selectedNotes) {
        const updated: Note = {
          ...note,
          folderId: folderIdVal,
          updatedAt: now
        };
        await saveNote(updated);
      }
      setSelectedNoteIds([]);
      setSelectedTargetFolderId(null);
      setIsConfirmingMove(false);
      onRefreshData();
    } catch (err) {
      console.error("Failed to move notes in bulk:", err);
    }
  };

  const activeFolderName = selectedFolderId === "all"
    ? "All Notes"
    : selectedFolderId === "uncategorized"
      ? "Uncategorized"
      : folders.find(f => f.id === selectedFolderId)?.name || "Folder";

  // Split into two columns for Grid View Masonry layout (independent heights, no unwanted gaps)
  const col1: Note[] = [];
  const col2: Note[] = [];
  displayedNotes.forEach((note, index) => {
    if (index % 2 === 0) {
      col1.push(note);
    } else {
      col2.push(note);
    }
  });

  // Common card rendering component
  const renderNoteCard = (note: Note) => {
    const stripped = stripHtml(note.content);
    const contentPreview = stripped ? stripped : "Empty note";
    const isSelected = selectedNoteIds.includes(note.id);

    return (
      <div
        key={note.id}
        id={`note-card-${note.id}`}
        onClick={(e) => handleCardClick(e, note)}
        onMouseDown={() => startPress(note.id)}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={() => startPress(note.id)}
        onTouchEnd={endPress}
        onTouchMove={endPress}
        className={`group border rounded-2xl p-4.5 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden active:scale-[0.99] min-h-[100px] max-h-[180px] select-none ${getCardBackgroundClass(note.background, isSelected)}`}
      >
        <div className="flex gap-3.5 min-w-0 flex-1">
          {selectedNoteIds.length > 0 && (
            <div className="flex items-center shrink-0">
              <div 
                id={`note-card-select-${note.id}`}
                className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-charcoal-50 border-charcoal-50 text-charcoal-900"
                    : "border-charcoal-600 bg-charcoal-900/30"
                }`}
              >
                {isSelected && (
                  <svg className="w-2.5 h-2.5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-charcoal-100 group-hover:text-charcoal-50 truncate flex-1 leading-snug">
                {note.title || "Untitled Note"}
              </h3>
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {note.isLocked && <Lock className="w-3.5 h-3.5 text-charcoal-400" />}
                {note.isPinned && <Pin className="w-3.5 h-3.5 text-charcoal-400" />}
              </div>
            </div>
            {!note.isLocked && (
              <p className="text-xs text-charcoal-300 line-clamp-3 leading-relaxed font-sans font-medium">
                {contentPreview}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 text-[10px] text-charcoal-400 font-mono font-bold mt-2.5 pl-0.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-charcoal-500 shrink-0" />
            <span>{getTimeSticker(note.createdAt)}</span>
          </div>
          {(() => {
            const diffMins = Math.floor((Date.now() - note.updatedAt) / 60000);
            if (diffMins >= 1 && diffMins <= 59) {
              return (
                <span className="px-2 py-0.5 rounded bg-charcoal-850/60 text-charcoal-300 border border-charcoal-700/40 font-bold shrink-0">
                  Edited {diffMins}m
                </span>
              );
            }
            return null;
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen pb-28 max-w-2xl mx-auto w-full px-4 pt-4 animate-fade-in">
      
      {/* App Header Bar (Standard or Multi-Selection mode) */}
      {selectedNoteIds.length > 0 ? (
        <header className="flex items-center justify-between pb-4 border-b border-charcoal-800/80 mb-6 select-none relative z-20 animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              id="cancel-selection-btn"
              onClick={() => setSelectedNoteIds([])}
              className="w-10 h-10 rounded-xl bg-charcoal-800/50 border border-charcoal-700/40 hover:bg-charcoal-800 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm"
              title="Cancel Selection"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-charcoal-50">{selectedNoteIds.length} Selected</span>
              <span className="text-[10px] font-mono text-charcoal-400">Bulk action mode</span>
            </div>
          </div>

          <button
            id="select-all-btn"
            onClick={() => {
              if (selectedNoteIds.length === sortedNotes.length) {
                setSelectedNoteIds([]);
              } else {
                setSelectedNoteIds(sortedNotes.map(n => n.id));
              }
            }}
            className="text-xs font-bold text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors"
          >
            {selectedNoteIds.length === sortedNotes.length ? "Deselect All" : "Select All"}
          </button>
        </header>
      ) : (
        <header className="flex items-center justify-between pb-4 border-b border-charcoal-800/80 mb-6 select-none relative z-20">
          <div className="flex items-center gap-3">
            {/* Menu Button */}
            <button
              id="open-menu-btn"
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl bg-charcoal-800/50 border border-charcoal-700/40 hover:bg-charcoal-800 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-charcoal-50">{activeFolderName}</span>
              <span className="text-[10px] font-mono text-charcoal-400">
                {username} • <span className="capitalize text-charcoal-300 font-bold">{activeProfile}</span>
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* Sort Switcher Dropdown */}
            <div className="relative">
              <button
                id="sort-switcher-btn"
                onClick={() => {
                  setIsSortDropdownOpen(!isSortDropdownOpen);
                  setIsViewDropdownOpen(false);
                }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm ${
                  isSortDropdownOpen 
                    ? "bg-charcoal-800 border-charcoal-600 text-charcoal-100" 
                    : "bg-charcoal-800/50 border-charcoal-700/40 hover:bg-charcoal-800"
                }`}
                title="Sort Notes"
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
              {isSortDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-charcoal-850 border border-charcoal-700 rounded-2xl p-1 shadow-2xl z-50 animate-fade-in backdrop-blur-md select-none">
                  <button
                    id="sort-by-updated"
                    onClick={() => {
                      onSortByChange("updated");
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      sortBy === "updated"
                        ? "bg-charcoal-800 text-charcoal-50"
                        : "text-charcoal-400 hover:bg-charcoal-800/40 hover:text-charcoal-200"
                    }`}
                  >
                    <span>Last edited</span>
                    {sortBy === "updated" && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-50" />}
                  </button>
                  <button
                    id="sort-by-created"
                    onClick={() => {
                      onSortByChange("created");
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      sortBy === "created"
                        ? "bg-charcoal-800 text-charcoal-50"
                        : "text-charcoal-400 hover:bg-charcoal-800/40 hover:text-charcoal-200"
                    }`}
                  >
                    <span>Date created</span>
                    {sortBy === "created" && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-50" />}
                  </button>
                </div>
              )}
            </div>

            {/* View Switcher Dropdown */}
            <div className="relative">
              <button
                id="view-switcher-btn"
                onClick={() => {
                  setIsViewDropdownOpen(!isViewDropdownOpen);
                  setIsSortDropdownOpen(false);
                }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm ${
                  isViewDropdownOpen 
                    ? "bg-charcoal-800 border-charcoal-600 text-charcoal-100" 
                    : "bg-charcoal-800/50 border-charcoal-700/40 hover:bg-charcoal-800"
                }`}
                title="Change View Mode"
              >
                {viewMode === "list" ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              </button>
              {isViewDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-charcoal-850 border border-charcoal-700 rounded-2xl p-1 shadow-2xl z-50 animate-fade-in backdrop-blur-md select-none">
                  <button
                    id="view-mode-list"
                    onClick={() => {
                      onViewModeChange("list");
                      setIsViewDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      viewMode === "list"
                        ? "bg-charcoal-800 text-charcoal-50"
                        : "text-charcoal-400 hover:bg-charcoal-800/40 hover:text-charcoal-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 text-charcoal-400" />
                      <span>List View</span>
                    </div>
                    {viewMode === "list" && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-50" />}
                  </button>
                  <button
                    id="view-mode-grid"
                    onClick={() => {
                      onViewModeChange("grid");
                      setIsViewDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-charcoal-800 text-charcoal-50"
                        : "text-charcoal-400 hover:bg-charcoal-800/40 hover:text-charcoal-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-charcoal-400" />
                      <span>Grid View</span>
                    </div>
                    {viewMode === "grid" && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-50" />}
                  </button>
                </div>
              )}
            </div>

            {/* Search Button */}
            <button
              id="open-search-btn"
              onClick={onOpenSearch}
              className="w-10 h-10 rounded-xl bg-charcoal-800/50 border border-charcoal-700/40 hover:bg-charcoal-800 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm"
              title="Search Notes"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* NOTES AREA */}
      <div className="flex-1">
        {sortedNotes.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              /* Grid View: 2 Columns, independent heights, no row alignment constraints, proper spacing */
              <div className="grid grid-cols-2 gap-3.5 items-start">
                <div className="flex flex-col gap-3.5">
                  {col1.map(note => renderNoteCard(note))}
                </div>
                <div className="flex flex-col gap-3.5">
                  {col2.map(note => renderNoteCard(note))}
                </div>
              </div>
            ) : (
              /* List View: 1 Column, full width, dynamic elegant heights */
              <div className="flex flex-col gap-3.5">
                {displayedNotes.map(note => renderNoteCard(note))}
              </div>
            )}

            {/* Scroll trigger target for dynamic pagination loading */}
            {visibleCount < sortedNotes.length && (
              <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center mt-6">
                <div className="w-5 h-5 border-2 border-charcoal-500/50 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3 animate-fade-in select-none">
            <FileText className="w-8 h-8 text-charcoal-600" />
            <span className="text-sm font-bold text-charcoal-400">No notes yet</span>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) - Hidden in selection mode */}
      {selectedNoteIds.length === 0 && (
        <button
          id="new-note-fab"
          onClick={() => onSelectNote(null)}
          className="fixed bottom-6 right-6 h-14 px-5 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all z-30 border border-white/5"
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span>New Note</span>
        </button>
      )}

      {/* Bulk Actions Bottom Bar */}
      {selectedNoteIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-charcoal-850/90 backdrop-blur-md border border-charcoal-700/50 rounded-2xl p-3 flex items-center justify-around z-40 animate-slide-in shadow-2xl select-none">
          <button
            id="bulk-pin-btn"
            onClick={handleBulkPin}
            className="flex flex-col items-center justify-center gap-1 text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors px-4 py-1"
          >
            <Pin className="w-5 h-5 text-charcoal-400" />
            <span className="text-[10px] font-bold tracking-wide">{allSelectedPinned ? "Unpin" : "Pin"}</span>
          </button>

          <button
            id="bulk-move-btn"
            onClick={() => {
              setSelectedTargetFolderId(null);
              setShowFolderSelector(true);
            }}
            className="flex flex-col items-center justify-center gap-1 text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors px-4 py-1"
          >
            <FolderOpen className="w-5 h-5 text-charcoal-400" />
            <span className="text-[10px] font-bold tracking-wide">Move</span>
          </button>

          <button
            id="bulk-delete-btn"
            onClick={() => setIsConfirmingDelete(true)}
            className="flex flex-col items-center justify-center gap-1 text-red-400 hover:text-red-300 cursor-pointer transition-colors px-4 py-1"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Delete</span>
          </button>
        </div>
      )}

      {/* Folder Selection Dialog/Overlay */}
      {showFolderSelector && (
        <div 
          id="folder-selector-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal-700 flex items-center justify-center text-charcoal-300 shrink-0 border border-charcoal-600/50">
                <FolderOpen className="w-5 h-5 text-charcoal-200" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-base font-bold text-charcoal-50">Move to Folder</h3>
                <p className="text-xs text-charcoal-300 leading-relaxed">Select a folder to move the {selectedNoteIds.length} selected notes.</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              <button
                id="folder-select-uncategorized"
                onClick={() => setSelectedTargetFolderId("uncategorized")}
                className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between border cursor-pointer transition-colors ${
                  selectedTargetFolderId === "uncategorized"
                    ? "bg-charcoal-700 border-charcoal-500 text-charcoal-50"
                    : "bg-charcoal-900/40 border-charcoal-800/40 text-charcoal-300 hover:bg-charcoal-800/30"
                }`}
              >
                <span>Uncategorized</span>
                {selectedTargetFolderId === "uncategorized" && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-50" />}
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  id={`folder-select-${folder.id}`}
                  onClick={() => setSelectedTargetFolderId(folder.id)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center justify-between border cursor-pointer transition-colors ${
                    selectedTargetFolderId === folder.id
                      ? "bg-charcoal-700 border-charcoal-500 text-charcoal-50"
                      : "bg-charcoal-900/40 border-charcoal-800/40 text-charcoal-300 hover:bg-charcoal-800/30"
                  }`}
                >
                  <span>{folder.name}</span>
                  {selectedTargetFolderId === folder.id && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-50" />}
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                id="folder-select-cancel"
                onClick={() => {
                  setShowFolderSelector(false);
                  setSelectedTargetFolderId(null);
                }}
                className="px-4 h-10 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-750 text-charcoal-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="folder-select-confirm"
                disabled={!selectedTargetFolderId}
                onClick={() => {
                  if (!selectedTargetFolderId) return;
                  setShowFolderSelector(false);
                  setIsConfirmingMove(true);
                }}
                className="px-5 h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 disabled:opacity-40 disabled:hover:bg-charcoal-50 text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmingDelete}
        title="Delete Multiple Notes?"
        message={`Are you sure you want to move the ${selectedNoteIds.length} selected notes to Trash?`}
        confirmLabel="Yes, Delete"
        cancelLabel="No"
        onConfirm={handleBulkDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />

      {/* Bulk Move Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmingMove}
        title="Move Multiple Notes?"
        message={`Are you sure you want to move the ${selectedNoteIds.length} selected notes to the chosen folder?`}
        confirmLabel="Yes, Move"
        cancelLabel="No"
        onConfirm={handleBulkMove}
        onCancel={() => setIsConfirmingMove(false)}
      />

    </div>
  );
}
