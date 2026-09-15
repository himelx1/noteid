/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Auth } from "./components/Auth";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { SidebarMenu } from "./components/SidebarMenu";
import { SettingsPage } from "./components/SettingsPage";
import { SearchPage } from "./components/SearchPage";
import { TrashPage } from "./components/TrashPage";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { Note, Folder, Tag } from "./types";
import { 
  getNotes, 
  getFolders, 
  getTags, 
  saveFolder, 
  deleteFolder, 
  saveNote, 
  deleteNote,
  deleteAccount
} from "./db";
import { generateUUID } from "./utils";
import { AnimatePresence } from "motion/react";

const STORAGE_KEY = "note_id_active_user";
const PROFILE_KEY_PREFIX = "note_id_active_profile_";

export default function App() {
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<"personal" | "work">("personal");
  
  // Database data
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  // Navigation states
  const [currentView, setCurrentView] = useState<"main" | "menu" | "backup" | "settings" | "search" | "trash">("main");
  // editingNote: undefined = not in editor; null = create note; Note object = edit note
  const [editingNote, setEditingNote] = useState<Note | null | undefined>(undefined);
  
  // Selected Folder filter state
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem("note_id_view_mode");
    return (saved === "grid" || saved === "list") ? saved : "list";
  });

  const [sortBy, setSortBy] = useState<'updated' | 'created'>(() => {
    const saved = localStorage.getItem("note_id_sort_by");
    return (saved === "created" || saved === "updated") ? saved : "updated";
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem("note_id_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem("note_id_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("note_id_sort_by", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("note_id_theme", theme);
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("theme-light");
      root.setAttribute("data-theme", "light");
      document.body.classList.add("theme-light");
      document.body.setAttribute("data-theme", "light");
    } else {
      root.classList.remove("theme-light");
      root.setAttribute("data-theme", "dark");
      document.body.classList.remove("theme-light");
      document.body.setAttribute("data-theme", "dark");
    }
  }, [theme]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // Check for active login session on startup
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      setActiveUser(savedUser);
      // Retrieve the last active profile for this specific user
      const savedProfile = localStorage.getItem(PROFILE_KEY_PREFIX + savedUser);
      if (savedProfile === "work") {
        setActiveProfile("work");
      } else {
        setActiveProfile("personal");
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch account data when active user changes
  useEffect(() => {
    setSelectedFolderId("all");
    if (activeUser) {
      refreshAccountData();
    } else {
      // Clear data if logged out
      setNotes([]);
      setFolders([]);
      setTags([]);
      setEditingNote(undefined);
      setCurrentView("main");
    }
  }, [activeUser]);

  // Bulk reload all user-specific data from IndexedDB
  const refreshAccountData = async () => {
    if (!activeUser) return;
    
    try {
      const userNotes = await getNotes(activeUser);
      const userFolders = await getFolders(activeUser);
      const userTags = await getTags(activeUser);

      // 7-day automatic deletion check & execute
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const expiredNotes = userNotes.filter(
        (n) => n.isDeleted && n.deletedAt && (now - n.deletedAt > SEVEN_DAYS_MS)
      );

      for (const expNote of expiredNotes) {
        await deleteNote(expNote.id);
      }

      // Filter out permanently deleted notes from local state
      const activeAndTrashNotes = userNotes.filter(
        (n) => !(n.isDeleted && n.deletedAt && (now - n.deletedAt > SEVEN_DAYS_MS))
      );

      // Sort notes: pinned first, then by last modified descending
      const sortedNotes = [...activeAndTrashNotes].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });

      // Sort folders: custom sequence order first, then creation time
      const sortedFoldersList = [...userFolders].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999999;
        const orderB = b.order !== undefined ? b.order : 999999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.createdAt - b.createdAt;
      });

      setNotes(sortedNotes);
      setFolders(sortedFoldersList);
      setTags(userTags);
    } catch (err) {
      console.error("Failed to load local account data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (username: string) => {
    localStorage.setItem(STORAGE_KEY, username);
    
    // Load last active profile for this user or default to personal
    const savedProfile = localStorage.getItem(PROFILE_KEY_PREFIX + username);
    if (savedProfile === "work") {
      setActiveProfile("work");
    } else {
      setActiveProfile("personal");
    }
    
    setActiveUser(username);
    setCurrentView("main");
    setEditingNote(undefined);
  };

  const handleLogoutConfirm = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveUser(null);
    setShowLogoutConfirm(false);
  };

  const handleProfileChange = (profile: "personal" | "work") => {
    if (activeUser) {
      localStorage.setItem(PROFILE_KEY_PREFIX + activeUser, profile);
    }
    setActiveProfile(profile);
    setSelectedFolderId("all");
  };

  // Folder actions
  const handleCreateFolder = async (name: string, icon?: string, color?: string) => {
    if (!activeUser) return;
    try {
      const profileFolders = folders.filter((f) => f.profileId === activeProfile);
      const maxOrder = profileFolders.reduce((max, f) => Math.max(max, f.order || 0), -1);
      
      const newFolder: Folder = {
        id: generateUUID(),
        accountId: activeUser,
        profileId: activeProfile,
        name,
        icon: icon || "Folder",
        color: color || "default",
        order: maxOrder + 1,
        createdAt: Date.now(),
      };
      await saveFolder(newFolder);
      await refreshAccountData();
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleUpdateFolder = async (folderId: string, name: string, icon?: string, color?: string) => {
    if (!activeUser) return;
    try {
      const targetFolder = folders.find((f) => f.id === folderId);
      if (!targetFolder) return;
      const updatedFolder: Folder = {
        ...targetFolder,
        name,
        icon: icon || targetFolder.icon,
        color: color || targetFolder.color,
      };
      await saveFolder(updatedFolder);
      await refreshAccountData();
    } catch (err) {
      console.error("Failed to update folder:", err);
    }
  };

  const handleReorderFolders = async (reorderedFolders: Folder[]) => {
    if (!activeUser) return;
    try {
      // Assign custom sequence order to each folder in active profile
      const updatedFoldersList = reorderedFolders.map((folder, index) => ({
        ...folder,
        order: index,
      }));

      // Instantly update state for fluid UI drag responsiveness
      setFolders((prevFolders) => {
        const otherFolders = prevFolders.filter((f) => f.profileId !== activeProfile);
        return [...otherFolders, ...updatedFoldersList];
      });

      // Save each one in IndexedDB asynchronously
      for (const updatedFolder of updatedFoldersList) {
        await saveFolder(updatedFolder);
      }
      
      await refreshAccountData();
    } catch (err) {
      console.error("Failed to reorder folders:", err);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!activeUser) return;
    try {
      await deleteFolder(folderId);

      // Notes inside the deleted folder automatically become Uncategorized (folderId: undefined)
      const notesToUpdate = notes.filter((n) => n.folderId === folderId);
      for (const n of notesToUpdate) {
        const updatedNote: Note = {
          ...n,
          folderId: undefined,
          updatedAt: Date.now(),
        };
        await saveNote(updatedNote);
      }

      if (selectedFolderId === folderId) {
        setSelectedFolderId("all");
      }

      await refreshAccountData();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-charcoal-900 text-charcoal-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-charcoal-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-charcoal-400">Loading Note.ID</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Auth view
  if (!activeUser) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex flex-col items-center justify-center font-sans">
        <Auth onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Filter notes, folders, tags belonging strictly to the active profileId
  const profileNotes = notes.filter((n) => n.profileId === activeProfile && !n.isDeleted);
  const trashNotes = notes.filter((n) => n.profileId === activeProfile && n.isDeleted);
  const profileFolders = folders.filter((f) => f.profileId === activeProfile);

  // Apply selectedFolderId filter
  const filteredNotes = profileNotes.filter((note) => {
    if (selectedFolderId === "all") {
      return true;
    }
    if (selectedFolderId === "uncategorized") {
      return note.folderId === undefined || note.folderId === null || note.folderId === "";
    }
    return note.folderId === selectedFolderId;
  });

  return (
    <div className="min-h-screen bg-charcoal-900 text-charcoal-100 font-sans selection:bg-charcoal-700">
      
      {/* 1. Main View (NoteList) */}
      {(currentView === "main" || currentView === "menu") && editingNote === undefined && (
        <NoteList
          username={activeUser}
          activeProfile={activeProfile}
          notes={filteredNotes}
          folders={profileFolders}
          selectedFolderId={selectedFolderId}
          onSelectNote={(note) => setEditingNote(note)}
          onOpenMenu={() => setCurrentView("menu")}
          onOpenSearch={() => setCurrentView("search")}
          onRefreshData={refreshAccountData}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      )}

      {/* 2. Editor Overlay */}
      {editingNote !== undefined && (
        <NoteEditor
          username={activeUser}
          profileId={activeProfile}
          note={editingNote}
          defaultFolderId={selectedFolderId}
          folders={profileFolders}
          onClose={() => setEditingNote(undefined)}
          onRefreshData={refreshAccountData}
        />
      )}

      {/* 3. Menu / Sidebar Slide-out Drawer Overlay */}
      <AnimatePresence>
        {currentView === "menu" && editingNote === undefined && (
          <SidebarMenu
            username={activeUser}
            activeProfile={activeProfile}
            onProfileChange={handleProfileChange}
            onNavigate={(view) => setCurrentView(view)}
            onLogout={() => setShowLogoutConfirm(true)}
            onClose={() => setCurrentView("main")}
            folders={profileFolders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onUpdateFolder={handleUpdateFolder}
            onDeleteFolder={handleDeleteFolder}
            onReorderFolders={handleReorderFolders}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
      </AnimatePresence>

      {/* 5. Settings View */}
      {currentView === "settings" && editingNote === undefined && activeUser && (
        <SettingsPage
          username={activeUser}
          activeProfile={activeProfile}
          onProfileChange={handleProfileChange}
          onLogout={() => setShowLogoutConfirm(true)}
          onDeleteAccount={async () => {
            if (activeUser) {
              await deleteAccount(activeUser);
              localStorage.removeItem(STORAGE_KEY);
              setActiveUser(null);
              setCurrentView("main");
            }
          }}
          onRefreshData={refreshAccountData}
          onBack={() => setCurrentView("menu")}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      )}

      {/* 6. Search View */}
      {currentView === "search" && editingNote === undefined && (
        <SearchPage
          username={activeUser}
          activeProfile={activeProfile}
          notes={filteredNotes}
          folders={profileFolders}
          selectedFolderId={selectedFolderId}
          onSelectNote={(note) => setEditingNote(note)}
          onClose={() => setCurrentView("main")}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      )}

      {/* 7. Trash View */}
      {currentView === "trash" && editingNote === undefined && (
        <TrashPage
          username={activeUser}
          trashNotes={trashNotes}
          folders={profileFolders}
          onRefreshData={refreshAccountData}
          onBack={() => setCurrentView("menu")}
        />
      )}



      {/* LOGOUT CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        title="Confirm Sign Out"
        message="Are you sure you want to sign out of Note.ID? Your local database workspace will remain securely saved on this device."
        confirmLabel="Yes, Sign Out"
        cancelLabel="No"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
      />

    </div>
  );
}
