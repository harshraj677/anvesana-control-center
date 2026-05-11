"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Rocket,
  Loader2,
  ExternalLink,
  Pencil,
  Trash2,
  Database,
  Filter,
  MoreHorizontal,
  Users,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStartups, useDeleteStartup, useSeedStartups, StartupData } from "@/hooks/useStartups";
import { StartupModal } from "./StartupModal";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/RoleGuard";

// ── Constants ─────────────────────────────────────────────────
const STAGES   = ["Idea", "Prototype", "MVP", "Funding", "Growth", "Scaling"];
const FUNDING  = ["Bootstrapped", "Grant Supported", "Pre-Seed", "Seed", "Series A", "Series B"];
const STATUSES = ["Active", "Paused", "Graduated", "Completed", "On Hold"];

// ── Color helpers ──────────────────────────────────────────────
const programColor: Record<string, string> = {
  "Diksuchi":     "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Vridhi":       "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Vega":         "bg-violet-100 text-violet-700 border-violet-200",
  "Yuva Shristi": "bg-amber-100 text-amber-700 border-amber-200",
};

const stageColor: Record<string, string> = {
  "Idea":      "bg-slate-100 text-slate-600",
  "Prototype": "bg-amber-100 text-amber-700",
  "MVP":       "bg-blue-100 text-blue-700",
  "Funding":   "bg-indigo-100 text-indigo-700",
  "Growth":    "bg-emerald-100 text-emerald-700",
  "Scaling":   "bg-violet-100 text-violet-700",
};

const statusColor: Record<string, string> = {
  "Active":    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Paused":    "bg-amber-50 text-amber-700 border-amber-200",
  "Graduated": "bg-blue-50 text-blue-700 border-blue-200",
  "Completed": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "On Hold":   "bg-slate-50 text-slate-600 border-slate-200",
};

const fundingColor: Record<string, string> = {
  "Bootstrapped":    "text-slate-600",
  "Grant Supported": "text-teal-600",
  "Pre-Seed":        "text-amber-600",
  "Seed":            "text-orange-600",
  "Series A":        "text-indigo-600",
  "Series B":        "text-violet-600",
};

// ── Progress bar ───────────────────────────────────────────────
function ProgressBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 75 ? "bg-emerald-500" : value >= 45 ? "bg-indigo-500" : "bg-amber-500";
  return (
    <div className={cn("w-full h-1.5 bg-slate-100 rounded-full overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────
function DeleteModal({ startup, onClose }: { startup: StartupData | null; onClose: () => void }) {
  const del = useDeleteStartup();
  if (!startup) return null;
  return (
    <Dialog open={!!startup} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Delete Startup?</h2>
          <p className="text-sm text-slate-500 mb-6">
            <strong className="text-slate-700">{startup.startupName}</strong> will be permanently removed.
            This cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={del.isPending}
              className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              onClick={async () => { await del.mutateAsync(startup.id); onClose(); }}
            >
              {del.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Delete</>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function StartupsPage() {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search,         setSearch]         = useState("");
  const [filterProgram,  setFilterProgram]  = useState("all");
  const [filterStage,    setFilterStage]    = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [addOpen,        setAddOpen]        = useState(false);
  const [editTarget,     setEditTarget]     = useState<StartupData | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<StartupData | null>(null);
  const [showFilters,    setShowFilters]    = useState(false);

  const { data: startups, isLoading } = useStartups({
    search, program: filterProgram, stage: filterStage, status: filterStatus,
  });
  const { data: allStartups } = useStartups();
  const seedStartups = useSeedStartups();

  const stats = useMemo(() => {
    const all = allStartups ?? [];
    return {
      total:     all.length,
      active:    all.filter((s) => s.status === "Active").length,
      funded:    all.filter((s) => ["Seed", "Series A", "Series B"].includes(s.fundingStage)).length,
      growth:    all.filter((s) => ["Growth", "Scaling"].includes(s.stage)).length,
      graduated: all.filter((s) => s.status === "Graduated").length,
    };
  }, [allStartups]);

  const statCards = [
    { label: "Total Startups", value: stats.total,     color: "indigo",  icon: Rocket      },
    { label: "Active",         value: stats.active,    color: "emerald", icon: CheckCircle },
    { label: "Funded",         value: stats.funded,    color: "violet",  icon: TrendingUp  },
    { label: "Growth/Scale",   value: stats.growth,    color: "amber",   icon: Users       },
    { label: "Graduated",      value: stats.graduated, color: "blue",    icon: CheckCircle },
  ];

  const colorToken: Record<string, string> = {
    indigo:  "from-indigo-50 to-indigo-50/40 border-indigo-100 text-indigo-600",
    emerald: "from-emerald-50 to-emerald-50/40 border-emerald-100 text-emerald-600",
    violet:  "from-violet-50 to-violet-50/40 border-violet-100 text-violet-600",
    amber:   "from-amber-50 to-amber-50/40 border-amber-100 text-amber-600",
    blue:    "from-blue-50 to-blue-50/40 border-blue-100 text-blue-600",
  };

  const PROGRAMS = ["Diksuchi", "Vridhi", "Vega", "Yuva Shristi"];

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">

        {/* ── Hero header ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-500 p-6 text-white shadow-lg shadow-indigo-500/20"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-36 h-36 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Anvesana Incubation</p>
              <h1 className="text-2xl font-bold tracking-tight">🚀 Startup Portfolio</h1>
              <p className="text-indigo-200 text-sm mt-1">Manage and track all incubated startups across programs.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => seedStartups.mutate()}
                  disabled={seedStartups.isPending}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-colors active:scale-95 disabled:opacity-60"
                >
                  {seedStartups.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  Seed Data
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-2 bg-white text-indigo-700 rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Startup
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── KPI stat cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            const tok  = colorToken[card.color];
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + idx * 0.06 }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 cursor-default", tok)}
              >
                <Icon className="w-5 h-5 mb-3 opacity-70" />
                <p className="text-2xl font-bold text-slate-900 leading-none">{card.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-2 opacity-80">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Search & filter ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search startups, founders, or industry…"
                className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium transition-all",
                showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Filter className="w-4 h-4" /> Filters
              {(filterProgram !== "all" || filterStage !== "all" || filterStatus !== "all") && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
                  {[
                    { label: "Program", value: filterProgram, set: setFilterProgram, options: PROGRAMS },
                    { label: "Stage",   value: filterStage,   set: setFilterStage,   options: STAGES   },
                    { label: "Status",  value: filterStatus,  set: setFilterStatus,  options: STATUSES },
                  ].map(({ label, value, set, options }) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</p>
                      <Select value={value} onValueChange={set}>
                        <SelectTrigger className="h-9 bg-slate-50 border-slate-200 rounded-xl text-sm">
                          <SelectValue placeholder={`All ${label}s`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All {label}s</SelectItem>
                          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Data ───────────────────────────────────────────── */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
              </div>
            ))}
          </div>
        ) : !startups || startups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Rocket className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No startups found</p>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              {search || filterProgram !== "all" ? "Try adjusting your filters." : "Load sample data or add a startup."}
            </p>
            {isAdmin && !search && filterProgram === "all" && (
              <button
                type="button"
                onClick={() => seedStartups.mutate()}
                disabled={seedStartups.isPending}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
              >
                {seedStartups.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                Load Sample Data
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile cards ───────────────────────────────── */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {startups.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 rounded-2xl shrink-0">
                      <AvatarFallback className="rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 font-bold text-sm">
                        {s.startupName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{s.startupName}</p>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", statusColor[s.status] ?? "bg-slate-50 text-slate-600 border-slate-200")}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{s.founderName}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", programColor[s.program] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                          {s.program}
                        </span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", stageColor[s.stage] ?? "bg-slate-100 text-slate-600")}>
                          {s.stage}
                        </span>
                      </div>
                      {s.mentor && <p className="text-[11px] text-slate-400 mt-1.5">Mentor: {s.mentor}</p>}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400 font-medium">Progress</span>
                          <span className="text-[10px] font-bold text-indigo-600">{s.progress}%</span>
                        </div>
                        <ProgressBar value={s.progress} />
                      </div>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" aria-label="Actions" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/startups/${s.id}`} className="cursor-pointer">
                              <ExternalLink className="w-4 h-4" /> View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => setEditTarget(s)}>
                            <Pencil className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeleteTarget(s)}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Desktop table ──────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    {["Startup", "Program", "Stage", "Mentor", "Funding", "Progress", "Status", ""].map((h) => (
                      <TableHead key={h} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {startups.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-slate-100 hover:bg-slate-50/60 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-xl shrink-0">
                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 font-bold text-xs">
                              {s.startupName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/dashboard/startups/${s.id}`} className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
                              {s.startupName}
                            </Link>
                            <p className="text-xs text-slate-400">{s.founderName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", programColor[s.program] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                          {s.program}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", stageColor[s.stage] ?? "bg-slate-100 text-slate-600")}>
                          {s.stage}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[120px] truncate">
                        {s.mentor ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-semibold", fundingColor[s.fundingStage] ?? "text-slate-500")}>
                          {s.fundingStage}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={s.progress} className="flex-1" />
                          <span className="text-xs font-bold text-slate-600 w-8 text-right">{s.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", statusColor[s.status] ?? "bg-slate-50 text-slate-600 border-slate-200")}>
                          {s.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label="Actions" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/startups/${s.id}`} className="cursor-pointer">
                                  <ExternalLink className="w-4 h-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => setEditTarget(s)}>
                                <Pencil className="w-4 h-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeleteTarget(s)}>
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!isLoading && startups && startups.length > 0 && (
          <p className="text-xs text-slate-400 text-center">
            Showing <strong className="text-slate-600">{startups.length}</strong> startup{startups.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {addOpen && <StartupModal onClose={() => setAddOpen(false)} />}
      {editTarget && <StartupModal startup={editTarget} onClose={() => setEditTarget(null)} />}
      <DeleteModal startup={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </RoleGuard>
  );
}
