/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Trash2, 
  Undo,
  Redo,
  MoreVertical,
  FolderOpen,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  Image,
  Mic,
  Square,
  Pin,
  Palette,
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
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Info,
  Type,
  CaseSensitive,
  Copy,
  Lock,
  Delete,
  KeyRound,
  ShieldCheck,
  Unlock,
  Terminal,
  Globe,
  Key,
  Tag,
  FileText,
  Film,
  Sparkles,
  ShoppingBag,
  Target,
  Zap,
  Layers,
  FolderKanban,
  Package,
  Compass,
  Bell,
  Flame,
  Layout,
  Crosshair,
  Wand2,
  HelpCircle,
  Check,
  CheckCircle,
  X,
  RefreshCw,
  Bot,
  Minimize2,
  Maximize2
} from "lucide-react";
import { Note, Folder as FolderType } from "../types";
import { saveNote, deleteNote } from "../db";
import { generateUUID, hashPin } from "../utils";
import { ConfirmationDialog } from "./ConfirmationDialog";
import {
  loadToolbarConfig,
  DEFAULT_TOOLS,
  ToolbarConfig
} from "../utils/toolbarStore";

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

function getCounts(htmlString: string) {
  if (!htmlString) return { words: 0, characters: 0 };
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const text = doc.body.textContent || "";
  const cleanText = text.trim();
  const words = cleanText === "" ? 0 : cleanText.split(/\s+/).filter(Boolean).length;
  const characters = text.length;
  return { words, characters };
}

interface NoteEditorProps {
  username: string;
  profileId: 'personal' | 'work';
  note: Note | null; // Null means create a new note
  defaultFolderId?: string;
  folders: FolderType[];
  onClose: () => void;
  onRefreshData: () => void;
}

export function NoteEditor({
  username,
  profileId,
  note,
  defaultFolderId,
  folders,
  onClose,
  onRefreshData,
}: NoteEditorProps) {
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [noteFolderId, setNoteFolderId] = useState<string | undefined>(undefined);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio / Recording States & Refs
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePlayerWrapperRef = useRef<HTMLDivElement | null>(null);
  
  // Undo/Redo states
  const [history, setHistory] = useState<{ title: string; content: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Menu toggles
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showMoveDialog, setShowMoveDialog] = useState<boolean>(false);
  const [showMoveConfirm, setShowMoveConfirm] = useState<boolean>(false);
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string>("");

  const [isPinned, setIsPinned] = useState<boolean>(note ? note.isPinned : false);
  const [background, setBackground] = useState<string>(note?.background || "default");
  const [showBackgroundOptions, setShowBackgroundOptions] = useState<boolean>(false);
  const [showNoteInfo, setShowNoteInfo] = useState<boolean>(false);

  // Active states for formatting buttons
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [isHighlight, setIsHighlight] = useState<boolean>(false);
  const [isSmartCopy, setIsSmartCopy] = useState<boolean>(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>("rgba(251, 191, 36, 0.35)");

  // Table Custom States & Context
  const [showTableConfig, setShowTableConfig] = useState<boolean>(false);
  const [showFontSizeConfig, setShowFontSizeConfig] = useState<boolean>(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; bottom?: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [adjustedStyle, setAdjustedStyle] = useState<React.CSSProperties>({ display: "none" });

  // PIN Lock States
  const [isLocked, setIsLocked] = useState<boolean>(note?.isLocked || false);
  const [pinHash, setPinHash] = useState<string | undefined>(note?.pinHash);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!(note?.isLocked));
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [currentNoteId, setCurrentNoteId] = useState<string>(note?.id || generateUUID());

  // PIN Modals
  const [showSetPinModal, setShowSetPinModal] = useState<boolean>(false);
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [showRemovePinModal, setShowRemovePinModal] = useState<boolean>(false);
  const [newPinValue, setNewPinValue] = useState<string>("");
  const [confirmPinValue, setConfirmPinValue] = useState<string>("");
  const [currentPinValue, setCurrentPinValue] = useState<string>("");
  const [modalPinError, setModalPinError] = useState<string>("");

  // Dynamic Toolbar Configuration State
  const [toolbarConfig, setToolbarConfig] = useState<ToolbarConfig>(loadToolbarConfig);

  useEffect(() => {
    const handleConfigChange = () => setToolbarConfig(loadToolbarConfig());
    window.addEventListener("toolbar_config_changed", handleConfigChange);
    return () => window.removeEventListener("toolbar_config_changed", handleConfigChange);
  }, []);

  useEffect(() => {
    if (!contextMenuPos.visible) {
      setAdjustedStyle({ display: "none" });
      return;
    }

    setAdjustedStyle({
      position: "fixed",
      opacity: 0,
      pointerEvents: "none",
      zIndex: 150,
    });

    const adjust = () => {
      const menuEl = document.getElementById("context-selection-menu");
      if (!menuEl) return;

      const menuRect = menuEl.getBoundingClientRect();
      const menuWidth = menuRect.width || 140;
      const menuHeight = menuRect.height || 42;

      let targetX = contextMenuPos.x;
      let targetY = contextMenuPos.y;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = targetX - menuWidth / 2;
      const horizontalPadding = 12;
      if (left < horizontalPadding) {
        left = horizontalPadding;
      } else if (left + menuWidth > viewportWidth - horizontalPadding) {
        left = viewportWidth - menuWidth - horizontalPadding;
      }

      const verticalSpacing = 10;
      let top = targetY - menuHeight - verticalSpacing;
      const verticalPadding = 12;

      if (top < verticalPadding) {
        const bottomY = contextMenuPos.bottom !== undefined ? contextMenuPos.bottom : targetY + 24;
        top = bottomY + verticalSpacing;
      }

      if (top + menuHeight > viewportHeight - verticalPadding) {
        top = viewportHeight - menuHeight - verticalPadding;
      }

      if (top < verticalPadding) {
        top = verticalPadding;
      }

      setAdjustedStyle({
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        opacity: 1,
        pointerEvents: "auto",
        zIndex: 150,
      });
    };

    const timer = setTimeout(adjust, 0);

    window.addEventListener("resize", adjust);
    window.addEventListener("scroll", adjust, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", adjust);
      window.removeEventListener("scroll", adjust, true);
    };
  }, [contextMenuPos]);
  const [tableRowsInput, setTableRowsInput] = useState<string>("3");
  const [tableColsInput, setTableColsInput] = useState<string>("2");
  const [activeTableContext, setActiveTableContext] = useState<{
    table: HTMLTableElement;
    cell: HTMLTableCellElement;
    row: HTMLTableRowElement;
    colIndex: number;
    rowIndex: number;
  } | null>(null);

  const [toolbarStyle, setToolbarStyle] = useState<React.CSSProperties>({});
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const offsetBottom = window.innerHeight - viewport.height - viewport.offsetTop;
      
      // Determine if visual viewport is significantly smaller than the window's layout viewport height.
      // 60px is a perfect threshold for virtual keyboards and ignores small layout variations.
      const isKeyboardOpen = window.innerHeight - viewport.height > 60;

      if (isKeyboardOpen) {
        setToolbarStyle({
          position: "fixed",
          bottom: `${Math.max(0, offsetBottom)}px`,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "448px",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.3)",
          backgroundColor: "#171717",
          zIndex: 50,
        });
      } else {
        setToolbarStyle({});
      }
    };

    const viewport = window.visualViewport;
    
    // Register visual viewport listeners for zooming, virtual keyboard height changes, and scrolls
    if (viewport) {
      viewport.addEventListener("resize", handleViewportChange);
      viewport.addEventListener("scroll", handleViewportChange);
    }

    // Register general window events for resizes, orientation changes, and inputs focus/blur
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    window.addEventListener("focusin", handleViewportChange);
    window.addEventListener("focusout", handleViewportChange);

    // Initial check
    handleViewportChange();

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", handleViewportChange);
        viewport.removeEventListener("scroll", handleViewportChange);
      }
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("focusin", handleViewportChange);
      window.removeEventListener("focusout", handleViewportChange);
    };
  }, []);

  const HIGHLIGHT_COLORS = [
    { id: "yellow", label: "Yellow", value: "rgba(251, 191, 36, 0.35)", dot: "bg-amber-400" },
    { id: "green", label: "Green", value: "rgba(34, 197, 94, 0.35)", dot: "bg-emerald-400" },
    { id: "blue", label: "Blue", value: "rgba(59, 130, 246, 0.35)", dot: "bg-blue-400" },
    { id: "pink", label: "Pink", value: "rgba(236, 72, 153, 0.35)", dot: "bg-rose-400" },
    { id: "orange", label: "Orange", value: "rgba(249, 115, 22, 0.35)", dot: "bg-orange-500" },
  ];

  const checkHighlightActive = () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === "MARK") return true;
            const bg = el.style.backgroundColor;
            if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)" && bg !== "none" && bg !== "") {
              return true;
            }
          }
          node = node.parentNode;
        }
      }
    } catch (e) {}
    
    return false;
  };

  const checkSmartCopyActive = () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // 1. Check if startContainer is inside a smart copy element
        let node: Node | null = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.getAttribute("data-smart-copy") === "true") {
              return true;
            }
          }
          node = node.parentNode;
        }

        // 2. Or, if the range surrounds or intersects any smart copy elements
        if (!range.collapsed) {
          const container = range.commonAncestorContainer;
          let element: HTMLElement | null = null;
          if (container.nodeType === Node.ELEMENT_NODE) {
            element = container as HTMLElement;
          } else {
            element = container.parentNode as HTMLElement | null;
          }
          if (element) {
            const smartCopies = element.querySelectorAll('[data-smart-copy="true"]');
            for (let i = 0; i < smartCopies.length; i++) {
              if (range.intersectsNode(smartCopies[i])) {
                return true;
              }
            }
          }
        }
      }
    } catch (e) {}
    return false;
  };

  const getTableContext = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node: Node | null = selection.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    let cell: HTMLTableCellElement | null = null;
    let row: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "TD" || el.tagName === "TH") {
          cell = el as HTMLTableCellElement;
        }
        if (el.tagName === "TR") {
          row = el as HTMLTableRowElement;
        }
        if (el.tagName === "TABLE") {
          table = el as HTMLTableElement;
          break;
        }
      }
      node = node.parentNode;
    }
    if (table && cell && row) {
      const colIndex = Array.from(row.cells).indexOf(cell);
      const rowIndex = Array.from(table.rows).indexOf(row);
      return { table, cell, row, colIndex, rowIndex };
    }
    return null;
  };

  const updateToolbarStates = () => {
    try {
      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
      setIsUnderline(document.queryCommandState("underline"));
      setIsHighlight(checkHighlightActive());
      setIsSmartCopy(checkSmartCopyActive());

      const ctx = getTableContext();
      setActiveTableContext(ctx);
    } catch (e) {}
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement && editorRef.current?.contains(document.activeElement)) {
        updateToolbarStates();

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          if (editorRef.current.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            if (rect && rect.top > 0) {
              setContextMenuPos({
                x: rect.left + rect.width / 2,
                y: rect.top,
                bottom: rect.bottom,
                visible: true
              });
              return;
            }
          }
        }
        setContextMenuPos((prev) => prev.visible ? { ...prev, visible: false } : prev);
      }
    };

    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest('[data-smart-copy="true"]') && !target.closest("#context-selection-menu")) {
        setContextMenuPos((prev) => prev.visible ? { ...prev, visible: false } : prev);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleGlobalClick);
    document.addEventListener("touchstart", handleGlobalClick);
    
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("touchstart", handleGlobalClick);
    };
  }, []);

  const isUndoingRedoing = useRef<boolean>(false);
  const historyRef = useRef<{ title: string; content: string }[]>([]);
  const indexRef = useRef<number>(-1);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sync refs with state to prevent closures issues
  useEffect(() => {
    historyRef.current = history;
    indexRef.current = historyIndex;
  }, [history, historyIndex]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Initialize form with note content
  useEffect(() => {
    const initialTitle = note ? note.title : "";
    const initialContent = note ? note.content : "";
    setTitle(initialTitle);
    setContent(initialContent);

    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }

    const initialFolder = note 
      ? note.folderId 
      : (defaultFolderId !== "all" && defaultFolderId !== "uncategorized" ? defaultFolderId : undefined);
    setNoteFolderId(initialFolder);

    setIsPinned(note ? note.isPinned : false);
    setBackground(note?.background || "default");
    setShowBackgroundOptions(false);

    const initial = { title: initialTitle, content: initialContent };
    setHistory([initial]);
    setHistoryIndex(0);

    const locked = note?.isLocked || false;
    setIsLocked(locked);
    setPinHash(note?.pinHash);
    setIsUnlocked(!locked);
    setPinInput("");
    setPinError("");
    setCurrentNoteId(note?.id || generateUUID());
    setShowSetPinModal(false);
    setShowChangePinModal(false);
    setShowRemovePinModal(false);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    setError("");
    setShowMenu(false);
  }, [note, defaultFolderId]);

  // Auto-verify PIN when 4 digits are entered on unlock page
  useEffect(() => {
    if (pinInput.length === 4 && isLocked && !isUnlocked) {
      handleUnlockNote(pinInput);
    }
  }, [pinInput, isLocked, isUnlocked]);

  // Physical keyboard support for PIN screen on desktop
  useEffect(() => {
    if (!isLocked || isUnlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key >= "0" && e.key <= "9") {
        setPinInput((prev) => (prev.length < 4 ? prev + e.key : prev));
        setPinError("");
      } else if (e.key === "Backspace") {
        setPinInput((prev) => prev.slice(0, -1));
        setPinError("");
      } else if (e.key === "Escape") {
        setPinInput("");
        setPinError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, isUnlocked]);

  const handleUnlockNote = async (enteredPin: string) => {
    if (!pinHash) return;
    const noteIdToUse = note?.id || currentNoteId;
    const computedHash = await hashPin(enteredPin, noteIdToUse);
    if (computedHash === pinHash) {
      setIsUnlocked(true);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPinInput("");
    }
  };

  const handleSetPinSubmit = async () => {
    if (newPinValue.length !== 4 || !/^\d{4}$/.test(newPinValue)) {
      setModalPinError("PIN must be exactly 4 numeric digits.");
      return;
    }
    if (newPinValue !== confirmPinValue) {
      setModalPinError("PINs do not match. Please try again.");
      return;
    }

    const noteIdToUse = note ? note.id : currentNoteId;
    const hash = await hashPin(newPinValue, noteIdToUse);

    const now = Date.now();
    const updatedNote: Note = {
      id: noteIdToUse,
      accountId: username,
      profileId: note ? note.profileId : profileId,
      title: title.trim() || "Untitled Note",
      content: content,
      folderId: noteFolderId,
      tags: note?.tags || [],
      isPinned: isPinned,
      background: background,
      createdAt: note ? note.createdAt : now,
      updatedAt: now,
      isLocked: true,
      pinHash: hash,
    };

    try {
      await saveNote(updatedNote);
      setIsLocked(true);
      setPinHash(hash);
      setIsUnlocked(false); // Immediately lock after creating PIN
      setShowSetPinModal(false);
      setNewPinValue("");
      setConfirmPinValue("");
      setModalPinError("");
      onRefreshData();
    } catch (err) {
      setModalPinError("Failed to save PIN lock.");
    }
  };

  const handleChangePinSubmit = async () => {
    if (!pinHash) return;
    const noteIdToUse = note?.id || currentNoteId;
    const currentHash = await hashPin(currentPinValue, noteIdToUse);
    if (currentHash !== pinHash) {
      setModalPinError("Incorrect current PIN.");
      return;
    }
    if (newPinValue.length !== 4 || !/^\d{4}$/.test(newPinValue)) {
      setModalPinError("New PIN must be exactly 4 numeric digits.");
      return;
    }
    if (newPinValue !== confirmPinValue) {
      setModalPinError("New PINs do not match.");
      return;
    }

    const newHash = await hashPin(newPinValue, noteIdToUse);

    const now = Date.now();
    const updatedNote: Note = {
      id: noteIdToUse,
      accountId: username,
      profileId: note ? note.profileId : profileId,
      title: title.trim() || "Untitled Note",
      content: content,
      folderId: noteFolderId,
      tags: note?.tags || [],
      isPinned: isPinned,
      background: background,
      createdAt: note ? note.createdAt : now,
      updatedAt: now,
      isLocked: true,
      pinHash: newHash,
    };

    try {
      await saveNote(updatedNote);
      setPinHash(newHash);
      setShowChangePinModal(false);
      setCurrentPinValue("");
      setNewPinValue("");
      setConfirmPinValue("");
      setModalPinError("");
      onRefreshData();
    } catch (err) {
      setModalPinError("Failed to update PIN.");
    }
  };

  const handleRemovePinSubmit = async () => {
    if (!pinHash) return;
    const noteIdToUse = note?.id || currentNoteId;
    const currentHash = await hashPin(currentPinValue, noteIdToUse);
    if (currentHash !== pinHash) {
      setModalPinError("Incorrect current PIN.");
      return;
    }

    const now = Date.now();
    const updatedNote: Note = {
      id: noteIdToUse,
      accountId: username,
      profileId: note ? note.profileId : profileId,
      title: title.trim() || "Untitled Note",
      content: content,
      folderId: noteFolderId,
      tags: note?.tags || [],
      isPinned: isPinned,
      background: background,
      createdAt: note ? note.createdAt : now,
      updatedAt: now,
      isLocked: false,
      pinHash: undefined,
    };

    try {
      await saveNote(updatedNote);
      setIsLocked(false);
      setPinHash(undefined);
      setIsUnlocked(true);
      setShowRemovePinModal(false);
      setCurrentPinValue("");
      setModalPinError("");
      onRefreshData();
    } catch (err) {
      setModalPinError("Failed to remove PIN.");
    }
  };

  // Debounced history push
  const pushToHistory = (newTitle: string, newContent: string) => {
    if (isUndoingRedoing.current) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const currentHistory = historyRef.current;
      const currentIndex = indexRef.current;

      const cleanHistory = currentHistory.slice(0, currentIndex + 1);
      
      const lastState = cleanHistory[cleanHistory.length - 1];
      if (lastState && lastState.title === newTitle && lastState.content === newContent) {
        return;
      }

      const nextHistory = [...cleanHistory, { title: newTitle, content: newContent }];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }, 400);
  };

  // Immediate flush of pending history
  const flushPendingHistory = () => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;

      const currentHistory = historyRef.current;
      const currentIndex = indexRef.current;
      const cleanHistory = currentHistory.slice(0, currentIndex + 1);
      
      const lastState = cleanHistory[cleanHistory.length - 1];
      if (lastState && lastState.title === title && lastState.content === content) {
        return;
      }

      const nextHistory = [...cleanHistory, { title, content }];
      historyRef.current = nextHistory;
      indexRef.current = nextHistory.length - 1;
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    pushToHistory(val, content);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    pushToHistory(title, val);
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
  };

  const secondsRef = useRef<number>(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const toggleAudioPlayback = (playerWrapper: HTMLDivElement, audioSrc: string) => {
    const playBtn = playerWrapper.querySelector(".audio-play-btn");
    if (!playBtn) return;

    const playSvg = playBtn.querySelector(".play-svg");
    const pauseSvg = playBtn.querySelector(".pause-svg");

    if (currentAudioRef.current) {
      if (activePlayerWrapperRef.current === playerWrapper) {
        if (!currentAudioRef.current.paused) {
          currentAudioRef.current.pause();
          playSvg?.classList.remove("hidden");
          pauseSvg?.classList.add("hidden");
        } else {
          currentAudioRef.current.play().catch(err => console.error(err));
          playSvg?.classList.add("hidden");
          pauseSvg?.classList.remove("hidden");
        }
        return;
      } else {
        currentAudioRef.current.pause();
        const prevPlayBtn = activePlayerWrapperRef.current?.querySelector(".audio-play-btn");
        if (prevPlayBtn) {
          prevPlayBtn.querySelector(".play-svg")?.classList.remove("hidden");
          prevPlayBtn.querySelector(".pause-svg")?.classList.add("hidden");
        }
      }
    }

    const audio = new Audio(audioSrc);
    currentAudioRef.current = audio;
    activePlayerWrapperRef.current = playerWrapper;

    audio.play()
      .then(() => {
        playSvg?.classList.add("hidden");
        pauseSvg?.classList.remove("hidden");
      })
      .catch((err) => {
        console.error("Audio play failed:", err);
      });

    audio.onended = () => {
      playSvg?.classList.remove("hidden");
      pauseSvg?.classList.add("hidden");
      currentAudioRef.current = null;
      activePlayerWrapperRef.current = null;
    };
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const imgHtml = `
        <div class="image-wrapper relative group my-3 inline-block w-full max-w-sm" contenteditable="false">
          <img src="${base64Data}" class="max-w-full rounded-2xl border border-charcoal-800 object-cover" />
          <button class="image-delete-btn absolute top-2 right-2 w-8 h-8 rounded-lg bg-charcoal-950/80 border border-charcoal-800 hover:bg-red-950 hover:text-red-400 flex items-center justify-center text-charcoal-400 cursor-pointer transition-colors" type="button" title="Remove image">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      `;
      applyStyle("insertHTML", imgHtml + "<p><br></p>");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
  };

  const startRecording = async () => {
    try {
      setError("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Audio recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const durationStr = formatTime(secondsRef.current);
          const playerHtml = `
            <div class="audio-player-wrapper flex items-center gap-3 bg-charcoal-950/80 border border-charcoal-800 rounded-2xl p-4 my-3 max-w-sm" contenteditable="false" data-audio-src="${base64Data}">
              <button class="audio-play-btn w-10 h-10 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 flex items-center justify-center text-charcoal-100 cursor-pointer transition-colors shrink-0" type="button" title="Play recording">
                <svg class="w-5 h-5 fill-current play-svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <svg class="w-5 h-5 fill-current pause-svg hidden" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              </button>
              <div class="flex-1 flex flex-col min-w-0">
                <span class="text-xs font-bold text-charcoal-100 truncate">Voice Recording</span>
                <span class="text-[10px] text-charcoal-500 font-mono font-medium">${durationStr}</span>
              </div>
              <button class="audio-delete-btn w-9 h-9 rounded-xl bg-charcoal-900/60 border border-charcoal-800 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900/40 flex items-center justify-center text-charcoal-400 cursor-pointer transition-colors shrink-0" type="button" title="Delete recording">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          `;
          applyStyle("insertHTML", playerHtml + "<p><br></p>");
          stream.getTracks().forEach((track) => track.stop());
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      secondsRef.current = 0;
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      recordingIntervalRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setRecordingSeconds(secondsRef.current);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied or error:", err);
      setError("Unable to access microphone. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // Handle Smart Copy clicks
    const smartCopyEl = target.closest('[data-smart-copy="true"]') as HTMLElement | null;
    if (smartCopyEl) {
      e.preventDefault();
      e.stopPropagation();
      const textToCopy = smartCopyEl.textContent || "";
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Visual feedback on the element
          smartCopyEl.style.backgroundColor = "rgba(16, 185, 129, 0.25)";
          
          const feedback = document.createElement("span");
          feedback.className = "fixed bg-emerald-500 text-charcoal-950 font-bold text-[10px] px-1.5 py-0.5 rounded shadow-lg z-[150] animate-fade-in pointer-events-none";
          feedback.innerText = "Copied!";
          const rect = smartCopyEl.getBoundingClientRect();
          feedback.style.top = `${rect.top - 24}px`;
          feedback.style.left = `${rect.left + rect.width / 2}px`;
          feedback.style.transform = "translateX(-50%)";
          document.body.appendChild(feedback);
          
          setTimeout(() => {
            smartCopyEl.style.backgroundColor = "";
            feedback.remove();
          }, 1000);
        }).catch(err => {
          console.error("Smart Copy failed:", err);
        });
      }
      return;
    }

    // Handle Checkbox clicks
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      const checkbox = target as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.setAttribute("checked", "true");
      } else {
        checkbox.removeAttribute("checked");
      }
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setContent(newContent);
        pushToHistory(title, newContent);
      }
      return;
    }

    // Handle Audio play/delete clicks
    const playBtn = target.closest(".audio-play-btn") as HTMLButtonElement | null;
    const deleteBtn = target.closest(".audio-delete-btn") as HTMLButtonElement | null;
    const playerWrapper = target.closest(".audio-player-wrapper") as HTMLDivElement | null;

    if (playBtn && playerWrapper) {
      e.preventDefault();
      e.stopPropagation();
      const audioSrc = playerWrapper.getAttribute("data-audio-src");
      if (audioSrc) {
        toggleAudioPlayback(playerWrapper, audioSrc);
      }
      return;
    }

    if (deleteBtn && playerWrapper) {
      e.preventDefault();
      e.stopPropagation();
      playerWrapper.remove();
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setContent(newContent);
        pushToHistory(title, newContent);
      }
      return;
    }

    // Handle Image delete click
    const imageDeleteBtn = target.closest(".image-delete-btn") as HTMLButtonElement | null;
    const imageWrapper = target.closest(".image-wrapper") as HTMLDivElement | null;

    if (imageDeleteBtn && imageWrapper) {
      e.preventDefault();
      e.stopPropagation();
      imageWrapper.remove();
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setContent(newContent);
        pushToHistory(title, newContent);
      }
      return;
    }

    // Handle Code block delete click
    const codeDeleteBtn = target.closest(".code-delete-btn") as HTMLButtonElement | null;
    const codeBlockContainer = target.closest(".code-block-container") as HTMLDivElement | null;

    if (codeDeleteBtn && codeBlockContainer) {
      e.preventDefault();
      e.stopPropagation();
      codeBlockContainer.remove();
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        setContent(newContent);
        pushToHistory(title, newContent);
      }
      return;
    }

    // Handle divider click (select on click)
    if (target.tagName === "HR" || target.classList.contains("note-divider")) {
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNode(target);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }
  };

  const applyStyle = (command: string, value: string = "") => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const applyHighlightColor = (color: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        // If caret is already inside a highlight span, we change its color
        let node: Node | null = range.startContainer;
        let highlightEl: HTMLElement | null = null;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const bg = el.style.backgroundColor;
            if (el.tagName === "MARK" || (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)" && bg !== "none" && bg !== "")) {
              highlightEl = el;
              break;
            }
          }
          node = node.parentNode;
        }

        if (highlightEl) {
          highlightEl.style.backgroundColor = color;
        } else {
          // Not inside one, so turn highlight ON with this color at caret
          const span = document.createElement("span");
          span.className = "note-highlight";
          span.style.backgroundColor = color;
          span.innerHTML = "&#x200B;"; // Zero-width space
          range.insertNode(span);

          const newRange = document.createRange();
          newRange.setStart(span.firstChild!, 1);
          newRange.setEnd(span.firstChild!, 1);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // If there is selection, apply highlight color
        document.execCommand("HiliteColor", false, color);
        document.execCommand("backColor", false, color);
      }
    } else {
      document.execCommand("HiliteColor", false, color);
      document.execCommand("backColor", false, color);
    }

    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const toggleHighlight = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const isSelectionCollapsed = range.collapsed;

    if (isSelectionCollapsed) {
      // Toggle highlight on caret (when typing)
      if (isHighlight) {
        // Turning Highlight OFF: Break out of any highlighted element
        let node: Node | null = range.startContainer;
        let highlightEl: HTMLElement | null = null;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const bg = el.style.backgroundColor;
            if (el.tagName === "MARK" || (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)" && bg !== "none" && bg !== "")) {
              highlightEl = el;
              break;
            }
          }
          node = node.parentNode;
        }

        if (highlightEl) {
          // Move caret after the highlight element to type normally
          const parent = highlightEl.parentNode;
          if (parent) {
            const zeroWidthSpace = document.createTextNode("\u200B");
            if (highlightEl.nextSibling) {
              parent.insertBefore(zeroWidthSpace, highlightEl.nextSibling);
            } else {
              parent.appendChild(zeroWidthSpace);
            }

            // Move cursor to the zeroWidthSpace
            const newRange = document.createRange();
            newRange.setStart(zeroWidthSpace, 1);
            newRange.setEnd(zeroWidthSpace, 1);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } else {
          document.execCommand("HiliteColor", false, "transparent");
          document.execCommand("backColor", false, "transparent");
        }
      } else {
        // Turning Highlight ON: Insert a highlighted span at the caret
        const span = document.createElement("span");
        span.className = "note-highlight";
        span.style.backgroundColor = selectedHighlightColor;
        span.innerHTML = "&#x200B;"; // Zero-width space
        range.insertNode(span);

        // Position caret inside the span (after the zero-width space)
        const newRange = document.createRange();
        newRange.setStart(span.firstChild!, 1);
        newRange.setEnd(span.firstChild!, 1);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Toggle highlight on selected text
      if (isHighlight) {
        document.execCommand("HiliteColor", false, "transparent");
        document.execCommand("backColor", false, "transparent");
      } else {
        document.execCommand("HiliteColor", false, selectedHighlightColor);
        document.execCommand("backColor", false, selectedHighlightColor);
      }
    }

    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const applyFontSize = (size: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = size;
      try {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
        
        const zeroWidthSpace = document.createTextNode("\u200B");
        if (span.nextSibling) {
          span.parentNode?.insertBefore(zeroWidthSpace, span.nextSibling);
        } else {
          span.parentNode?.appendChild(zeroWidthSpace);
        }

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStart(zeroWidthSpace, 0);
        newRange.setEnd(zeroWidthSpace, 0);
        selection.addRange(newRange);
      } catch (err) {
        console.error("Apply font size failed:", err);
      }
      handleInput();
    }
    updateToolbarStates();
  };

  const uppercaseSelection = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      try {
        const fragment = range.extractContents();
        
        const uppercaseTextNodes = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = node.textContent?.toUpperCase() || "";
          } else {
            for (let i = 0; i < node.childNodes.length; i++) {
              uppercaseTextNodes(node.childNodes[i]);
            }
          }
        };
        uppercaseTextNodes(fragment);
        
        range.insertNode(fragment);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(fragment);
        selection.addRange(newRange);
      } catch (err) {
        console.error("Uppercase failed:", err);
      }
      handleInput();
    }
    updateToolbarStates();
  };

  const applySmartCopy = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let range = selection.getRangeAt(0);

      // Check for overlapping/intersecting smart copy elements
      const intersectingSmartCopies: HTMLElement[] = [];
      const allSmartCopies = editorRef.current?.querySelectorAll('[data-smart-copy="true"]') || [];
      
      const isIntersecting = (node: HTMLElement, range: Range) => {
        if (range.intersectsNode(node)) return true;
        try {
          if (node.contains(range.startContainer) || node.contains(range.endContainer)) return true;
        } catch (e) {}
        return false;
      };

      allSmartCopies.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (isIntersecting(htmlEl, range)) {
          intersectingSmartCopies.push(htmlEl);
        }
      });

      // Helper to unwrap a smart copy element
      const unwrapSmartCopy = (el: HTMLElement) => {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      };

      // Determine if we should remove/toggle OFF the Smart Copy behavior.
      // Rule: If selection is collapsed inside a smart copy, OR
      // if selection is entirely within or equal to a single smart copy region.
      let shouldRemove = false;
      if (intersectingSmartCopies.length === 1) {
        const scEl = intersectingSmartCopies[0];
        if (range.collapsed) {
          shouldRemove = true;
        } else {
          // Check if selection start and end are inside or matching the same single smart copy element
          if (scEl.contains(range.startContainer) && scEl.contains(range.endContainer)) {
            shouldRemove = true;
          }
        }
      }

      if (shouldRemove && intersectingSmartCopies.length === 1) {
        const scEl = intersectingSmartCopies[0];
        
        // Save range contents so selection is preserved after unwrapping
        const tempRange = document.createRange();
        tempRange.selectNodeContents(scEl);
        
        unwrapSmartCopy(scEl);
        
        selection.removeAllRanges();
        selection.addRange(tempRange);
        
        handleInput();
        updateToolbarStates();
        return;
      }

      // If we are NOT removing (we are creating or updating), we only proceed if selection is NOT collapsed.
      if (range.collapsed) {
        return;
      }

      // If we overlap with existing smart copy regions, we expand range to completely encompass them,
      // and we will unwrap any nested ones inside the extracted fragment!
      if (intersectingSmartCopies.length > 0) {
        try {
          const firstEl = intersectingSmartCopies[0];
          const lastEl = intersectingSmartCopies[intersectingSmartCopies.length - 1];

          const startRange = document.createRange();
          startRange.selectNode(firstEl);
          if (range.compareBoundaryPoints(Range.START_TO_START, startRange) > 0) {
            range.setStartBefore(firstEl);
          }

          const endRange = document.createRange();
          endRange.selectNode(lastEl);
          if (range.compareBoundaryPoints(Range.END_TO_END, endRange) < 0) {
            range.setEndAfter(lastEl);
          }
        } catch (e) {
          console.error("Failed to expand range for overlapping smart copy:", e);
        }
      }

      const span = document.createElement("span");
      span.className = "smart-copy-element cursor-pointer rounded px-0.5 transition-all select-all";
      span.setAttribute("data-smart-copy", "true");
      span.style.borderBottom = "1.5px dashed rgb(16, 185, 129)";
      span.style.color = "rgb(16, 185, 129)";
      span.setAttribute("title", "Tap to copy");
      
      try {
        const fragment = range.extractContents();
        
        // Unwrap any nested data-smart-copy elements inside the fragment
        const nestedSmartCopies = fragment.querySelectorAll('[data-smart-copy="true"]');
        nestedSmartCopies.forEach((el) => {
          unwrapSmartCopy(el as HTMLElement);
        });

        span.appendChild(fragment);
        range.insertNode(span);
        
        const zeroWidthSpace = document.createTextNode("\u200B");
        if (span.nextSibling) {
          span.parentNode?.insertBefore(zeroWidthSpace, span.nextSibling);
        } else {
          span.parentNode?.appendChild(zeroWidthSpace);
        }

        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStart(zeroWidthSpace, 1);
        newRange.setEnd(zeroWidthSpace, 1);
        selection.addRange(newRange);
      } catch (err) {
        console.error("Apply smart copy failed:", err);
      }
      handleInput();
    }
    updateToolbarStates();
  };

  const handleCustomCopy = () => {
    const selection = window.getSelection();
    if (selection) {
      const selectedText = selection.toString();
      if (selectedText) {
        navigator.clipboard.writeText(selectedText).catch((err) => {
          console.error("Custom copy failed:", err);
        });
      }
    }
    setContextMenuPos((prev) => ({ ...prev, visible: false }));
  };

  const handleCustomPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editorRef.current?.focus();
        document.execCommand("insertHTML", false, text);
        handleInput();
      }
    } catch (err) {
      console.error("Custom paste failed:", err);
    }
    setContextMenuPos((prev) => ({ ...prev, visible: false }));
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      bottom: e.clientY + 10,
      visible: true
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Handle selected divider (non-collapsed selection when a user clicks the divider directly)
        if (!range.collapsed) {
          const container = range.startContainer;
          if (container.nodeType === Node.ELEMENT_NODE) {
            const selectedNode = container.childNodes[range.startOffset];
            if (selectedNode && (selectedNode.nodeName === "HR" || (selectedNode.nodeType === Node.ELEMENT_NODE && (selectedNode as HTMLElement).classList.contains("note-divider")))) {
              e.preventDefault();
              selectedNode.remove();
              handleInput();
              updateToolbarStates();
              return;
            }
          }
          // Fallback check if range ancestor is the divider itself
          const commonParent = range.commonAncestorContainer;
          if (commonParent.nodeType === Node.ELEMENT_NODE) {
            const el = commonParent as HTMLElement;
            if (el.tagName === "HR" || el.classList.contains("note-divider")) {
              e.preventDefault();
              el.remove();
              handleInput();
              updateToolbarStates();
              return;
            }
          }
        }
        
        if (range.collapsed) {
          if (e.key === "Backspace") {
            let container = range.startContainer;
            let offset = range.startOffset;
            
            if (container.nodeType === Node.TEXT_NODE && offset === 0) {
              let prev = container.previousSibling;
              if (!prev) {
                let parent = container.parentNode;
                if (parent && parent !== editorRef.current) {
                  prev = parent.previousSibling;
                }
              }
              if (prev && (prev.nodeName === "HR" || (prev.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).classList.contains("note-divider")))) {
                e.preventDefault();
                prev.remove();
                handleInput();
                updateToolbarStates();
                return;
              }
            } else if (container.nodeType === Node.ELEMENT_NODE) {
              const child = container.childNodes[offset - 1];
              if (child && (child.nodeName === "HR" || (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).classList.contains("note-divider")))) {
                e.preventDefault();
                child.remove();
                handleInput();
                updateToolbarStates();
                return;
              }
            }
          }
          
          if (e.key === "Delete") {
            let container = range.startContainer;
            let offset = range.startOffset;
            
            if (container.nodeType === Node.TEXT_NODE && offset === container.textContent?.length) {
              let next = container.nextSibling;
              if (!next) {
                let parent = container.parentNode;
                if (parent && parent !== editorRef.current) {
                  next = parent.nextSibling;
                }
              }
              if (next && (next.nodeName === "HR" || (next.nodeType === Node.ELEMENT_NODE && (next as HTMLElement).classList.contains("note-divider")))) {
                e.preventDefault();
                next.remove();
                handleInput();
                updateToolbarStates();
                return;
              }
            } else if (container.nodeType === Node.ELEMENT_NODE) {
              const child = container.childNodes[offset];
              if (child && (child.nodeName === "HR" || (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).classList.contains("note-divider")))) {
                e.preventDefault();
                child.remove();
                handleInput();
                updateToolbarStates();
                return;
              }
            }
          }
        }
      }
    }
  };

  const handleQuote = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const parentNode = selection.getRangeAt(0).startContainer.parentNode as HTMLElement;
      const insideBlockquote = parentNode?.closest("blockquote");
      if (insideBlockquote) {
        applyStyle("formatBlock", "p");
      } else {
        applyStyle("formatBlock", "blockquote");
      }
    } else {
      applyStyle("formatBlock", "blockquote");
    }
  };

  const handleCodeBlock = () => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    let textToWrap = "";
    if (selection && selection.rangeCount > 0) {
      textToWrap = selection.toString();
    }
    const codeBlockHtml = `
      <div class="code-block-container my-3 relative group" contenteditable="false" style="position: relative;">
        <pre class="bg-charcoal-950 border border-charcoal-800 rounded-2xl p-4 font-mono text-xs text-charcoal-300 overflow-x-auto min-h-[40px] focus:outline-none" contenteditable="true" style="background-color: rgb(10, 10, 10); border: 1px solid rgb(38, 38, 38); border-radius: 1rem; padding: 1rem; font-family: monospace; font-size: 12px; color: rgb(212, 212, 212); overflow-x: auto; outline: none; margin-top: 0.5rem; margin-bottom: 0.5rem;">${textToWrap || "Code block..."}</pre>
        <button class="code-delete-btn absolute top-2 right-2 w-8 h-8 rounded-lg bg-charcoal-900/80 border border-charcoal-800 hover:bg-red-950 hover:text-red-400 flex items-center justify-center text-charcoal-400 cursor-pointer transition-colors" contenteditable="false" type="button" title="Delete Code Block" style="position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background-color: rgba(23, 23, 23, 0.8); border: 1px solid rgb(38, 38, 38); border-radius: 8px; color: rgb(163, 163, 163); cursor: pointer; transition: all 0.2s;">
          <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <p><br></p>
    `;
    applyStyle("insertHTML", codeBlockHtml);
  };

  const insertTable = (rows: number, cols: number) => {
    editorRef.current?.focus();
    
    let tableHtml = `<div class="table-scroll-container my-3" style="overflow-x: auto; max-width: 100%; width: 100%;"><table class="note-table w-full border-collapse text-charcoal-200" style="border: 1px solid rgba(255,255,255,0.1); border-collapse: collapse; width: 100%; min-width: 500px;">`;
    
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          tableHtml += `<th style="border: 1px solid rgba(255,255,255,0.1); padding: 8px; font-weight: bold; text-align: left; font-size: 11px; background-color: rgba(255, 255, 255, 0.05);"><br></th>`;
        } else {
          tableHtml += `<td style="border: 1px solid rgba(255,255,255,0.1); padding: 8px; font-size: 11px;"><br></td>`;
        }
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</table></div><p><br></p>`;
    
    applyStyle("insertHTML", tableHtml);
  };

  const addRow = () => {
    const ctx = getTableContext();
    if (!ctx) return;
    const { table, row } = ctx;
    const colCount = row.cells.length;
    const newRow = table.insertRow(row.rowIndex + 1);
    for (let i = 0; i < colCount; i++) {
      const cell = newRow.insertCell();
      cell.innerHTML = "<br>";
      cell.style.border = "1px solid rgba(255,255,255,0.1)";
      cell.style.padding = "8px";
      cell.style.fontSize = "11px";
    }
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const addColumn = () => {
    const ctx = getTableContext();
    if (!ctx) return;
    const { table, colIndex } = ctx;
    const rows = Array.from(table.rows);
    rows.forEach((r) => {
      const isHeader = r.parentElement?.tagName === "THEAD" || r.rowIndex === 0 || r.querySelector("th") !== null;
      let cell: HTMLTableCellElement;
      if (isHeader) {
        cell = document.createElement("th");
        cell.innerHTML = "<br>";
        cell.style.fontWeight = "bold";
        cell.style.textAlign = "left";
        cell.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
        
        // Insert cell at specific index
        const refCell = r.cells[colIndex];
        if (refCell && refCell.nextSibling) {
          r.insertBefore(cell, refCell.nextSibling);
        } else {
          r.appendChild(cell);
        }
      } else {
        cell = r.insertCell(colIndex + 1);
        cell.innerHTML = "<br>";
      }
      cell.style.border = "1px solid rgba(255,255,255,0.1)";
      cell.style.padding = "8px";
      cell.style.fontSize = "11px";
    });
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const deleteRow = () => {
    const ctx = getTableContext();
    if (!ctx) return;
    const { table, row } = ctx;
    table.deleteRow(row.rowIndex);
    if (table.rows.length === 0) {
      const parent = table.parentElement;
      if (parent && parent.classList.contains("table-scroll-container")) {
        parent.remove();
      } else {
        table.remove();
      }
    }
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const deleteColumn = () => {
    const ctx = getTableContext();
    if (!ctx) return;
    const { table, colIndex } = ctx;
    const rows = Array.from(table.rows);
    rows.forEach((r) => {
      if (r.cells.length > colIndex) {
        r.deleteCell(colIndex);
      }
    });
    if (rows[0] && rows[0].cells.length === 0) {
      const parent = table.parentElement;
      if (parent && parent.classList.contains("table-scroll-container")) {
        parent.remove();
      } else {
        table.remove();
      }
    }
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const deleteTable = () => {
    const ctx = getTableContext();
    if (!ctx) return;
    const parent = ctx.table.parentElement;
    if (parent && parent.classList.contains("table-scroll-container")) {
      parent.remove();
    } else {
      ctx.table.remove();
    }
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const clearCellContent = () => {
    const ctx = getTableContext();
    if (!ctx) return;
    ctx.cell.innerHTML = "<br>";
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      pushToHistory(title, newContent);
    }
    updateToolbarStates();
  };

  const handleUndo = () => {
    flushPendingHistory();
    const currentIndex = indexRef.current;
    if (currentIndex > 0) {
      isUndoingRedoing.current = true;
      const prevIndex = currentIndex - 1;
      const prevState = historyRef.current[prevIndex];
      setTitle(prevState.title);
      setContent(prevState.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = prevState.content;
      }
      setHistoryIndex(prevIndex);
      setTimeout(() => {
        isUndoingRedoing.current = false;
      }, 0);
    }
  };

  const handleRedo = () => {
    flushPendingHistory();
    const currentIndex = indexRef.current;
    if (currentIndex < historyRef.current.length - 1) {
      isUndoingRedoing.current = true;
      const nextIndex = currentIndex + 1;
      const nextState = historyRef.current[nextIndex];
      setTitle(nextState.title);
      setContent(nextState.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = nextState.content;
      }
      setHistoryIndex(nextIndex);
      setTimeout(() => {
        isUndoingRedoing.current = false;
      }, 0);
    }
  };

  // Silent Save and Exit
  const handleBackAndSave = async () => {
    flushPendingHistory();

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    // If completely empty and it is a new note and not locked, do not save to avoid cluttering DB
    if (!cleanTitle && !cleanContent && !isLocked) {
      onClose();
      return;
    }

    try {
      const now = Date.now();
      const updatedNote: Note = {
        id: note ? note.id : currentNoteId,
        accountId: username,
        profileId: note ? note.profileId : profileId,
        title: cleanTitle || "Untitled Note",
        content: cleanContent,
        folderId: noteFolderId,
        tags: note?.tags || [],
        isPinned: isPinned,
        background: background,
        createdAt: note ? note.createdAt : now,
        updatedAt: now,
        isLocked: isLocked,
        pinHash: pinHash,
      };

      await saveNote(updatedNote);
      onRefreshData();
      onClose();
    } catch (err) {
      console.error("Failed to save note silently:", err);
      onClose();
    }
  };

  // Delete Action Confirm
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!note && !cleanTitle && !cleanContent) {
      onClose();
      return;
    }

    try {
      const now = Date.now();
      const updatedNote: Note = {
        id: note ? note.id : generateUUID(),
        accountId: username,
        profileId: note ? note.profileId : profileId,
        title: cleanTitle || (note ? note.title : "Untitled Note"),
        content: cleanContent,
        folderId: noteFolderId,
        tags: note?.tags || [],
        isPinned: isPinned,
        background: background,
        createdAt: note ? note.createdAt : now,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
        isLocked: isLocked,
        pinHash: pinHash,
      };

      await saveNote(updatedNote);
      onRefreshData();
      onClose();
    } catch (err) {
      setError("Failed to delete note.");
    }
  };

  const getBackgroundClass = () => {
    switch (background) {
      case "dotted":
        return "bg-note-dotted";
      default:
        return "bg-note-default";
    }
  };

  if (isLocked && !isUnlocked) {
    return (
      <div className={`fixed inset-0 z-40 flex flex-col h-full w-full max-w-md mx-auto border-x border-charcoal-800/40 animate-slide-in ${getBackgroundClass()}`}>
        {/* Header with Back button */}
        <div className="h-16 shrink-0 px-4 flex items-center justify-between select-none bg-transparent">
          <button
            id="back-to-list-locked"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm backdrop-blur-md"
            title="Back to Notes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-400">
            Protected Note
          </span>
          <div className="w-10" />
        </div>

        {/* Dedicated Unlock UI */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-charcoal-800/60 border border-charcoal-700/60 flex items-center justify-center text-charcoal-200 shadow-md mb-4 backdrop-blur-md">
            <Lock className="w-8 h-8 text-charcoal-200" />
          </div>

          <h2 className="text-lg font-bold text-charcoal-100 mb-1 truncate max-w-full px-4">
            {title || "Locked Note"}
          </h2>
          <p className="text-xs text-charcoal-400 mb-6">
            Enter 4-digit PIN to unlock
          </p>

          {/* 4 Digit Visual Dots */}
          <div className="flex justify-center gap-4 mb-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pinInput.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    isFilled
                      ? "bg-charcoal-100 border-charcoal-100 scale-110 shadow-sm"
                      : "border-charcoal-600 bg-charcoal-800/50"
                  }`}
                />
              );
            })}
          </div>

          {/* Error message */}
          {pinError ? (
            <div className="text-xs text-red-400 font-semibold mb-6 animate-shake">
              {pinError}
            </div>
          ) : (
            <div className="h-5 mb-6" />
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs px-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                id={`keypad-${num}`}
                onClick={() => {
                  if (pinInput.length < 4) {
                    setPinInput((prev) => prev + num.toString());
                    setPinError("");
                  }
                }}
                className="h-14 rounded-2xl bg-charcoal-800/40 hover:bg-charcoal-800 border border-charcoal-700/40 text-lg font-bold text-charcoal-100 flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow-sm"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              id="keypad-clear"
              onClick={() => {
                setPinInput("");
                setPinError("");
              }}
              className="h-14 rounded-2xl bg-charcoal-800/20 hover:bg-charcoal-800/40 border border-charcoal-700/30 text-xs font-bold text-charcoal-400 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
            >
              Clear
            </button>

            <button
              type="button"
              id="keypad-0"
              onClick={() => {
                if (pinInput.length < 4) {
                  setPinInput((prev) => prev + "0");
                  setPinError("");
                }
              }}
              className="h-14 rounded-2xl bg-charcoal-800/40 hover:bg-charcoal-800 border border-charcoal-700/40 text-lg font-bold text-charcoal-100 flex items-center justify-center cursor-pointer transition-colors active:scale-95 shadow-sm"
            >
              0
            </button>

            <button
              type="button"
              id="keypad-backspace"
              onClick={() => {
                setPinInput((prev) => prev.slice(0, -1));
                setPinError("");
              }}
              className="h-14 rounded-2xl bg-charcoal-800/20 hover:bg-charcoal-800/40 border border-charcoal-700/30 text-charcoal-300 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              title="Delete"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-40 flex flex-col h-full w-full max-w-md mx-auto border-x border-charcoal-800/40 animate-slide-in ${getBackgroundClass()}`}>
      {/* Editor Header / Action Bar - Floating individual elements, no solid background */}
      <div className="h-16 shrink-0 px-4 flex items-center justify-between select-none bg-transparent">
        {/* Left: Back Icon */}
        <button
          id="back-to-list"
          onClick={handleBackAndSave}
          className="w-10 h-10 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95 shadow-sm backdrop-blur-md"
          title="Back and Save"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Right: Undo/Redo Pill and Three-dot menu */}
        <div className="flex items-center gap-2">

          {/* Undo/Redo pill */}
          <div className="flex items-center bg-charcoal-800/40 border border-charcoal-700/40 rounded-full p-1 h-10 gap-0.5 backdrop-blur-md shadow-sm">
            <button
              id="undo-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-300 hover:text-charcoal-50 disabled:opacity-30 disabled:hover:text-charcoal-300 cursor-pointer transition-colors"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-charcoal-700/40" />
            <button
              id="redo-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-300 hover:text-charcoal-50 disabled:opacity-30 disabled:hover:text-charcoal-300 cursor-pointer transition-colors"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Three-dot menu */}
          <div className="relative">
            <button
              id="editor-menu-btn"
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors backdrop-blur-md shadow-sm"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-charcoal-850/95 border border-charcoal-700/60 rounded-2xl p-1 shadow-lg z-50 animate-fade-in backdrop-blur-md">
                {/* Pin/Unpin option */}
                <button
                  id="menu-pin-note"
                  onClick={async () => {
                    setShowMenu(false);
                    const newPinned = !isPinned;
                    setIsPinned(newPinned);
                    if (note) {
                      try {
                        const updatedNote: Note = {
                          ...note,
                          isPinned: newPinned,
                          updatedAt: Date.now(),
                        };
                        await saveNote(updatedNote);
                        onRefreshData();
                      } catch (err) {
                        console.error("Failed to pin/unpin note:", err);
                      }
                    }
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                >
                  <Pin className="w-4 h-4 text-charcoal-400" />
                  <span>{isPinned ? "Unpin Note" : "Pin Note"}</span>
                </button>

                {/* Move to Folder option */}
                <button
                  id="menu-move-note"
                  onClick={() => {
                    setShowMenu(false);
                    setShowMoveDialog(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                >
                  <FolderOpen className="w-4 h-4 text-charcoal-400" />
                  <span>Move Note</span>
                </button>

                {/* Change Background option */}
                <div className="border-b border-charcoal-800/60">
                  <button
                    id="menu-change-background"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowBackgroundOptions(!showBackgroundOptions);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-charcoal-400" />
                      <span>Change Background</span>
                    </div>
                  </button>

                  {showBackgroundOptions && (
                    <div className="px-2 pb-2 flex flex-col gap-1.5 animate-fade-in bg-charcoal-900/40 rounded-xl m-1 p-1">
                      {[
                        { id: "default", label: "Charcoal Black" },
                        { id: "dotted", label: "Dotted Layout" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          id={`bg-option-${opt.id}`}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBackground(opt.id);
                            // If note already exists, commit to DB immediately
                            if (note) {
                              try {
                                const updatedNote: Note = {
                                  ...note,
                                  background: opt.id,
                                  updatedAt: Date.now(),
                                };
                                await saveNote(updatedNote);
                                onRefreshData();
                              } catch (err) {
                                console.error("Failed to save note background change:", err);
                              }
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-between ${
                            background === opt.id 
                              ? "bg-charcoal-800 text-charcoal-100" 
                              : "text-charcoal-400 hover:bg-charcoal-800/60 hover:text-charcoal-200"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {background === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-charcoal-100" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PIN Lock Management Options */}
                {!isLocked ? (
                  <button
                    id="menu-lock-note"
                    onClick={() => {
                      setShowMenu(false);
                      setModalPinError("");
                      setNewPinValue("");
                      setConfirmPinValue("");
                      setShowSetPinModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                  >
                    <Lock className="w-4 h-4 text-charcoal-400" />
                    <span>Lock Note</span>
                  </button>
                ) : (
                  <>
                    <button
                      id="menu-lock-now"
                      onClick={() => {
                        setShowMenu(false);
                        setIsUnlocked(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                    >
                      <Lock className="w-4 h-4 text-charcoal-400" />
                      <span>Lock Now</span>
                    </button>

                    <button
                      id="menu-change-pin"
                      onClick={() => {
                        setShowMenu(false);
                        setModalPinError("");
                        setCurrentPinValue("");
                        setNewPinValue("");
                        setConfirmPinValue("");
                        setShowChangePinModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                    >
                      <KeyRound className="w-4 h-4 text-charcoal-400" />
                      <span>Change PIN</span>
                    </button>

                    <button
                      id="menu-remove-pin"
                      onClick={() => {
                        setShowMenu(false);
                        setModalPinError("");
                        setCurrentPinValue("");
                        setShowRemovePinModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                    >
                      <Unlock className="w-4 h-4 text-charcoal-400" />
                      <span>Remove PIN</span>
                    </button>
                  </>
                )}

                {/* Note Info option */}
                <button
                  id="menu-note-info"
                  onClick={() => {
                    setShowMenu(false);
                    setShowNoteInfo(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-50 transition-colors flex items-center gap-2 cursor-pointer border-b border-charcoal-800/60"
                >
                  <Info className="w-4 h-4 text-charcoal-400" />
                  <span>Note Info</span>
                </button>

                <button
                  id="menu-delete-note"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col px-6 py-4 gap-4 overflow-y-auto">
        {error && (
          <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-xs text-red-300 mb-2">
            {error}
          </div>
        )}

        {/* Title input */}
        <input
          id="note-title-input"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled Note"
          className="w-full text-2xl font-bold bg-transparent text-charcoal-50 placeholder:text-charcoal-700 focus:outline-none tracking-tight py-1 shrink-0"
        />

        {/* Word/Character counter */}
        {(() => {
          const { words, characters } = getCounts(content);
          return (
            <div className="flex items-center gap-3 text-[10px] font-mono text-charcoal-400 select-none pb-1 shrink-0 border-b border-charcoal-800/30">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-charcoal-500" />
                <span>{words} {words === 1 ? "word" : "words"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-charcoal-500" />
                <span>{characters} {characters === 1 ? "character" : "characters"}</span>
              </span>
            </div>
          );
        })()}

        {/* Body content writing area */}
        <div
          ref={editorRef}
          id="note-content-input"
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={(e) => {
            handleEditorClick(e);
            updateToolbarStates();
          }}
          onBlur={() => {
            handleInput();
            updateToolbarStates();
          }}
          onKeyUp={updateToolbarStates}
          onMouseUp={updateToolbarStates}
          onContextMenu={handleContextMenu}
          className="rich-editor w-full flex-1 text-sm leading-relaxed bg-transparent text-charcoal-200 focus:outline-none font-sans overflow-y-auto pb-32 min-h-[300px] outline-none"
          placeholder="Start typing your thoughts here..."
          style={{ WebkitUserSelect: "text", userSelect: "text" }}
        />
      </div>

      {/* Table Context Controls (Appears contextually when cursor is inside a table cell) */}
      {activeTableContext && (
        <div className="w-full bg-charcoal-900 border-t border-charcoal-800/80 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto z-45 shrink-0 select-none animate-slide-in">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-400 shrink-0">
            <span className="font-semibold text-charcoal-200">Table:</span>
            <span>Row {activeTableContext.rowIndex + 1}, Col {activeTableContext.colIndex + 1}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onMouseDown={(e) => { e.preventDefault(); addRow(); }}
              className="px-2 py-1 text-[10px] font-semibold bg-charcoal-800 text-charcoal-100 rounded-lg hover:bg-charcoal-750 hover:text-white transition-colors cursor-pointer"
            >
              + Row
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); addColumn(); }}
              className="px-2 py-1 text-[10px] font-semibold bg-charcoal-800 text-charcoal-100 rounded-lg hover:bg-charcoal-750 hover:text-white transition-colors cursor-pointer"
            >
              + Col
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); deleteRow(); }}
              className="px-2 py-1 text-[10px] font-semibold bg-charcoal-800 hover:bg-red-950/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Delete Row"
            >
              Del Row
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); deleteColumn(); }}
              className="px-2 py-1 text-[10px] font-semibold bg-charcoal-800 hover:bg-red-950/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Delete Column"
            >
              Del Col
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); clearCellContent(); }}
              className="px-2 py-1 text-[10px] font-semibold bg-charcoal-800 hover:bg-amber-950/40 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
              title="Clear Cell Content"
            >
              Clear
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); deleteTable(); }}
              className="px-2 py-1 text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-900/40 rounded-lg hover:bg-red-900 hover:text-white transition-colors cursor-pointer"
              title="Delete Entire Table"
            >
              Delete Table
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sticky Formatting Toolbar */}
      <div 
        ref={toolbarRef}
        id="formatting-toolbar"
        className="w-full bg-charcoal-900 border-t border-charcoal-800/85 px-4 py-2.5 flex items-center gap-1 overflow-x-auto select-none shrink-0 scrollbar-none z-40 transition-all duration-100 ease-out"
        style={toolbarStyle}
      >
        {(() => {
          let activeToolIds =
            toolbarConfig.toolbarMode === "default"
              ? DEFAULT_TOOLS.map((t) => t.id)
              : toolbarConfig.toolsOrder.filter((id) => toolbarConfig.enabledTools[id]);

          if (toolbarConfig.toolbarMode === "custom" && activeToolIds.length === 0) {
            activeToolIds = ["bold"];
          }

          return (
            <>
              {activeToolIds.map((id) => {
                switch (id) {
                  case "fontSize":
                    return showFontSizeConfig ? (
                      <div key="fontSize" className="flex items-center gap-1.5 bg-charcoal-800 border border-charcoal-700/60 rounded-xl px-2.5 py-1 text-xs shrink-0 animate-fade-in z-50">
                        <span className="text-charcoal-400 font-medium">Size:</span>
                        {["12px", "14px", "16px", "20px", "24px"].map((sz) => (
                          <button
                            key={sz}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyFontSize(sz);
                              setShowFontSizeConfig(false);
                            }}
                            className="px-2 py-1 bg-charcoal-900 hover:bg-charcoal-750 text-charcoal-100 rounded-lg text-[10px] font-mono cursor-pointer transition-colors"
                          >
                            {sz}
                          </button>
                        ))}
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowFontSizeConfig(false);
                          }}
                          className="text-charcoal-400 hover:text-charcoal-200 font-bold px-1.5 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        key="fontSize"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowFontSizeConfig(true);
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Font Size"
                      >
                        <Type className="w-4 h-4" />
                      </button>
                    );

                  case "uppercase":
                    return (
                      <button
                        key="uppercase"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          uppercaseSelection();
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Convert to Uppercase"
                      >
                        <CaseSensitive className="w-4 h-4" />
                      </button>
                    );

                  case "bold":
                    return (
                      <button
                        key="bold"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("bold");
                        }}
                        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shrink-0 ${
                          isBold 
                            ? "bg-charcoal-800 text-charcoal-50" 
                            : "text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100"
                        }`}
                        title="Bold"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                    );

                  case "italic":
                    return (
                      <button
                        key="italic"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("italic");
                        }}
                        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shrink-0 ${
                          isItalic 
                            ? "bg-charcoal-800 text-charcoal-50" 
                            : "text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100"
                        }`}
                        title="Italic"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                    );

                  case "underline":
                    return (
                      <button
                        key="underline"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("underline");
                        }}
                        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shrink-0 ${
                          isUnderline 
                            ? "bg-charcoal-800 text-charcoal-50" 
                            : "text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100"
                        }`}
                        title="Underline"
                      >
                        <Underline className="w-4 h-4" />
                      </button>
                    );

                  case "highlight":
                    return (
                      <React.Fragment key="highlight">
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            toggleHighlight();
                          }}
                          className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shrink-0 ${
                            isHighlight 
                              ? "bg-charcoal-800 text-charcoal-50" 
                              : "text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100"
                          }`}
                          title="Highlight Text"
                        >
                          <Highlighter className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-charcoal-950/40 rounded-xl border border-charcoal-800/40 shrink-0">
                          {HIGHLIGHT_COLORS.map((col) => {
                            const isSelected = selectedHighlightColor === col.value;
                            return (
                              <button
                                key={col.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedHighlightColor(col.value);
                                  applyHighlightColor(col.value);
                                }}
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer ${col.dot} hover:scale-110 active:scale-95`}
                                style={{
                                  boxShadow: isSelected ? "0 0 0 2px var(--color-charcoal-100)" : "none"
                                }}
                                title={`Highlight ${col.label}`}
                              />
                            );
                          })}
                        </div>
                      </React.Fragment>
                    );

                  case "smartCopy":
                    return (
                      <button
                        key="smartCopy"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySmartCopy();
                        }}
                        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shrink-0 ${
                          isSmartCopy 
                            ? "bg-charcoal-800 text-charcoal-50" 
                            : "text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100"
                        }`}
                        title="Make Smart Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    );

                  case "bulletList":
                    return (
                      <button
                        key="bulletList"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("insertUnorderedList");
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Bullet List"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    );

                  case "numberedList":
                    return (
                      <button
                        key="numberedList"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("insertOrderedList");
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Numbered List"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                    );

                  case "checkList":
                    return (
                      <button
                        key="checkList"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("insertHTML", '<div class="flex items-center gap-2 my-1" contenteditable="true"><input type="checkbox" class="w-4 h-4 rounded border-charcoal-700 bg-charcoal-950 text-charcoal-50 accent-charcoal-50 cursor-pointer shrink-0" style="margin-right: 8px;" />&nbsp;</div>');
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Checklist"
                      >
                        <ListTodo className="w-4 h-4" />
                      </button>
                    );

                  case "quote":
                    return (
                      <button
                        key="quote"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleQuote();
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Quote"
                      >
                        <Quote className="w-4 h-4" />
                      </button>
                    );

                  case "codeBlock":
                    return (
                      <button
                        key="codeBlock"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCodeBlock();
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Code Block"
                      >
                        <Code className="w-4 h-4" />
                      </button>
                    );

                  case "divider":
                    return (
                      <button
                        key="divider"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const dividerHtml = `<hr class="note-divider" /><p><br></p>`;
                          applyStyle("insertHTML", dividerHtml);
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Horizontal Divider"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    );

                  case "alignLeft":
                    return (
                      <button
                        key="alignLeft"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("justifyLeft");
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Align Left"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                    );

                  case "alignCenter":
                    return (
                      <button
                        key="alignCenter"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("justifyCenter");
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Align Center"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                    );

                  case "alignRight":
                    return (
                      <button
                        key="alignRight"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applyStyle("justifyRight");
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Align Right"
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    );

                  case "table":
                    return showTableConfig ? (
                      <div key="table" className="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700/60 rounded-xl px-2.5 py-1 text-xs shrink-0 animate-fade-in z-50">
                        <span className="text-charcoal-400 font-medium">Table:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={tableRowsInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d+$/.test(val)) {
                              setTableRowsInput(val);
                            }
                          }}
                          className="w-10 bg-charcoal-900 border border-charcoal-750 rounded px-1 text-center font-mono text-charcoal-100 focus:outline-none"
                          title="Rows"
                        />
                        <span className="text-charcoal-500">x</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={tableColsInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d+$/.test(val)) {
                              setTableColsInput(val);
                            }
                          }}
                          className="w-10 bg-charcoal-900 border border-charcoal-750 rounded px-1 text-center font-mono text-charcoal-100 focus:outline-none"
                          title="Columns"
                        />
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const r = Math.max(1, parseInt(tableRowsInput) || 3);
                            const c = Math.max(1, parseInt(tableColsInput) || 2);
                            insertTable(r, c);
                            setShowTableConfig(false);
                          }}
                          className="bg-charcoal-100 hover:bg-charcoal-50 text-charcoal-900 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                        >
                          Insert
                        </button>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowTableConfig(false);
                          }}
                          className="text-charcoal-400 hover:text-charcoal-200 font-bold px-1.5 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        key="table"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowTableConfig(true);
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Insert Custom Table"
                      >
                        <Table className="w-4 h-4" />
                      </button>
                    );

                  case "image":
                    return (
                      <button
                        key="image"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleImageUploadClick();
                        }}
                        className="p-2 rounded-xl text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Add Image"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                    );

                  case "voice":
                    return (
                      <button
                        key="voice"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (isRecording) {
                            stopRecording();
                          } else {
                            startRecording();
                          }
                        }}
                        className={`p-2 rounded-xl active:scale-95 transition-all cursor-pointer shrink-0 ${isRecording ? "text-red-500 bg-red-950/20 hover:bg-red-950/40" : "text-charcoal-400 hover:bg-charcoal-800 hover:text-charcoal-100"}`}
                        title={isRecording ? "Stop Recording" : "Record Audio"}
                      >
                        {isRecording ? <Square className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                      </button>
                    );

                  default:
                    return null;
                }
              })}
            </>
          );
        })()}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      {isRecording && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-charcoal-950 border border-red-900/40 px-4 py-2.5 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-md z-50 select-none animate-slide-in">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
          <span className="text-xs font-semibold text-charcoal-100">Recording...</span>
          <span className="text-xs font-mono font-medium text-charcoal-400">{formatTime(recordingSeconds)}</span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stopRecording();
            }}
            className="ml-1 px-3 py-1 bg-red-950/40 hover:bg-red-950/60 text-red-400 rounded-lg text-[10px] font-bold border border-red-900/40 transition-colors cursor-pointer"
          >
            Stop
          </button>
        </div>
      )}

      {/* Move to Folder Selection Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-charcoal-50">Move to Folder</h3>
              <p className="text-xs text-charcoal-300">Select a folder to move this note to.</p>
            </div>

            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              {/* Uncategorized */}
              <button
                id="move-to-uncategorized"
                onClick={() => {
                  setSelectedTargetFolderId(undefined);
                  setShowMoveConfirm(true);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-750 hover:text-charcoal-100 transition-all text-left cursor-pointer ${
                  noteFolderId === undefined ? "border border-charcoal-600 bg-charcoal-750 text-charcoal-50" : ""
                }`}
              >
                <FolderIcon name="Folder" colorId="default" className="w-4 h-4 shrink-0" />
                <span>Uncategorized</span>
              </button>

              {/* User created folders */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  id={`move-to-folder-${folder.id}`}
                  onClick={() => {
                    setSelectedTargetFolderId(folder.id);
                    setShowMoveConfirm(true);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-charcoal-300 hover:bg-charcoal-750 hover:text-charcoal-100 transition-all text-left cursor-pointer ${
                    noteFolderId === folder.id ? "border border-charcoal-600 bg-charcoal-750 text-charcoal-50" : ""
                  }`}
                >
                  <FolderIcon name={folder.icon} colorId={folder.color} className="w-4 h-4 shrink-0" />
                  <span className="truncate ml-1">{folder.name}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-1">
              <button
                id="move-folder-cancel"
                onClick={() => setShowMoveDialog(false)}
                className="px-4 h-10 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-750 text-charcoal-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showMoveConfirm}
        title="Move Note"
        message="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={async () => {
          setNoteFolderId(selectedTargetFolderId);
          setShowMoveConfirm(false);
          setShowMoveDialog(false);

          // If note already exists, commit change to DB immediately
          if (note) {
            try {
              const updatedNote: Note = {
                ...note,
                title: title.trim() || "Untitled Note",
                content: content.trim(),
                folderId: selectedTargetFolderId,
                updatedAt: Date.now(),
              };
              await saveNote(updatedNote);
              onRefreshData();
            } catch (err) {
              console.error("Failed to save note after moving folder:", err);
            }
          }
        }}
        onCancel={() => {
          setShowMoveConfirm(false);
        }}
      />

      {/* CONFIRMATION DIALOG FOR DELETE */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Note"
        message="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showNoteInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-charcoal-750">
              <Info className="w-5 h-5 text-charcoal-300" />
              <h3 className="text-base font-bold text-charcoal-50">Note Info</h3>
            </div>

            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-bold">Created</span>
                <span className="text-xs font-semibold text-charcoal-100 font-mono">
                  {note ? new Date(note.createdAt).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-bold">Last Edited</span>
                <span className="text-xs font-semibold text-charcoal-100 font-mono">
                  {note ? new Date(note.updatedAt).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-bold">Profile</span>
                <span className="text-xs font-bold text-charcoal-100 capitalize">
                  {note ? note.profileId : profileId}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-bold">Folder</span>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const currentFolder = folders.find(f => f.id === noteFolderId);
                    if (currentFolder) {
                      return (
                        <>
                          <FolderIcon name={currentFolder.icon} colorId={currentFolder.color} className="w-4 h-4" />
                          <span className="text-xs font-bold text-charcoal-100">{currentFolder.name}</span>
                        </>
                      );
                    }
                    return (
                      <>
                        <Folder className="w-4 h-4 text-charcoal-500 animate-none shrink-0" />
                        <span className="text-xs font-bold text-charcoal-400">Uncategorized</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 font-bold">Location History</span>
                <span className="text-xs font-semibold text-charcoal-300">
                  {noteFolderId 
                    ? `Saved in folder "${folders.find(f => f.id === noteFolderId)?.name || 'Unknown'}"` 
                    : "Saved as Uncategorized note"
                  } ({note ? (note.profileId === "work" ? "Work workspace" : "Personal workspace") : (profileId === "work" ? "Work workspace" : "Personal workspace")})
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button
                id="note-info-close"
                onClick={() => setShowNoteInfo(false)}
                className="px-5 h-10 rounded-xl bg-charcoal-100 hover:bg-white text-charcoal-900 text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenuPos.visible && (
        <div 
          id="context-selection-menu"
          className="bg-charcoal-900/95 border border-charcoal-750/80 rounded-2xl shadow-2xl flex items-center p-1.5 backdrop-blur-md select-none transition-opacity duration-150"
          style={adjustedStyle}
        >
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCustomCopy();
            }}
            className="px-4.5 py-2 text-xs font-bold text-charcoal-100 hover:bg-charcoal-800 rounded-xl transition-all cursor-pointer shrink-0"
          >
            Copy
          </button>
          <div className="w-[1px] h-4 bg-charcoal-800/80 self-center mx-1 shrink-0" />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCustomPaste();
            }}
            className="px-4.5 py-2 text-xs font-bold text-charcoal-100 hover:bg-charcoal-800 rounded-xl transition-all cursor-pointer shrink-0"
          >
            Paste
          </button>
        </div>
      )}

      {/* SET 4-DIGIT PIN MODAL */}
      {showSetPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal-850 border border-charcoal-750/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-charcoal-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal-800/80 border border-charcoal-700/60 flex items-center justify-center text-charcoal-200 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal-100">Set Note 4-Digit PIN</h3>
                <p className="text-xs text-charcoal-400">Create a 4-digit numeric PIN to protect this note.</p>
              </div>
            </div>

            {modalPinError && (
              <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 text-xs text-red-300 font-medium">
                {modalPinError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono font-bold uppercase text-charcoal-400 mb-1 block">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={newPinValue}
                  onChange={(e) => {
                    setNewPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setModalPinError("");
                  }}
                  className="w-full h-11 px-3.5 bg-charcoal-900 border border-charcoal-700 rounded-xl text-sm font-mono tracking-widest text-charcoal-100 focus:outline-none focus:border-charcoal-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase text-charcoal-400 mb-1 block">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={confirmPinValue}
                  onChange={(e) => {
                    setConfirmPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setModalPinError("");
                  }}
                  className="w-full h-11 px-3.5 bg-charcoal-900 border border-charcoal-700 rounded-xl text-sm font-mono tracking-widest text-charcoal-100 focus:outline-none focus:border-charcoal-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                id="set-pin-cancel"
                onClick={() => setShowSetPinModal(false)}
                className="px-4 h-10 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-charcoal-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="set-pin-submit"
                onClick={handleSetPinSubmit}
                className="px-5 h-10 rounded-xl bg-charcoal-100 hover:bg-white text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
              >
                Set PIN & Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PIN MODAL */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal-850 border border-charcoal-750/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-charcoal-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal-800/80 border border-charcoal-700/60 flex items-center justify-center text-charcoal-200 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal-100">Change 4-Digit PIN</h3>
                <p className="text-xs text-charcoal-400">Enter your current PIN to set a new PIN.</p>
              </div>
            </div>

            {modalPinError && (
              <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 text-xs text-red-300 font-medium">
                {modalPinError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono font-bold uppercase text-charcoal-400 mb-1 block">
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Enter current PIN"
                  value={currentPinValue}
                  onChange={(e) => {
                    setCurrentPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setModalPinError("");
                  }}
                  className="w-full h-11 px-3.5 bg-charcoal-900 border border-charcoal-700 rounded-xl text-sm font-mono tracking-widest text-charcoal-100 focus:outline-none focus:border-charcoal-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase text-charcoal-400 mb-1 block">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Enter new 4-digit PIN"
                  value={newPinValue}
                  onChange={(e) => {
                    setNewPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setModalPinError("");
                  }}
                  className="w-full h-11 px-3.5 bg-charcoal-900 border border-charcoal-700 rounded-xl text-sm font-mono tracking-widest text-charcoal-100 focus:outline-none focus:border-charcoal-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase text-charcoal-400 mb-1 block">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Confirm new 4-digit PIN"
                  value={confirmPinValue}
                  onChange={(e) => {
                    setConfirmPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setModalPinError("");
                  }}
                  className="w-full h-11 px-3.5 bg-charcoal-900 border border-charcoal-700 rounded-xl text-sm font-mono tracking-widest text-charcoal-100 focus:outline-none focus:border-charcoal-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                id="change-pin-cancel"
                onClick={() => setShowChangePinModal(false)}
                className="px-4 h-10 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-charcoal-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="change-pin-submit"
                onClick={handleChangePinSubmit}
                className="px-5 h-10 rounded-xl bg-charcoal-100 hover:bg-white text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
              >
                Save New PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE PIN MODAL */}
      {showRemovePinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal-850 border border-charcoal-750/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-charcoal-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-charcoal-800/80 border border-charcoal-700/60 flex items-center justify-center text-charcoal-200 shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal-100">Remove Note PIN</h3>
                <p className="text-xs text-charcoal-400">Enter your current PIN to remove PIN protection.</p>
              </div>
            </div>

            {modalPinError && (
              <div className="bg-red-950/40 border border-red-900/40 rounded-xl p-3 text-xs text-red-300 font-medium">
                {modalPinError}
              </div>
            )}

            <div>
              <label className="text-xs font-mono font-bold uppercase text-charcoal-400 mb-1 block">
                Current PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter current PIN"
                value={currentPinValue}
                onChange={(e) => {
                  setCurrentPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setModalPinError("");
                }}
                className="w-full h-11 px-3.5 bg-charcoal-900 border border-charcoal-700 rounded-xl text-sm font-mono tracking-widest text-charcoal-100 focus:outline-none focus:border-charcoal-400"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                id="remove-pin-cancel"
                onClick={() => setShowRemovePinModal(false)}
                className="px-4 h-10 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-charcoal-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="remove-pin-submit"
                onClick={handleRemovePinSubmit}
                className="px-5 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Remove PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
