/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  ArrowLeft, 
  Download, 
  Settings, 
  LogOut, 
  User, 
  Briefcase, 
  FolderOpen,
  Plus,
  Edit3,
  Trash2,
  Folder,
  BookOpen,
  Heart,
  Star,
  Coffee,
  Bookmark,
  Calendar,
  Archive,
  Lightbulb,
  CheckSquare,
  Smile,
  Shield,
  Music,
  GripVertical,
  Camera,
  ArrowUpDown,
  Code,
  Terminal,
  Globe,
  Lock,
  Key,
  Tag,
  FileText,
  Image,
  Film,
  Sparkles,
  ShoppingBag,
  Target,
  Palette,
  Zap,
  Layers,
  FolderKanban,
  Package,
  Compass,
  Bell,
  Flame,
  Layout,
  Crosshair,
  Moon,
  Sun
} from "lucide-react";
import { Folder as FolderType } from "../types";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { motion } from "motion/react";
import { usePWAInstall } from "../usePWAInstall";

const FOLDER_ICONS: Record<string, React.ComponentType<any>> = {
  Folder,
  BookOpen,
  Heart,
  Star,
  Coffee,
  Bookmark,
  Briefcase,
  Calendar,
  Archive,
  Lightbulb,
  CheckSquare,
  Smile,
  Shield,
  Music,
  Code,
  Terminal,
  Globe,
  Lock,
  Key,
  Tag,
  FileText,
  Image,
  Film,
  Sparkles,
  ShoppingBag,
  Target,
  Palette,
  Zap,
  Layers,
  FolderKanban,
  Package,
  Compass,
  Bell,
  Flame,
  Layout,
  Crosshair
};

const COLOR_OPTIONS = [
  { id: "default", label: "Default", text: "text-charcoal-400", bg: "bg-charcoal-800/40", border: "border-charcoal-700/40", dot: "bg-charcoal-400" },
  { id: "red", label: "Red", text: "text-red-400", bg: "bg-red-950/25", border: "border-red-900/40", dot: "bg-red-400" },
  { id: "orange", label: "Orange", text: "text-amber-500", bg: "bg-amber-950/25", border: "border-amber-900/40", dot: "bg-amber-500" },
  { id: "green", label: "Green", text: "text-emerald-400", bg: "bg-emerald-950/25", border: "border-emerald-900/40", dot: "bg-emerald-400" },
  { id: "teal", label: "Teal", text: "text-teal-400", bg: "bg-teal-950/25", border: "border-teal-900/40", dot: "bg-teal-400" },
  { id: "blue", label: "Blue", text: "text-blue-400", bg: "bg-blue-950/25", border: "border-blue-900/40", dot: "bg-blue-400" },
  { id: "purple", label: "Purple", text: "text-violet-400", bg: "bg-violet-950/25", border: "border-violet-900/40", dot: "bg-violet-400" },
  { id: "pink", label: "Pink", text: "text-rose-400", bg: "bg-rose-950/25", border: "border-rose-900/40", dot: "bg-rose-400" },
];

function getFolderColorClass(colorId?: string) {
  switch (colorId) {
    case "red": return "text-red-400";
    case "orange": return "text-amber-500";
    case "green": return "text-emerald-400";
    case "teal": return "text-teal-400";
    case "blue": return "text-blue-400";
    case "purple": return "text-violet-400";
    case "pink": return "text-rose-400";
    default: return "text-charcoal-400";
  }
}

function FolderIcon({ name, colorId, className = "w-4 h-4" }: { name?: string; colorId?: string; className?: string }) {
  const IconComponent = FOLDER_ICONS[name || "Folder"] || Folder;
  const colorClass = getFolderColorClass(colorId);
  return <IconComponent className={`${className} ${colorClass}`} />;
}

interface SidebarMenuProps {
  username: string;
  activeProfile: 'personal' | 'work';
  onProfileChange: (profile: 'personal' | 'work') => void;
  onNavigate: (view: 'main' | 'backup' | 'settings' | 'trash') => void;
  onLogout: () => void;
  onClose: () => void;
  // Folders props
  folders: FolderType[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string, icon?: string, color?: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string, icon?: string, color?: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onReorderFolders: (folders: FolderType[]) => Promise<void>;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

export function SidebarMenu({
  username,
  activeProfile,
  onProfileChange,
  onNavigate,
  onLogout,
  onClose,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onReorderFolders,
  theme,
  onThemeChange,
}: SidebarMenuProps) {
  // Dialog/Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createIcon, setCreateIcon] = useState("Folder");
  const [createColor, setCreateColor] = useState("default");

  // PWA Install state & hook
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showPwaModal, setShowPwaModal] = useState(false);

  const handlePwaInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (res === "manual") {
        setShowPwaModal(true);
      }
    } else {
      setShowPwaModal(true);
    }
  };

  // Profile picture display state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load avatar for current user (shared across all workspace profiles)
  React.useEffect(() => {
    const updateAvatar = () => {
      if (username) {
        const storageKey = `note_id_avatar_${username}`;
        const saved =
          localStorage.getItem(storageKey) ||
          localStorage.getItem(`note_id_avatar_${username}_${activeProfile}`) ||
          localStorage.getItem(`note_id_avatar_${username}_personal`) ||
          localStorage.getItem(`note_id_avatar_${username}_work`);
        setAvatarUrl(saved || null);
      }
    };

    updateAvatar();
    window.addEventListener("avatar_changed", updateAvatar);
    return () => {
      window.removeEventListener("avatar_changed", updateAvatar);
    };
  }, [username, activeProfile]);

  const displayUsername = username.startsWith("@") ? username : `@${username}`;

  // Lock background page scrolling when SidebarMenu is open
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FolderType | null>(null);
  const [renameName, setRenameName] = useState("");
  const [editIcon, setEditIcon] = useState("Folder");
  const [editColor, setEditColor] = useState("default");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FolderType | null>(null);

  // Drag and drop states
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReorderMode) return;
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isReorderMode) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFolders = [...folders];
    const draggedItem = newFolders[draggedIndex];
    newFolders.splice(draggedIndex, 1);
    newFolders.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    onReorderFolders(newFolders);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isReorderMode) return;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isReorderMode || draggedIndex === null) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const folderElement = element.closest("[data-folder-index]");
    if (folderElement) {
      const index = parseInt(folderElement.getAttribute("data-folder-index") || "", 10);
      if (!isNaN(index) && index !== draggedIndex) {
        const newFolders = [...folders];
        const draggedItem = newFolders[draggedIndex];
        newFolders.splice(draggedIndex, 1);
        newFolders.splice(index, 0, draggedItem);
        setDraggedIndex(index);
        onReorderFolders(newFolders);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
  };

  const handleFolderSelect = (folderId: string) => {
    onSelectFolder(folderId);
    onClose(); // Close menu drawer on selection
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative z-10 w-[290px] sm:w-[320px] bg-charcoal-900 border-r border-charcoal-800/80 flex flex-col h-full focus:outline-none"
      >
        {/* Header */}
        <div className="h-16 shrink-0 bg-charcoal-850/60 border-b border-charcoal-800/80 backdrop-blur-md px-4 flex items-center justify-between select-none relative">
          {/* Left side: Profile picture + @username */}
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-full border border-charcoal-600/60 bg-charcoal-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayUsername} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-charcoal-750 flex items-center justify-center text-charcoal-300">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>

            <span className="text-sm font-bold text-charcoal-100 truncate tracking-tight">
              {displayUsername}
            </span>
          </div>

          {/* Right side: Theme toggle icon & Close / Back button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="sidebar-theme-toggle-btn"
              onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shrink-0"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
              )}
            </button>

            <button
              id="sidebar-back-btn"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shrink-0"
              title="Close Drawer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

          {/* Profile Switcher */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-charcoal-400 uppercase tracking-widest px-1">
              Active Workspace Profile
            </span>
            <div className="flex bg-charcoal-950/45 p-1 rounded-2xl border border-charcoal-850/80">
              <button
                id="profile-personal-btn"
                onClick={() => onProfileChange("personal")}
                className={`flex-1 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeProfile === "personal"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/40 shadow-sm"
                    : "text-charcoal-400 hover:text-charcoal-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Personal</span>
              </button>

              <button
                id="profile-work-btn"
                onClick={() => onProfileChange("work")}
                className={`flex-1 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeProfile === "work"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/40 shadow-sm"
                    : "text-charcoal-400 hover:text-charcoal-200"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Work</span>
              </button>
            </div>
          </div>

          {/* Folders Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-bold text-charcoal-400 uppercase tracking-widest">
                Folders
              </span>
              <div className="flex items-center gap-1.5">
                {folders.length > 0 && (
                  <button
                    type="button"
                    id="toggle-folder-reorder-btn"
                    onClick={() => setIsReorderMode((prev) => !prev)}
                    className={`h-6 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      isReorderMode
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-charcoal-800 hover:bg-charcoal-700 border-charcoal-700/40 text-charcoal-300 hover:text-charcoal-100"
                    }`}
                    title={isReorderMode ? "Done reordering folders" : "Reorder folders"}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{isReorderMode ? "Done" : "Reorder"}</span>
                  </button>
                )}
                <button
                  id="create-folder-btn"
                  onClick={() => setShowCreateModal(true)}
                  className="w-6 h-6 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors"
                  title="Create Folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1 select-none">
              {/* All Notes */}
              <button
                id="folder-all-btn"
                onClick={() => handleFolderSelect("all")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  selectedFolderId === "all"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/40"
                    : "text-charcoal-300 hover:bg-charcoal-850 hover:text-charcoal-100"
                }`}
              >
                <FolderOpen className="w-4 h-4 text-charcoal-400 shrink-0" />
                <span>All Notes</span>
              </button>

              {/* Uncategorized */}
              <button
                id="folder-uncategorized-btn"
                onClick={() => handleFolderSelect("uncategorized")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  selectedFolderId === "uncategorized"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/40"
                    : "text-charcoal-300 hover:bg-charcoal-850 hover:text-charcoal-100"
                }`}
              >
                <FolderIcon name="Folder" colorId="default" className="w-4 h-4 shrink-0" />
                <span>Uncategorized</span>
              </button>

              {/* User Created Folders */}
              {folders.map((folder, index) => (
                <div
                  key={folder.id}
                  data-folder-index={index}
                  draggable={isReorderMode}
                  onDragStart={isReorderMode ? (e) => handleDragStart(e, index) : undefined}
                  onDragOver={isReorderMode ? (e) => handleDragOver(e, index) : undefined}
                  onDragEnd={isReorderMode ? handleDragEnd : undefined}
                  onTouchStart={isReorderMode ? (e) => handleTouchStart(e, index) : undefined}
                  onTouchMove={isReorderMode ? handleTouchMove : undefined}
                  onTouchEnd={isReorderMode ? handleTouchEnd : undefined}
                  className={`group/folder w-full flex items-center justify-between px-2.5 py-1 rounded-xl text-xs font-semibold transition-all text-left relative ${
                    selectedFolderId === folder.id
                      ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/40"
                      : "text-charcoal-300 hover:bg-charcoal-850 hover:text-charcoal-100"
                  } ${draggedIndex === index ? "opacity-40 border border-dashed border-charcoal-600" : ""}`}
                >
                  {/* Drag Handle (Visible only in Reorder Mode) */}
                  {isReorderMode && (
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-amber-400 hover:text-amber-300 shrink-0 animate-pulse"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <button
                    id={`select-folder-${folder.id}`}
                    onClick={() => handleFolderSelect(folder.id)}
                    className="flex-1 flex items-center gap-2 py-1.5 text-left cursor-pointer min-w-0"
                  >
                    <FolderIcon name={folder.icon} colorId={folder.color} className="w-4 h-4 shrink-0" />
                    <span className="truncate ml-1">{folder.name}</span>
                  </button>

                  {/* Folder Actions: Rename/Edit and Delete (Only visible in Reorder Mode) */}
                  {isReorderMode && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        id={`rename-folder-${folder.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameTarget(folder);
                          setRenameName(folder.name);
                          setEditIcon(folder.icon || "Folder");
                          setEditColor(folder.color || "default");
                          setShowRenameModal(true);
                        }}
                        className="w-6 h-6 rounded-md hover:bg-charcoal-700 flex items-center justify-center text-charcoal-400 hover:text-charcoal-100 cursor-pointer transition-colors"
                        title="Edit Folder"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        id={`delete-folder-${folder.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(folder);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-6 h-6 rounded-md hover:bg-red-950/40 flex items-center justify-center text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-charcoal-400 uppercase tracking-widest px-1">
              Tools & Management
            </span>

            <button
              id="nav-trash-btn"
              onClick={() => onNavigate("trash")}
              className="flex items-center justify-between p-3 bg-charcoal-850/30 hover:bg-charcoal-850/60 border border-charcoal-700/30 rounded-2xl cursor-pointer text-left transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-charcoal-750/50 flex items-center justify-center border border-charcoal-700/40">
                  <Trash2 className="w-4 h-4 text-charcoal-200" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-charcoal-100">Trash</span>
                  <span className="text-[9px] text-charcoal-400">View and restore deleted notes</span>
                </div>
              </div>
            </button>

            <button
              id="nav-settings-btn"
              onClick={() => onNavigate("settings")}
              className="flex items-center justify-between p-3 bg-charcoal-850/30 hover:bg-charcoal-850/60 border border-charcoal-700/30 rounded-2xl cursor-pointer text-left transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-charcoal-750/50 flex items-center justify-center border border-charcoal-700/40">
                  <Settings className="w-4 h-4 text-charcoal-200" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-charcoal-100">Settings</span>
                  <span className="text-[9px] text-charcoal-400">Account details and password security</span>
                </div>
              </div>
            </button>

            {/* PWA Install Button */}
            <button
              id="nav-pwa-install-btn"
              onClick={handlePwaInstallClick}
              className="flex items-center justify-between p-3 bg-charcoal-850/30 hover:bg-charcoal-850/60 border border-charcoal-700/30 rounded-2xl cursor-pointer text-left transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-charcoal-750/50 flex items-center justify-center border border-charcoal-700/40">
                  <Download className="w-4 h-4 text-charcoal-200 group-hover:text-charcoal-100 transition-colors" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-charcoal-100">PWA INSTALL</span>
                    {isInstalled && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Installed
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-charcoal-400">
                    {isInstalled ? "Running in standalone mode" : "Install Note.ID app on your device"}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Create Folder Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-charcoal-50">Create Folder</h3>
              <p className="text-xs text-charcoal-300">Enter details for your new folder.</p>
            </div>
            
            <input
              id="new-folder-name-input"
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Folder Name"
              className="w-full h-11 px-4 rounded-xl bg-charcoal-950 border border-charcoal-700/50 text-charcoal-50 placeholder:text-charcoal-600 focus:outline-none focus:border-charcoal-500 text-xs font-semibold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && createName.trim()) {
                  onCreateFolder(createName.trim(), createIcon, createColor);
                  setShowCreateModal(false);
                  setCreateName("");
                  setCreateIcon("Folder");
                  setCreateColor("default");
                }
              }}
            />

            {/* Custom Icon Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider">Select Folder Icon</span>
              <div className="grid grid-cols-5 gap-2 bg-charcoal-950/40 p-2.5 rounded-2xl border border-charcoal-850/50 max-h-48 overflow-y-auto">
                {Object.keys(FOLDER_ICONS).map((iconName) => {
                  const Icon = FOLDER_ICONS[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCreateIcon(iconName)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                        createIcon === iconName
                          ? "bg-charcoal-700 border-charcoal-500 text-charcoal-50"
                          : "border-transparent bg-charcoal-850/20 text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider">Select Folder Color</span>
              <div className="flex flex-wrap gap-2.5 bg-charcoal-950/40 p-2.5 rounded-2xl border border-charcoal-850/50 justify-center">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCreateColor(opt.id)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${opt.bg} ${opt.border} ${
                      createColor === opt.id ? "ring-2 ring-charcoal-100 ring-offset-2 ring-offset-charcoal-800 scale-110" : ""
                    }`}
                    title={opt.label}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                id="create-folder-cancel"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateName("");
                  setCreateIcon("Folder");
                  setCreateColor("default");
                }}
                className="px-4 h-10 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-750 text-charcoal-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="create-folder-confirm"
                disabled={!createName.trim()}
                onClick={async () => {
                  await onCreateFolder(createName.trim(), createIcon, createColor);
                  setShowCreateModal(false);
                  setCreateName("");
                  setCreateIcon("Folder");
                  setCreateColor("default");
                }}
                className="px-5 h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 disabled:opacity-40 text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal Overlay */}
      {showRenameModal && renameTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-charcoal-50">Rename Folder</h3>
              <p className="text-xs text-charcoal-300">Update details for this folder.</p>
            </div>
            
            <input
              id="rename-folder-name-input"
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Folder Name"
              className="w-full h-11 px-4 rounded-xl bg-charcoal-950 border border-charcoal-700/50 text-charcoal-50 placeholder:text-charcoal-600 focus:outline-none focus:border-charcoal-500 text-xs font-semibold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameName.trim()) {
                  onUpdateFolder(renameTarget.id, renameName.trim(), editIcon, editColor);
                  setShowRenameModal(false);
                  setRenameTarget(null);
                  setRenameName("");
                }
              }}
            />

            {/* Custom Icon Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider">Select Folder Icon</span>
              <div className="grid grid-cols-5 gap-2 bg-charcoal-950/40 p-2.5 rounded-2xl border border-charcoal-850/50 max-h-48 overflow-y-auto">
                {Object.keys(FOLDER_ICONS).map((iconName) => {
                  const Icon = FOLDER_ICONS[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditIcon(iconName)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                        editIcon === iconName
                          ? "bg-charcoal-700 border-charcoal-500 text-charcoal-50"
                          : "border-transparent bg-charcoal-850/20 text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider">Select Folder Color</span>
              <div className="flex flex-wrap gap-2.5 bg-charcoal-950/40 p-2.5 rounded-2xl border border-charcoal-850/50 justify-center">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEditColor(opt.id)}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${opt.bg} ${opt.border} ${
                      editColor === opt.id ? "ring-2 ring-charcoal-100 ring-offset-2 ring-offset-charcoal-800 scale-110" : ""
                    }`}
                    title={opt.label}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                id="rename-folder-cancel"
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameTarget(null);
                  setRenameName("");
                }}
                className="px-4 h-10 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-750 text-charcoal-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                id="rename-folder-confirm"
                disabled={!renameName.trim()}
                onClick={async () => {
                  await onUpdateFolder(renameTarget.id, renameName.trim(), editIcon, editColor);
                  setShowRenameModal(false);
                  setRenameTarget(null);
                  setRenameName("");
                }}
                className="px-5 h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 disabled:opacity-40 text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Folder"
        message="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteFolder(deleteTarget.id);
            setDeleteTarget(null);
          }
          setShowDeleteConfirm(false);
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
      />

      {/* PWA Install Guide Dialog */}
      {showPwaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-charcoal-50">Install Note.ID</h3>
                <span className="text-[11px] text-charcoal-400">Progressive Web App (PWA)</span>
              </div>
            </div>

            {isInstalled ? (
              <p className="text-xs text-charcoal-300 leading-relaxed">
                Note.ID is already running as an installed application on your device!
              </p>
            ) : isIOS ? (
              <div className="flex flex-col gap-2.5 text-xs text-charcoal-300 leading-relaxed bg-charcoal-900/60 p-3.5 rounded-2xl border border-charcoal-750">
                <p className="font-semibold text-charcoal-100">How to install on iPhone & iPad:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-charcoal-300">
                  <li>Tap the <strong className="text-charcoal-100">Share</strong> button in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong className="text-charcoal-100">Add to Home Screen</strong>.</li>
                  <li>Tap <strong className="text-charcoal-100">Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 text-xs text-charcoal-300 leading-relaxed bg-charcoal-900/60 p-3.5 rounded-2xl border border-charcoal-750">
                <p className="font-semibold text-charcoal-100">How to install Note.ID:</p>
                <ul className="space-y-2 text-charcoal-300">
                  <li>
                    <strong className="text-charcoal-100">Desktop (Chrome / Edge):</strong> Click the <strong className="text-charcoal-100">Install</strong> icon in the address bar, or click browser menu (⋮) → <strong className="text-charcoal-100">Install Note.ID</strong>.
                  </li>
                  <li>
                    <strong className="text-charcoal-100">Android:</strong> Tap the browser menu (⋮) → <strong className="text-charcoal-100">Install app</strong> or <strong className="text-charcoal-100">Add to Home screen</strong>.
                  </li>
                </ul>
              </div>
            )}

            <div className="flex justify-end mt-1">
              <button
                id="pwa-guide-close-btn"
                onClick={() => setShowPwaModal(false)}
                className="w-full h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
