/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-charcoal-800 border border-charcoal-700/60 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-charcoal-700 flex items-center justify-center text-charcoal-300 shrink-0 border border-charcoal-600/50">
            <AlertTriangle className="w-5 h-5 text-charcoal-200" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-base font-bold text-charcoal-50">{title}</h3>
            <p className="text-xs text-charcoal-300 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button
            id="confirm-dialog-cancel"
            onClick={onCancel}
            className="px-4 h-10 rounded-xl border border-charcoal-700/60 hover:bg-charcoal-750 text-charcoal-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="confirm-dialog-confirm"
            onClick={onConfirm}
            className="px-5 h-10 rounded-xl bg-charcoal-50 hover:bg-charcoal-100 text-charcoal-900 text-xs font-bold cursor-pointer transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
