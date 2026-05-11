"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface StartupData {
  id: string;
  startupName: string;
  founderName: string;
  founderEmail: string | null;
  founderPhone: string | null;
  program: string;
  stage: string;
  mentor: string | null;
  description: string | null;
  fundingStage: string;
  progress: number;
  status: string;
  website: string | null;
  logo: string | null;
  industry: string | null;
  teamSize: number | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StartupCreateInput = Omit<StartupData, "id" | "createdAt" | "updatedAt">;
export type StartupUpdateInput = Partial<StartupCreateInput>;

// ── Query keys ────────────────────────────────────────────────
const KEYS = {
  all:  ["startups"] as const,
  one:  (id: string) => ["startups", id] as const,
};

// ── Fetch all startups with optional client-side filtering ────
export function useStartups(filters?: {
  search?: string;
  program?: string;
  stage?: string;
  fundingStage?: string;
  status?: string;
  mentor?: string;
}) {
  return useQuery<StartupData[]>({
    queryKey: KEYS.all,
    queryFn: async () => {
      const res = await fetch("/api/startups");
      if (!res.ok) throw new Error("Failed to fetch startups");
      const json = await res.json();
      return json.startups as StartupData[];
    },
    select: (data) => {
      let result = data;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (s) =>
            s.startupName.toLowerCase().includes(q) ||
            s.founderName.toLowerCase().includes(q) ||
            (s.industry?.toLowerCase().includes(q) ?? false)
        );
      }
      if (filters?.program && filters.program !== "all")
        result = result.filter((s) => s.program === filters.program);
      if (filters?.stage && filters.stage !== "all")
        result = result.filter((s) => s.stage === filters.stage);
      if (filters?.fundingStage && filters.fundingStage !== "all")
        result = result.filter((s) => s.fundingStage === filters.fundingStage);
      if (filters?.status && filters.status !== "all")
        result = result.filter((s) => s.status === filters.status);
      if (filters?.mentor && filters.mentor !== "all")
        result = result.filter((s) => s.mentor === filters.mentor);
      return result;
    },
  });
}

// ── Fetch single startup ──────────────────────────────────────
export function useStartup(id: string) {
  return useQuery<StartupData | undefined>({
    queryKey: KEYS.one(id),
    queryFn: async () => {
      const res = await fetch(`/api/startups/${id}`);
      if (!res.ok) return undefined;
      const json = await res.json();
      return json.startup as StartupData;
    },
    enabled: !!id,
  });
}

// ── Create startup ────────────────────────────────────────────
export function useCreateStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: StartupUpdateInput) => {
      const res = await fetch("/api/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create startup");
      return json.startup as StartupData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Startup added successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Update startup ────────────────────────────────────────────
export function useUpdateStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StartupUpdateInput }) => {
      const res = await fetch(`/api/startups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update startup");
      return json.startup as StartupData;
    },
    onSuccess: (startup) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.one(startup.id) });
      toast.success("Startup updated successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Delete startup ────────────────────────────────────────────
export function useDeleteStartup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/startups/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete startup");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success("Startup deleted.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Seed initial data ─────────────────────────────────────────
export function useSeedStartups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/startups/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Seed failed");
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      if (data.skipped) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
