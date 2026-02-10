"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "warning" | "danger";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconColors = {
    default: "bg-primary/10 text-primary",
    warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
    danger: "bg-destructive/10 text-destructive",
  };

  const confirmColors = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 p-6">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[variant]}`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-medium">{title}</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-secondary rounded-lg transition-colors -mt-1 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${confirmColors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
