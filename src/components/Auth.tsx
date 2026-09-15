/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  HelpCircle, 
  ShieldCheck, 
  Key, 
  User,
  CheckCircle2,
  Upload,
  AlertTriangle
} from "lucide-react";
import { getAccount, createAccount, updateAccount, restoreAccountData } from "../db";
import { hashPassword } from "../utils";
import { Account, BackupData } from "../types";
import { ConfirmationDialog } from "./ConfirmationDialog";

interface AuthProps {
  onLoginSuccess: (username: string) => void;
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "In what city were you born?",
  "What was the name of your primary school?",
  "What was your childhood nickname?"
];

export function Auth({ onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "upload">("login");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Upload/Restore Profile states
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState<boolean>(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);

  // Common UI State
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");

  // Register Form State (Multi-step)
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [regUsername, setRegUsername] = useState<string>("");
  const [regUsernameError, setRegUsernameError] = useState<string>("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  const [regPassword, setRegPassword] = useState<string>("");
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>("");
  const [regPasswordError, setRegPasswordError] = useState<string>("");

  const [regQuestion, setRegQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [regAnswer, setRegAnswer] = useState<string>("");
  const [regAnswerError, setRegAnswerError] = useState<string>("");

  // Forgot Password / Recovery State
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotUsername, setForgotUsername] = useState<string>("");
  const [forgotUserAccount, setForgotUserAccount] = useState<Account | null>(null);
  const [forgotAnswer, setForgotAnswer] = useState<string>("");
  const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>("");

  // Reset errors when changing modes
  useEffect(() => {
    setError("");
    setSuccess("");
    // Reset all step counters
    setRegStep(1);
    setForgotStep(1);
    setRegUsername("");
    setRegPassword("");
    setRegConfirmPassword("");
    setRegAnswer("");
    setIsUsernameAvailable(null);
    setForgotUsername("");
    setForgotUserAccount(null);
    setForgotAnswer("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setShowConfirmOverwrite(false);
    setPendingBackup(null);
  }, [mode]);

  // Username validation helper
  const validateUsernameFormat = (val: string): string => {
    if (val.length === 0) return "";
    if (val.length < 5) return "Minimum 5 characters required.";
    const validChars = /^[a-zA-Z0-9]+$/;
    if (!validChars.test(val)) return "Letters and numbers only. No spaces or special characters.";
    return "";
  };

  // Real-time check for username uniqueness
  useEffect(() => {
    const checkUsernameUnique = async () => {
      const cleanUsername = regUsername.trim().toLowerCase();
      const formatErr = validateUsernameFormat(cleanUsername);
      
      if (formatErr) {
        setRegUsernameError(formatErr);
        setIsUsernameAvailable(false);
        return;
      }

      if (cleanUsername.length >= 5) {
        setIsCheckingUsername(true);
        try {
          const existing = await getAccount(cleanUsername);
          if (existing) {
            setRegUsernameError("Username is already taken.");
            setIsUsernameAvailable(false);
          } else {
            setRegUsernameError("");
            setIsUsernameAvailable(true);
          }
        } catch (err) {
          setRegUsernameError("Failed to check username availability.");
          setIsUsernameAvailable(false);
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        setRegUsernameError("");
        setIsUsernameAvailable(null);
      }
    };

    const timer = setTimeout(() => {
      checkUsernameUnique();
    }, 200);

    return () => clearTimeout(timer);
  }, [regUsername]);

  // Handle standard login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const usernameClean = loginUsername.trim().toLowerCase();
    const passwordClean = loginPassword.trim();

    if (!usernameClean || !passwordClean) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const account = await getAccount(usernameClean);
      if (!account) {
        setError("Account not found.");
        setIsLoading(false);
        return;
      }

      const inputHash = await hashPassword(passwordClean);
      if (account.passwordHash !== inputHash) {
        setError("Incorrect password.");
        setIsLoading(false);
        return;
      }

      onLoginSuccess(usernameClean);
    } catch (err) {
      setError("Failed to sign in. Local storage database error.");
      setIsLoading(false);
    }
  };

  // Step 1: Validate & Next Username
  const handleRegStep1Next = () => {
    const cleanUsername = regUsername.trim().toLowerCase();
    const formatErr = validateUsernameFormat(cleanUsername);
    if (formatErr) {
      setRegUsernameError(formatErr);
      return;
    }
    if (isUsernameAvailable === false) {
      setRegUsernameError("Username is already taken.");
      return;
    }
    if (cleanUsername.length < 5) {
      setRegUsernameError("Username must be at least 5 characters.");
      return;
    }
    setRegStep(2);
    setError("");
  };

  // Step 2: Validate & Next Password
  const handleRegStep2Next = () => {
    const pass = regPassword;
    const confirm = regConfirmPassword;

    if (pass.length < 5) {
      setRegPasswordError("Password must be at least 5 characters.");
      return;
    }

    if (pass !== confirm) {
      setRegPasswordError("Passwords do not match.");
      return;
    }

    setRegPasswordError("");
    setRegStep(3);
    setError("");
  };

  // Step 3: Validate & Next Security Question
  const handleRegStep3Next = () => {
    const ans = regAnswer.trim();
    if (ans.length < 2) {
      setRegAnswerError("Security answer must be at least 2 characters.");
      return;
    }
    setRegAnswerError("");
    setRegStep(4);
    setError("");
  };

  // Step 4: Finalize account creation
  const handleFinalizeRegistration = async () => {
    setIsLoading(true);
    setError("");

    try {
      const cleanUsername = regUsername.trim().toLowerCase();
      // Double check availability
      const existing = await getAccount(cleanUsername);
      if (existing) {
        setError("Username was taken. Go back and select another.");
        setRegStep(1);
        setIsLoading(false);
        return;
      }

      const passwordHash = await hashPassword(regPassword);
      const answerHash = await hashPassword(regAnswer.trim().toLowerCase());

      const newAccount: Account = {
        username: cleanUsername,
        passwordHash,
        securityQuestion: regQuestion,
        securityAnswerHash: answerHash,
        createdAt: Date.now(),
      };

      await createAccount(newAccount);
      onLoginSuccess(cleanUsername);
    } catch (err) {
      setError("Failed to save local account profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const doRestore = async (backupData: BackupData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!backupData.account) {
        setError("Invalid backup data. No account credentials found.");
        return;
      }
      await restoreAccountData(
        backupData.account,
        backupData.notes,
        backupData.folders,
        backupData.tags
      );

      // Restore preferences if present
      if (backupData.preferences) {
        if (backupData.preferences.viewMode) {
          localStorage.setItem("note_id_view_mode", backupData.preferences.viewMode);
        }
        if (backupData.preferences.sortBy) {
          localStorage.setItem("note_id_sort_by", backupData.preferences.sortBy);
        }
      }

      setSuccess(`Profile for "${backupData.username}" successfully restored!`);
      setLoginUsername(backupData.username);
      
      setTimeout(() => {
        setMode("login");
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Failed to restore profile to database.");
    } finally {
      setIsLoading(false);
      setPendingBackup(null);
      setShowConfirmOverwrite(false);
    }
  };

  const handleProfileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setError("Invalid backup file. Ensure it is a valid Note.ID backup.");
          return;
        }

        if (backup.version !== 1 || !backup.username) {
          setError("Unsupported backup version or invalid format.");
          return;
        }

        if (!backup.account || typeof backup.account !== "object" || !backup.account.passwordHash || !backup.account.securityQuestion || !backup.account.securityAnswerHash) {
          setError("Invalid backup. Missing required account credentials or security settings.");
          return;
        }

        if (!Array.isArray(backup.notes) || !Array.isArray(backup.folders) || !Array.isArray(backup.tags)) {
          setError("Missing core components (notes, folders, tags) in backup file.");
          return;
        }

        // Check if username already exists in local DB
        const existingAcc = await getAccount(backup.username.trim().toLowerCase());
        if (existingAcc) {
          setPendingBackup(backup);
          setShowConfirmOverwrite(true);
        } else {
          await doRestore(backup);
        }
      } catch (err) {
        setError("Failed to parse JSON backup file. Ensure it is a valid Note.ID backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  // Password Recovery - Step 1: Submit Username
  const handleForgotStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = forgotUsername.trim().toLowerCase();
    if (!cleanUser) {
      setError("Please enter a username.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const account = await getAccount(cleanUser);
      if (!account) {
        setError("No account associated with this username.");
        setIsLoading(false);
        return;
      }

      setForgotUserAccount(account);
      setForgotStep(2);
    } catch (err) {
      setError("Error checking user account.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 2: Submit Answer
  const handleForgotStep2Next = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAnswer = forgotAnswer.trim().toLowerCase();
    if (!cleanAnswer) {
      setError("Please enter your answer.");
      return;
    }

    if (!forgotUserAccount) {
      setError("Session expired. Please try again.");
      setForgotStep(1);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const inputAnswerHash = await hashPassword(cleanAnswer);
      if (forgotUserAccount.securityAnswerHash !== inputAnswerHash) {
        setError("Incorrect answer to security question.");
        setIsLoading(false);
        return;
      }

      setForgotStep(3);
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 3: Password Reset
  const handleForgotStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pass = forgotNewPassword;
    const confirm = forgotConfirmPassword;

    if (pass.length < 5) {
      setError("Password must be at least 5 characters.");
      return;
    }

    if (pass !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!forgotUserAccount) {
      setError("Session expired. Please start over.");
      setForgotStep(1);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const newHash = await hashPassword(pass);
      const updatedAccount: Account = {
        ...forgotUserAccount,
        passwordHash: newHash,
      };

      await updateAccount(updatedAccount);
      setSuccess("Password has been successfully updated.");
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err) {
      setError("Failed to update password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 w-full">
      <div className="w-full max-w-sm rounded-3xl bg-charcoal-800/40 border border-charcoal-700/50 backdrop-blur-xl p-8 flex flex-col gap-6">
        
        {/* LOGO & TITLE */}
        <div className="text-center flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-charcoal-700 flex items-center justify-center border border-charcoal-600/60">
              <span className="text-lg font-bold font-mono tracking-wider text-charcoal-100">N</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-charcoal-50">Note.ID</span>
          </div>
          <p className="text-xs text-charcoal-400">
            {mode === "login" && "Sign in to your isolated offline workspace"}
            {mode === "register" && `Create secure local profile (Step ${regStep} of 4)`}
            {mode === "upload" && "Restore your offline profile from a backup"}
            {mode === "forgot" && `Recover local account (Step ${forgotStep} of 3)`}
          </p>
        </div>

        {/* Navigation Selector Tabs */}
        {(mode === "login" || mode === "register" || mode === "upload") && (
          <div className="grid grid-cols-3 bg-charcoal-900/60 p-1.5 rounded-2xl border border-charcoal-800/60 text-center text-[10px] sm:text-xs shrink-0">
            <button
              type="button"
              id="tab-login"
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`py-2 px-1 rounded-xl font-bold transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-charcoal-700 text-charcoal-50 border border-charcoal-600/50 shadow-sm"
                  : "text-charcoal-400 hover:text-charcoal-200"
              }`}
            >
              Login Note.ID
            </button>
            <button
              type="button"
              id="tab-register"
              onClick={() => { setMode("register"); setRegStep(1); setError(""); setSuccess(""); }}
              className={`py-2 px-1 rounded-xl font-bold transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-charcoal-700 text-charcoal-50 border border-charcoal-600/50 shadow-sm"
                  : "text-charcoal-400 hover:text-charcoal-200"
              }`}
            >
              Join Note.ID
            </button>
            <button
              type="button"
              id="tab-upload"
              onClick={() => { setMode("upload"); setError(""); setSuccess(""); }}
              className={`py-2 px-1 rounded-xl font-bold transition-all cursor-pointer ${
                mode === "upload"
                  ? "bg-charcoal-700 text-charcoal-50 border border-charcoal-600/50 shadow-sm"
                  : "text-charcoal-400 hover:text-charcoal-200"
              }`}
            >
              Upload Profile
            </button>
          </div>
        )}

        {/* Global Error and Success Feedback */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-900/50 rounded-2xl p-4 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="login-username">
                Username
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  disabled={isLoading}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-semibold text-charcoal-400" htmlFor="login-password">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-charcoal-400 hover:text-charcoal-100 focus:outline-none underline underline-offset-4 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 pl-4 pr-11 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600 disabled:opacity-50"
                />
                <button
                  type="button"
                  id="toggle-login-password"
                  disabled={isLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-200 p-1.5 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isLoading}
              className="w-full h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <div className="text-center text-xs mt-3 border-t border-charcoal-800/60 pt-4">
              <button
                type="button"
                id="switch-to-register"
                onClick={() => setMode("register")}
                className="text-charcoal-300 hover:text-charcoal-100 font-medium underline underline-offset-4 cursor-pointer focus:outline-none"
              >
                Create new Note.ID account
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER MODE (MULTI-STEP) */}
        {mode === "register" && (
          <div className="flex flex-col gap-4">
            
            {/* STEP 1: USERNAME */}
            {regStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="reg-username">
                    Choose a Username
                  </label>
                  <div className="relative">
                    <input
                      id="reg-username"
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
                    />
                    {isCheckingUsername && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-charcoal-400 border-t-transparent rounded-full animate-spin"></span>
                    )}
                  </div>
                  {regUsernameError && (
                    <span className="text-[11px] text-red-400 px-1 mt-0.5">{regUsernameError}</span>
                  )}
                  {isUsernameAvailable && !regUsernameError && regUsername.length >= 5 && (
                    <span className="text-[11px] text-emerald-400 px-1 mt-0.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Username is available
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-charcoal-400 leading-relaxed bg-charcoal-900/25 p-3.5 rounded-2xl border border-charcoal-800/50 flex flex-col gap-1">
                  <span className="font-semibold text-charcoal-300">Rules:</span>
                  <span>• Minimum 5 characters.</span>
                  <span>• Only English letters and numbers.</span>
                  <span>• No spaces or special characters allowed.</span>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="flex-1 h-11 rounded-2xl border border-charcoal-700/60 hover:bg-charcoal-850/40 text-charcoal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                  </button>
                  <button
                    type="button"
                    id="reg-step1-next"
                    disabled={!isUsernameAvailable || !!regUsernameError || regUsername.length < 5}
                    onClick={handleRegStep1Next}
                    className="flex-1 h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PASSWORD */}
            {regStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="reg-password">
                    Set a Strong Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-11 pl-4 pr-11 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 p-1.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="reg-confirm">
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type={showPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
                  />
                  {regPasswordError && (
                    <span className="text-[11px] text-red-400 px-1 mt-0.5">{regPasswordError}</span>
                  )}
                </div>

                <div className="text-[11px] text-charcoal-400 leading-relaxed bg-charcoal-900/25 p-3.5 rounded-2xl border border-charcoal-800/50">
                  Password will be securely hashed on your browser's local sandbox environment.
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="flex-1 h-11 rounded-2xl border border-charcoal-700/60 hover:bg-charcoal-850/40 text-charcoal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    id="reg-step2-next"
                    disabled={regPassword.length < 5 || regPassword !== regConfirmPassword}
                    onClick={handleRegStep2Next}
                    className="flex-1 h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SECURITY QUESTION */}
            {regStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="reg-question">
                    Select a Security Question
                  </label>
                  <select
                    id="reg-question"
                    value={regQuestion}
                    onChange={(e) => setRegQuestion(e.target.value)}
                    className="w-full h-11 px-3 text-xs rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 cursor-pointer"
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q} className="bg-charcoal-800 text-charcoal-100 text-xs">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="reg-answer">
                    Security Answer
                  </label>
                  <input
                    id="reg-answer"
                    type="text"
                    value={regAnswer}
                    onChange={(e) => setRegAnswer(e.target.value)}
                    placeholder="Your answer"
                    className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600"
                  />
                  {regAnswerError && (
                    <span className="text-[11px] text-red-400 px-1 mt-0.5">{regAnswerError}</span>
                  )}
                </div>

                <div className="text-[11px] text-charcoal-400 leading-relaxed bg-charcoal-900/25 p-3.5 rounded-2xl border border-charcoal-800/50 flex flex-col gap-1">
                  <span className="font-semibold text-charcoal-300">Important:</span>
                  <span>Used to verify ownership and recover/reset your password locally if forgotten. Answer is not case-sensitive.</span>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(2)}
                    className="flex-1 h-11 rounded-2xl border border-charcoal-700/60 hover:bg-charcoal-850/40 text-charcoal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    id="reg-step3-next"
                    disabled={regAnswer.trim().length < 2}
                    onClick={handleRegStep3Next}
                    className="flex-1 h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & CREATE */}
            {regStep === 4 && (
              <div className="flex flex-col gap-4">
                <div className="text-xs text-charcoal-300 bg-charcoal-900/35 border border-charcoal-700/40 rounded-2xl p-4.5 flex flex-col gap-3">
                  <span className="font-bold text-charcoal-100 text-sm border-b border-charcoal-800/60 pb-2">Profile Summary</span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-400">Username:</span>
                    <span className="font-mono font-bold text-charcoal-100">{regUsername}</span>
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-charcoal-400">Security Question:</span>
                    <span className="text-charcoal-200 font-medium">{regQuestion}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-charcoal-400">Security Answer:</span>
                    <span className="text-charcoal-200 font-mono font-bold">••••••••</span>
                  </div>
                </div>

                <button
                  type="button"
                  id="finalize-registration"
                  disabled={isLoading}
                  onClick={handleFinalizeRegistration}
                  className="w-full h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2.5 mt-1">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setRegStep(3)}
                    className="w-full h-10 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-850/40 text-charcoal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back and Edit
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3. FORGOT PASSWORD MODE */}
        {mode === "forgot" && (
          <div className="flex flex-col gap-4">
            
            {/* FORGOT STEP 1: ENTER USERNAME */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotStep1Next} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="forgot-user">
                    Enter Username
                  </label>
                  <input
                    id="forgot-user"
                    type="text"
                    disabled={isLoading}
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600 disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setMode("login")}
                    className="flex-1 h-11 rounded-2xl border border-charcoal-700/60 hover:bg-charcoal-850/40 text-charcoal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="submit"
                    id="forgot-step1-next"
                    disabled={isLoading || forgotUsername.trim().length === 0}
                    className="flex-1 h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT STEP 2: SECURITY QUESTION */}
            {forgotStep === 2 && forgotUserAccount && (
              <form onSubmit={handleForgotStep2Next} className="flex flex-col gap-4">
                <div className="text-xs text-charcoal-300 bg-charcoal-900/35 border border-charcoal-700/40 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-charcoal-100">
                    <HelpCircle className="w-4 h-4 text-charcoal-300" />
                    <span>Security Question</span>
                  </div>
                  <span className="text-charcoal-200 italic leading-relaxed">
                    "{forgotUserAccount.securityQuestion}"
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="forgot-answer">
                    Your Security Answer
                  </label>
                  <input
                    id="forgot-answer"
                    type="text"
                    disabled={isLoading}
                    value={forgotAnswer}
                    onChange={(e) => setForgotAnswer(e.target.value)}
                    placeholder="Enter answer"
                    className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600 disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setForgotStep(1);
                      setForgotUserAccount(null);
                    }}
                    className="flex-1 h-11 rounded-2xl border border-charcoal-700/60 hover:bg-charcoal-850/40 text-charcoal-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="submit"
                    id="forgot-step2-next"
                    disabled={isLoading || forgotAnswer.trim().length === 0}
                    className="flex-1 h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT STEP 3: RESET PASSWORD */}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotStep3Submit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="forgot-new-password">
                    Enter New Password
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-new-password"
                      type={showPassword ? "text" : "password"}
                      disabled={isLoading}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full h-11 pl-4 pr-11 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 p-1.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-charcoal-400 px-1" htmlFor="forgot-confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    id="forgot-confirm-password"
                    type={showPassword ? "text" : "password"}
                    disabled={isLoading}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full h-11 px-4 text-sm rounded-2xl bg-charcoal-900/60 border border-charcoal-700/50 text-charcoal-100 focus:outline-none focus:border-charcoal-500 placeholder:text-charcoal-600 disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  id="forgot-step3-submit"
                  disabled={isLoading || forgotNewPassword.length < 5 || forgotNewPassword !== forgotConfirmPassword}
                  className="w-full h-11 rounded-2xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2 disabled:opacity-30"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}

          </div>
        )}

        {/* 4. UPLOAD PROFILE MODE */}
        {mode === "upload" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                id="auth-upload-area"
                className="w-full py-10 px-4 rounded-2xl border border-dashed border-charcoal-700/60 hover:bg-charcoal-850/20 text-charcoal-300 hover:text-charcoal-100 text-xs font-semibold flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  accept=".json"
                  id="auth-profile-upload-file"
                  onChange={handleProfileUploadChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-charcoal-700/80 border border-charcoal-600/50 flex items-center justify-center text-charcoal-200 shadow-lg">
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-charcoal-200 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Upload className="w-6 h-6 text-charcoal-300" />
                  )}
                </div>
                <div className="text-center flex flex-col gap-1.5">
                  <span className="text-charcoal-200 font-bold text-sm">Select .json backup file</span>
                  <span className="text-[11px] text-charcoal-500 font-mono">noteid_backup_*.json</span>
                </div>
              </label>
            </div>
          </div>
        )}

      </div>

      {/* OVERWRITE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={showConfirmOverwrite}
        title="Replace Local Account?"
        message={pendingBackup ? `WARNING: An account with the username "${pendingBackup.username}" already exists on this browser. Uploading this backup will completely replace all existing notes, folders, and settings for "${pendingBackup.username}". This action cannot be undone. Do you want to proceed?` : ""}
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={() => pendingBackup && doRestore(pendingBackup)}
        onCancel={() => {
          setShowConfirmOverwrite(false);
          setPendingBackup(null);
        }}
      />
    </div>
  );
}
