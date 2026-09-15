/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  User, 
  Key, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Lock,
  Download,
  Upload,
  Briefcase,
  Grid,
  List,
  Sliders,
  LogOut,
  Trash2,
  Camera
} from "lucide-react";
import { Account, BackupData } from "../types";
import { 
  getAccount, 
  updateAccount, 
  getNotes, 
  getFolders, 
  getTags, 
  importBackupData
} from "../db";
import { hashPassword } from "../utils";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { EditorToolbarSettings } from "./EditorToolbarSettings";

interface SettingsPageProps {
  username: string;
  activeProfile: "personal" | "work";
  onProfileChange: (profile: "personal" | "work") => void;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
  onRefreshData: () => void;
  onBack: () => void;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  sortBy: "updated" | "created";
  onSortByChange: (sort: "updated" | "created") => void;
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What was the name of your primary school?",
  "What was your childhood nickname?"
];

export function SettingsPage({ 
  username, 
  activeProfile,
  onProfileChange,
  onLogout,
  onDeleteAccount,
  onRefreshData,
  onBack,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange
}: SettingsPageProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingRestore, setIsLoadingRestore] = useState<boolean>(false);
  
  // Feedback messages
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Update Password State
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Update Security Question State
  const [selectedQuestion, setSelectedQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState<string>("");
  const [confirmAnswerPassword, setConfirmAnswerPassword] = useState<string>("");
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState<boolean>(false);

  // General local confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Profile Picture state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync avatar for current user (shared across all workspace profiles)
  useEffect(() => {
    if (username) {
      const storageKey = `note_id_avatar_${username}`;
      const saved =
        localStorage.getItem(storageKey) ||
        localStorage.getItem(`note_id_avatar_${username}_${activeProfile}`) ||
        localStorage.getItem(`note_id_avatar_${username}_personal`) ||
        localStorage.getItem(`note_id_avatar_${username}_work`);
      setAvatarUrl(saved || null);
    }
  }, [username, activeProfile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");

    // Full GIF Support: Keep full animation frames by storing as data URL
    if (isGif) {
      if (file.size > 5 * 1024 * 1024) {
        setError("GIF file size is too large. Please select a GIF under 5MB.");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const storageKey = `note_id_avatar_${username}`;
          try {
            localStorage.setItem(storageKey, dataUrl);
            localStorage.removeItem(`note_id_avatar_${username}_personal`);
            localStorage.removeItem(`note_id_avatar_${username}_work`);
            setAvatarUrl(dataUrl);
            setSuccess("Profile picture updated with GIF!");
            window.dispatchEvent(new Event("avatar_changed"));
          } catch (storageErr) {
            setError("Unable to save GIF. File exceeds storage quota.");
          }
        }
      };
      reader.onerror = () => {
        setError("Failed to read GIF file.");
      };
      reader.readAsDataURL(file);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
          const dataUrl = canvas.toDataURL(mimeType, 0.85);
          const storageKey = `note_id_avatar_${username}`;
          try {
            localStorage.setItem(storageKey, dataUrl);
            localStorage.removeItem(`note_id_avatar_${username}_personal`);
            localStorage.removeItem(`note_id_avatar_${username}_work`);
            setAvatarUrl(dataUrl);
            setSuccess("Profile picture updated successfully!");
            window.dispatchEvent(new Event("avatar_changed"));
          } catch (storageErr) {
            setError("Unable to save image to storage.");
          }
        }
      };
      img.onerror = () => {
        setError("Failed to process image.");
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    if (username) {
      localStorage.removeItem(`note_id_avatar_${username}`);
      localStorage.removeItem(`note_id_avatar_${username}_personal`);
      localStorage.removeItem(`note_id_avatar_${username}_work`);
      setAvatarUrl(null);
      setSuccess("Profile picture removed successfully!");
      setError("");
      window.dispatchEvent(new Event("avatar_changed"));
    }
  };

  // Fetch account on mount
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const acc = await getAccount(username);
        if (acc) {
          setAccount(acc);
          setSelectedQuestion(acc.securityQuestion || SECURITY_QUESTIONS[0]);
        } else {
          setError("Failed to fetch local account profile details.");
        }
      } catch (err) {
        setError("Error opening local database.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountData();
  }, [username]);

  // Handle password update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 5) {
      setError("New password must be at least 5 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const currentHash = await hashPassword(currentPassword);
      if (account.passwordHash !== currentHash) {
        setError("Current password is incorrect.");
        setIsUpdatingPassword(false);
        return;
      }

      const newHash = await hashPassword(newPassword);
      const updated: Account = {
        ...account,
        passwordHash: newHash,
      };

      await updateAccount(updated);
      setAccount(updated);
      setSuccess("Password successfully updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError("Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle security question update
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setError("");
    setSuccess("");

    const answerClean = securityAnswer.trim();
    if (!answerClean || !confirmAnswerPassword) {
      setError("Please fill in the security answer and confirm with your password.");
      return;
    }

    if (answerClean.length < 2) {
      setError("Security answer must be at least 2 characters.");
      return;
    }

    setIsUpdatingSecurity(true);

    try {
      // Verify password first
      const passHash = await hashPassword(confirmAnswerPassword);
      if (account.passwordHash !== passHash) {
        setError("Incorrect password verification.");
        setIsUpdatingSecurity(false);
        return;
      }

      const answerHash = await hashPassword(answerClean.toLowerCase());
      const updated: Account = {
        ...account,
        securityQuestion: selectedQuestion,
        securityAnswerHash: answerHash,
      };

      await updateAccount(updated);
      setAccount(updated);
      setSuccess("Security question successfully updated!");
      setSecurityAnswer("");
      setConfirmAnswerPassword("");
    } catch (err) {
      setError("Failed to update security question.");
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  // Create Backup File
  const handleCreateBackup = async () => {
    setError("");
    setSuccess("");

    askConfirmation(
      "Create Backup",
      "Are you sure you want to compile and download your database backup now?",
      async () => {
        try {
          const userAccount = await getAccount(username);
          const userNotes = await getNotes(username);
          const userFolders = await getFolders(username);
          const userTags = await getTags(username);

          const backup: BackupData = {
            version: 1,
            username,
            account: userAccount || undefined,
            notes: userNotes,
            folders: userFolders,
            tags: userTags,
            exportedAt: Date.now(),
            preferences: {
              viewMode,
              sortBy
            }
          };

          const jsonStr = JSON.stringify(backup, null, 2);
          const blob = new Blob([jsonStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement("a");
          link.href = url;
          link.download = `noteid_backup_${username}_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          setSuccess("Backup exported and downloaded successfully.");
        } catch (err) {
          setError("Failed to create backup.");
        }
      }
    );
  };

  // Upload/Restore Backup File
  const handleUploadBackupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text) as BackupData;

        // Validation Checks
        if (!backup || typeof backup !== "object") {
          setError("Invalid backup file format.");
          return;
        }

        if (backup.version !== 1 || !backup.username) {
          setError("Unsupported backup version or invalid format.");
          return;
        }

        // SECURITY CHECK: Backup belongs only to current account
        if (backup.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
          setError(`Security block: This backup file belongs to account "${backup.username}". You can only restore backups created by user "${username}".`);
          return;
        }

        if (!Array.isArray(backup.notes) || !Array.isArray(backup.folders) || !Array.isArray(backup.tags)) {
          setError("Missing core components (notes, folders, tags) in backup data.");
          return;
        }

        askConfirmation(
          "Overwrite Local Data?",
          "WARNING: Restoring this backup will completely replace your current notes, folders, and settings for this account. This action cannot be undone. Do you want to proceed?",
          async () => {
            setIsLoadingRestore(true);
            try {
              await importBackupData(
                username,
                backup.notes,
                backup.folders,
                backup.tags
              );

              // Restore preferences if present
              if (backup.preferences) {
                if (backup.preferences.viewMode) {
                  onViewModeChange(backup.preferences.viewMode);
                }
                if (backup.preferences.sortBy) {
                  onSortByChange(backup.preferences.sortBy);
                }
              }

              setSuccess("Backup successfully restored! Workspace refreshed.");
              onRefreshData();
            } catch (err) {
              setError("An error occurred while importing backup data.");
            } finally {
              setIsLoadingRestore(false);
            }
          }
        );

      } catch (err) {
        setError("Failed to parse JSON backup file. Ensure it is a valid Note.ID backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-40 bg-charcoal-900 flex flex-col items-center justify-center h-full w-full max-w-md mx-auto border-x border-charcoal-800/40">
        <div className="w-10 h-10 border-4 border-charcoal-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-charcoal-900 flex flex-col h-full w-full max-w-md mx-auto border-x border-charcoal-800/40 animate-slide-in">
      {/* Header */}
      <div className="h-14 shrink-0 bg-charcoal-850/60 border-b border-charcoal-800/80 backdrop-blur-md px-4 flex items-center gap-3">
        <button
          id="settings-back-btn"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-charcoal-800/40 border border-charcoal-700/40 flex items-center justify-center text-charcoal-300 hover:text-charcoal-100 cursor-pointer transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-bold text-charcoal-50">Settings</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 pb-20">
        
        {/* Global Feedback */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-900/50 rounded-2xl p-4 text-xs text-red-200 animate-fade-in">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 text-xs text-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Edit Profile Section */}
        <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
            <User className="w-4 h-4 text-charcoal-300" />
            <span className="whitespace-nowrap">Edit Profile</span>
          </div>

          <div className="flex items-center justify-between gap-4 bg-charcoal-900/35 border border-charcoal-800/50 rounded-xl p-4 select-none">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-full border-2 border-charcoal-600/60 bg-charcoal-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-charcoal-750 flex items-center justify-center text-charcoal-300">
                    <User className="w-7 h-7" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-charcoal-100 truncate whitespace-nowrap">
                  {username.startsWith("@") ? username : `@${username}`}
                </span>
              </div>
            </div>

            {/* Icon-only controls for profile picture management */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="settings-avatar-upload-btn"
                onClick={() => avatarFileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700/60 text-charcoal-100 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                title={avatarUrl ? "Change profile picture" : "Add profile picture"}
                aria-label={avatarUrl ? "Change profile picture" : "Add profile picture"}
              >
                <Camera className="w-4 h-4 text-charcoal-200" />
              </button>

              {avatarUrl && (
                <button
                  type="button"
                  id="settings-avatar-remove-btn"
                  onClick={handleRemoveAvatar}
                  className="w-9 h-9 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                  title="Remove profile picture"
                  aria-label="Remove profile picture"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*,image/gif"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        {/* 1. Account Settings Section */}
        <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
            <User className="w-4 h-4 text-charcoal-300" />
            <span>Account</span>
          </div>

          <div className="flex flex-col gap-3.5 bg-charcoal-900/35 border border-charcoal-800/50 rounded-xl p-4 text-xs select-none">
            <div className="flex justify-between items-center">
              <span className="text-charcoal-400 font-semibold">Username</span>
              <span className="font-mono font-bold text-charcoal-100">{username}</span>
            </div>
            {account && (
              <div className="flex justify-between items-center border-t border-charcoal-800/40 pt-3">
                <span className="text-charcoal-400 flex items-center gap-1.5 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-charcoal-500" /> Created
                </span>
                <span className="text-charcoal-200 font-mono">
                  {new Date(account.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              id="action-settings-logout"
              onClick={() => askConfirmation(
                "Confirm Sign Out",
                "Are you sure you want to sign out of Note.ID? Your workspace data remains securely saved on this device.",
                onLogout
              )}
              className="h-10 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700/60 text-charcoal-100 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-charcoal-300" />
              <span>Logout</span>
            </button>
            <button
              type="button"
              id="action-settings-delete"
              onClick={() => askConfirmation(
                "Permanently Delete Account?",
                "WARNING: This will permanently delete your account profile, credentials, and all notes, folders, tags, and data. This action is irreversible! Are you sure you want to proceed?",
                onDeleteAccount
              )}
              className="h-10 rounded-xl bg-red-950/20 hover:bg-red-950/35 border border-red-900/40 text-red-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        {/* 2. Security Settings Section */}
        <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
            <Lock className="w-4 h-4 text-charcoal-300" />
            <span>Security</span>
          </div>

          {/* Change Password */}
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3.5 border-b border-charcoal-800/55 pb-5">
            <span className="text-[11px] font-bold text-charcoal-300 px-1 uppercase tracking-wider">Change Password</span>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-charcoal-400 px-1 font-semibold" htmlFor="current-pass">
                Current Password
              </label>
              <input
                id="current-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-4 text-xs rounded-xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-charcoal-400 px-1 font-semibold" htmlFor="new-pass">
                New Password
              </label>
              <input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 5 characters"
                className="w-full h-10 px-4 text-xs rounded-xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-charcoal-400 px-1 font-semibold" htmlFor="confirm-new-pass">
                Confirm New Password
              </label>
              <input
                id="confirm-new-pass"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm"
                className="w-full h-10 px-4 text-xs rounded-xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
              />
            </div>

            <button
              type="submit"
              id="submit-password-btn"
              disabled={isUpdatingPassword}
              className="w-full h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          {/* Change Security Question */}
          <form onSubmit={handleUpdateSecurity} className="flex flex-col gap-3.5">
            <span className="text-[11px] font-bold text-charcoal-300 px-1 uppercase tracking-wider">Update Security Question</span>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-charcoal-400 px-1 font-semibold" htmlFor="select-sec-q">
                Select Question
              </label>
              <select
                id="select-sec-q"
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full h-10 px-2.5 text-xs rounded-xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 cursor-pointer"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q} className="bg-charcoal-800 text-charcoal-100 text-xs">
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-charcoal-400 px-1 font-semibold" htmlFor="sec-answer">
                Security Answer
              </label>
              <input
                id="sec-answer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="New answer (minimum 2 chars)"
                className="w-full h-10 px-4 text-xs rounded-xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-charcoal-400 px-1 font-semibold" htmlFor="sec-pass-confirm">
                Verify Account Password
              </label>
              <input
                id="sec-pass-confirm"
                type="password"
                value={confirmAnswerPassword}
                onChange={(e) => setConfirmAnswerPassword(e.target.value)}
                placeholder="Verify with password"
                className="w-full h-10 px-4 text-xs rounded-xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
              />
            </div>

            <button
              type="submit"
              id="submit-security-btn"
              disabled={isUpdatingSecurity}
              className="w-full h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isUpdatingSecurity ? "Updating..." : "Update Security Question"}
            </button>
          </form>
        </div>

        {/* 3. Backup Settings Section */}
        <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
            <Download className="w-4 h-4 text-charcoal-300" />
            <span>Backup</span>
          </div>

          <p className="text-[11px] text-charcoal-400 leading-relaxed px-1">
            Backup and restore operations remain fully local and affect only the currently logged in account profile.
          </p>

          <div className="flex flex-col gap-3 mt-1">
            <button
              type="button"
              id="action-settings-create-backup"
              onClick={handleCreateBackup}
              className="w-full h-11 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-charcoal-800" />
              <span>Create Backup</span>
            </button>

            <label
              id="action-settings-upload-backup-label"
              className="w-full h-11 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-800/40 text-charcoal-100 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <input
                type="file"
                accept=".json"
                id="action-settings-upload-backup-file"
                disabled={isLoadingRestore}
                onChange={handleUploadBackupChange}
                className="hidden"
              />
              <Upload className="w-4 h-4 text-charcoal-300" />
              <span>{isLoadingRestore ? "Restoring..." : "Upload Backup"}</span>
            </label>
          </div>
        </div>

        {/* 4. Profiles Settings Section */}
        <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
            <Briefcase className="w-4 h-4 text-charcoal-300" />
            <span>Profiles</span>
          </div>

          <p className="text-[11px] text-charcoal-400 leading-relaxed px-1">
            Toggle your active workspace below. Each profile separates notes, folders, settings, and search histories.
          </p>

          <div className="flex bg-charcoal-950/45 p-1 rounded-2xl border border-charcoal-850/85">
            <button
              id="settings-profile-personal"
              onClick={() => onProfileChange("personal")}
              className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeProfile === "personal"
                  ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
                  : "text-charcoal-400 hover:text-charcoal-200"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>

            <button
              id="settings-profile-work"
              onClick={() => onProfileChange("work")}
              className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeProfile === "work"
                  ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
                  : "text-charcoal-400 hover:text-charcoal-200"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Work</span>
            </button>
          </div>
        </div>

        {/* 5. Preferences Settings Section */}
        <div className="bg-charcoal-850/20 border border-charcoal-800/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-400 uppercase tracking-widest px-1">
            <Sliders className="w-4 h-4 text-charcoal-300" />
            <span>Preferences</span>
          </div>

          {/* View Mode preference */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider px-1">Default View Mode</span>
            <div className="flex bg-charcoal-950/45 p-1 rounded-2xl border border-charcoal-850/85">
              <button
                id="pref-view-list"
                onClick={() => onViewModeChange("list")}
                className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
                    : "text-charcoal-400 hover:text-charcoal-200"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>

              <button
                id="pref-view-grid"
                onClick={() => onViewModeChange("grid")}
                className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
                    : "text-charcoal-400 hover:text-charcoal-200"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid View</span>
              </button>
            </div>
          </div>

          {/* Sort By preference */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider px-1">Default Sort Order</span>
            <div className="flex bg-charcoal-950/45 p-1 rounded-2xl border border-charcoal-850/85">
              <button
                id="pref-sort-updated"
                onClick={() => onSortByChange("updated")}
                className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sortBy === "updated"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
                    : "text-charcoal-400 hover:text-charcoal-200"
                }`}
              >
                <span>Last Updated</span>
              </button>

              <button
                id="pref-sort-created"
                onClick={() => onSortByChange("created")}
                className={`flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  sortBy === "created"
                    ? "bg-charcoal-800 text-charcoal-50 border border-charcoal-700/50 shadow-sm"
                    : "text-charcoal-400 hover:text-charcoal-200"
                }`}
              >
                <span>Date Created</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6. Editor Toolbar Customization Section */}
        <EditorToolbarSettings />

      </div>

      {/* Confirmation Dialog System */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
