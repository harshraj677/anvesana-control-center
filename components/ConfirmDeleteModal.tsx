"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConfirmDeleteConfig {
  /** e.g. "Employee", "Startup", "Leave Request" */
  resourceType: string;
  /** Exact string the admin must type — shown in the prompt */
  displayName: string;
  /** Secondary info shown in the summary box, e.g. email or date range */
  resourceSummary?: string;
  /** Only pass true for super_admin users */
  allowPermanentPurge?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ConfirmDeleteConfig;
  /** Called only when typed text matches and admin clicks Delete */
  onConfirm: (opts: { archiveBeforeDelete: boolean; permanentPurge: boolean }) => Promise<void>;
  isPending?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  config,
  onConfirm,
  isPending,
}: Props) {
  const [typed, setTyped]   = useState("");
  const [archive, setArchive] = useState(true);
  const [purge, setPurge]   = useState(false);

  const matches = typed === config.displayName; // case-sensitive per policy

  const reset = () => {
    setTyped("");
    setArchive(true);
    setPurge(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (isPending) return;
    if (!v) reset();
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!matches || isPending) return;
    await onConfirm({ archiveBeforeDelete: archive, permanentPurge: purge });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <TriangleAlert className="w-4 h-4 text-red-600" />
            </span>
            Delete {config.resourceType}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Resource summary */}
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 space-y-0.5">
            <p className="text-sm font-semibold text-red-800">{config.displayName}</p>
            {config.resourceSummary && (
              <p className="text-xs text-red-500">{config.resourceSummary}</p>
            )}
          </div>

          {/* Confirm input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Type{" "}
              <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                {config.displayName}
              </span>{" "}
              to confirm
            </Label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={config.displayName}
              disabled={isPending}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-sm focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-0"
            />
            {typed.length > 0 && !matches && (
              <p className="text-xs text-red-500">Text does not match — check capitalisation.</p>
            )}
          </div>

          {/* Options */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={archive}
                onChange={(e) => setArchive(e.target.checked)}
                disabled={isPending}
                className="mt-0.5 w-4 h-4 rounded accent-indigo-600 shrink-0"
              />
              <span className="text-sm text-slate-700">
                Archive a permanent copy before deletion
                <span className="block text-xs text-slate-400 mt-0.5 font-normal">
                  Snapshot is stored and can be used to restore this record later.
                </span>
              </span>
            </label>

            {config.allowPermanentPurge && (
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={purge}
                  onChange={(e) => setPurge(e.target.checked)}
                  disabled={isPending}
                  className="mt-0.5 w-4 h-4 rounded accent-red-600 shrink-0"
                />
                <span className="text-sm text-red-700 font-medium">
                  Permanently purge (hard delete)
                  <span className="block text-xs text-red-400 mt-0.5 font-normal">
                    Super-admin only. Record cannot be restored.
                  </span>
                </span>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!matches || isPending}
              className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
