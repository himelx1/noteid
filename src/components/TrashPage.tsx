/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  RotateCcw, 
  Trash2, 
  AlertCircle, 
  FolderOpen,
  FileText,
  Lock
} from "lucide-react";
import { Note, Folder } from "../types";
import { deleteNote, saveNote } from "../db";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { getTimeSticker, stripHtml } from "../utils";

interface TrashPageProps {
  username: string;
  trashNotes: Note[];
  folders: Folder[];
  onRefreshData: () => void;
  onBack: () => void;
}

export function TrashPage({
  username,
  trashNotes,
  folders,
  onRefreshData,
  onBack,
}: TrashPageProps) {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Confirmation dialog states
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<boolean>(false);
  const [restoreTarget, setRestoreTarget] = useState<Note | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const [showEmptyConfirm, setShowEmptyConfirm] = useState<boolean>(false);

  // Sorting: recently deleted notes first
  const sortedTrashNotes = useMemo(() => {
    return [...trashNotes].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }, [trashNotes]);

  // Handle Restore Action
  const handleRestoreClick = (note: Note) => {
    setRestoreTarget(note);
    setShowRestoreConfirm(true);
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;

    setError("");
    setSuccess("");

    try {
      // Check if original folder still exists
      const originalFolderExists = restoreTarget.folderId 
        ? folders.some((f) => f.id === restoreTarget.folderId)
        : false;

      const updatedNote: Note = {
        ...restoreTarget,
        isDeleted: false,
        deletedAt: undefined,
        folderId: originalFolderExists ? restoreTarget.folderId : undefined,
        updatedAt: Date.now(),
      };

      await saveNote(updatedNote);
      setSuccess("Note successfully restored.");
      onRefreshData();
    } catch (err) {
      setError("Failed to restore the note.");
    } finally {
      setShowRestoreConfirm(false);
      setRestoreTarget(null);
    }
  };

  // Handle Permanent Delete Action
  const handleDeleteClick = (note: Note) => {
    setDeleteTarget(note);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setError("");
    setSuccess("");

    try {
      await deleteNote(deleteTarget.id);
      setSuccess("Note permanently deleted.");
      onRefreshData();
    } catch (err) {
      setError("Failed to permanently delete the note.");
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // Handle Empty Trash Action
  const handleEmptyTrashConfirm = async () => {
    setError("");
    setSuccess("");

    try {
      for (const note of trashNotes) {
        await deleteNote(note.id);
      }
      setSuccess("Trash emptied successfully.");
      onRefreshData();
    } catch (err) {
      setError("Failed to empty trash.");
    } finally {
      setShowEmptyConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-charcoal-900 flex flex-col h-full w-full max-w-md mx-auto border-x border-charcoal-800/40 animate-slide-in">
      {/* Header */}
      <div className="h-14 shrink-0 bg-charcoal-850/60 border-b border-charcoal-800/80 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="trash-back-btn"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-charcoal-50">Trash</span>
        </div>

        {trashNotes.length > 0 && (
          <button
            id="action-empty-trash"
            onClick={() => setShowEmptyConfirm(true)}
            className="h-9 px-3.5 rounded-xl border border-red-900/40 hover:bg-red-950/20 text-red-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {/* Help Banner: Trash Retention Statement */}
        <div className="text-[10px] text-charcoal-400 font-medium bg-charcoal-850/25 border border-charcoal-800/50 rounded-2xl p-4 leading-relaxed">
          Deleted notes remain here for 7 days before being automatically permanently deleted from local storage.
        </div>

        {/* Messaging Feedback */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-900/50 rounded-2xl p-4 text-xs text-red-200">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 text-xs text-emerald-200">
            <CheckCircleIcon className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {sortedTrashNotes.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="text-[10px] text-charcoal-400 font-mono font-bold uppercase tracking-wider select-none px-1">
              Deleted Notes ({sortedTrashNotes.length})
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {sortedTrashNotes.map((note) => {
                const stripped = stripHtml(note.content);
                // Truncate first few words to only show first line/snippet
                const previewText = stripped 
                  ? (stripped.length > 80 ? stripped.slice(0, 80) + "..." : stripped)
                  : "Empty note";

                return (
                  <div
                    key={note.id}
                    id={`trash-note-card-${note.id}`}
                    className="group bg-charcoal-850/20 border border-charcoal-800/40 rounded-2xl p-5 flex flex-col justify-between h-36 relative overflow-hidden shadow-sm"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 pr-16">
                        <h3 className="text-sm font-bold text-charcoal-200 truncate">
                          {note.title || "Untitled Note"}
                        </h3>
                        {note.isLocked && <Lock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />}
                      </div>
                      {!note.isLocked && (
                        <p className="text-xs text-charcoal-400 line-clamp-2 leading-relaxed font-sans">
                          {previewText}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-2 select-none">
                      <div className="text-[10px] text-charcoal-500 font-mono font-bold">
                        Deleted {getTimeSticker(note.deletedAt || Date.now())}
                      </div>

                      {/* Restore and Permanent Delete buttons */}
                      <div className="flex items-center gap-1 shrink-0 z-10">
                        <button
                          id={`action-restore-note-${note.id}`}
                          onClick={() => handleRestoreClick(note)}
                          className="w-8 h-8 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 text-charcoal-300 hover:text-charcoal-100 border border-charcoal-700/40 flex items-center justify-center cursor-pointer transition-colors"
                          title="Restore note"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`action-delete-perm-note-${note.id}`}
                          onClick={() => handleDeleteClick(note)}
                          className="w-8 h-8 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 hover:text-red-300 flex items-center justify-center cursor-pointer transition-colors"
                          title="Permanently delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3 select-none">
            <FileText className="w-8 h-8 text-charcoal-700" />
            <span className="text-xs font-bold text-charcoal-500">Trash is empty</span>
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOGS */}
      <ConfirmationDialog
        isOpen={showRestoreConfirm}
        title="Restore Note"
        message="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={handleRestoreConfirm}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setRestoreTarget(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Permanently Delete"
        message="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
      />

      <ConfirmationDialog
        isOpen={showEmptyConfirm}
        title="Empty Trash"
        message="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={handleEmptyTrashConfirm}
        onCancel={() => setShowEmptyConfirm(false)}
      />
    </div>
  );
}

// Simple internal check circle helper to keep the file fully self-contained without missing icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
