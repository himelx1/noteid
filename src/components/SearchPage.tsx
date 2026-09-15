/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Search, 
  FileText,
  LayoutGrid,
  List,
  ArrowUpDown,
  Clock,
  Pin,
  Lock
} from "lucide-react";
import { Note, Folder } from "../types";
import { getTimeSticker, stripHtml, getCardBackgroundClass } from "../utils";

interface SearchPageProps {
  username: string;
  activeProfile: 'personal' | 'work';
  notes: Note[]; // Already pre-filtered by the active profile and selected folder
  folders: Folder[];
  selectedFolderId: string;
  onSelectNote: (note: Note) => void;
  onClose: () => void;
  
  viewMode: 'list' | 'grid';
  onViewModeChange: (view: 'list' | 'grid') => void;
  sortBy: 'updated' | 'created';
  onSortByChange: (sort: 'updated' | 'created') => void;
}

export function SearchPage({
  username,
  activeProfile,
  notes,
  folders,
  selectedFolderId,
  onSelectNote,
  onClose,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
}: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Filter and sort notes based on matching title/content and sortBy option
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return notes
      .filter((note) => {
        const titleMatch = (note.title || "").toLowerCase().includes(query);
        if (note.isLocked) {
          return titleMatch;
        }
        const strippedContent = stripHtml(note.content || "");
        const contentMatch = strippedContent.toLowerCase().includes(query);
        return titleMatch || contentMatch;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        if (sortBy === "created") {
          return b.createdAt - a.createdAt;
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [searchQuery, notes, sortBy]);
  
  // Lazy loading state for scalable search results
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  // Reset pagination count on search term change
  React.useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, sortBy]);

  // Observer to load more search results
  React.useEffect(() => {
    if (visibleCount >= searchResults.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 20, searchResults.length));
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
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
  }, [visibleCount, searchResults.length]);

  const activeFolderName = useMemo(() => {
    if (selectedFolderId === "all") return "All Notes";
    if (selectedFolderId === "uncategorized") return "Uncategorized";
    return folders.find((f) => f.id === selectedFolderId)?.name || "Folder";
  }, [selectedFolderId, folders]);

  // Split results for Grid View masonry layout
  const displayedResults = searchResults.slice(0, visibleCount);

  const col1: Note[] = [];
  const col2: Note[] = [];
  displayedResults.forEach((note, index) => {
    if (index % 2 === 0) {
      col1.push(note);
    } else {
      col2.push(note);
    }
  });

  const renderNoteCard = (note: Note) => {
    const stripped = stripHtml(note.content);
    const contentPreview = stripped ? stripped : "Empty note";

    return (
      <div
        key={note.id}
        id={`search-result-note-${note.id}`}
        onClick={() => onSelectNote(note)}
        className={`group border rounded-2xl p-4.5 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden active:scale-[0.99] min-h-[100px] max-h-[180px] shadow-sm select-none ${getCardBackgroundClass(note.background, false)}`}
      >
        <div className="flex flex-col gap-1.5 min-w-0">
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
            <p className="text-xs text-charcoal-300 line-clamp-3 leading-relaxed font-sans">
              {contentPreview}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 text-[10px] text-charcoal-400 font-mono font-bold mt-2.5">
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
    <div className="fixed inset-0 z-40 bg-charcoal-900 flex flex-col h-full w-full max-w-md mx-auto border-x border-charcoal-800/40 animate-slide-in">
      {/* Search Header Bar */}
      <div className="h-16 shrink-0 px-4 flex items-center gap-2 bg-transparent border-b border-charcoal-800/40 select-none relative z-20">
        <button
          id="search-back-btn"
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative min-w-0">
          <input
            id="search-input-field"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeFolderName}...`}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-charcoal-950/60 border border-charcoal-800 text-xs font-semibold text-charcoal-50 placeholder:text-charcoal-600 focus:outline-none focus:border-charcoal-700 truncate"
            autoFocus
          />
          <Search className="w-4 h-4 text-charcoal-600 absolute left-3 top-3" />
        </div>

        {/* Interactive layout controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Sort selector dropdown */}
          <div className="relative">
            <button
              id="search-sort-btn"
              onClick={() => {
                setIsSortDropdownOpen(!isSortDropdownOpen);
                setIsViewDropdownOpen(false);
              }}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 ${
                isSortDropdownOpen 
                  ? "bg-charcoal-800 border-charcoal-600 text-charcoal-100" 
                  : "bg-charcoal-800/50 border-charcoal-700/40 hover:bg-charcoal-800"
              }`}
              title="Sort notes"
            >
              <ArrowUpDown className="w-4.5 h-4.5" />
            </button>
            {isSortDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-charcoal-850 border border-charcoal-700 rounded-2xl p-1 shadow-2xl z-50 animate-fade-in backdrop-blur-md select-none">
                <button
                  id="search-sort-updated"
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
                  id="search-sort-created"
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

          {/* View selector dropdown */}
          <div className="relative">
            <button
              id="search-view-btn"
              onClick={() => {
                setIsViewDropdownOpen(!isViewDropdownOpen);
                setIsSortDropdownOpen(false);
              }}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 ${
                isViewDropdownOpen 
                  ? "bg-charcoal-800 border-charcoal-600 text-charcoal-100" 
                  : "bg-charcoal-800/50 border-charcoal-700/40 hover:bg-charcoal-800"
              }`}
              title="Change View Mode"
            >
              {viewMode === "list" ? <List className="w-4.5 h-4.5" /> : <LayoutGrid className="w-4.5 h-4.5" />}
            </button>
            {isViewDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-charcoal-850 border border-charcoal-700 rounded-2xl p-1 shadow-2xl z-50 animate-fade-in backdrop-blur-md select-none">
                <button
                  id="search-view-list"
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
                  id="search-view-grid"
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
        </div>
      </div>

      {/* Search Results Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none">
        {searchQuery.trim() === "" ? (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-2 select-none">
            <Search className="w-7 h-7 text-charcoal-700" />
            <span className="text-xs font-bold text-charcoal-500">Type to search notes</span>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="text-[10px] text-charcoal-400 font-mono font-bold uppercase tracking-wider select-none px-1">
              Search Results ({searchResults.length})
            </div>
            
            {viewMode === "grid" ? (
              /* Grid layout masonry for search results */
              <div className="grid grid-cols-2 gap-3.5 items-start">
                <div className="flex flex-col gap-3.5">
                  {col1.map(note => renderNoteCard(note))}
                </div>
                <div className="flex flex-col gap-3.5">
                  {col2.map(note => renderNoteCard(note))}
                </div>
              </div>
            ) : (
              /* List layout for search results */
              <div className="flex flex-col gap-3.5">
                {displayedResults.map(note => renderNoteCard(note))}
              </div>
            )}

            {/* Scroll trigger target for pagination loading */}
            {visibleCount < searchResults.length && (
              <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center mt-4">
                <div className="w-5 h-5 border-2 border-charcoal-500/50 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3 select-none">
            <FileText className="w-8 h-8 text-charcoal-700" />
            <span className="text-xs font-bold text-charcoal-500">No matching notes found</span>
          </div>
        )}
      </div>
    </div>
  );
}
