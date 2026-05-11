"use client";

import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStartup, useUpdateStartup, StartupData } from "@/hooks/useStartups";
import { cn } from "@/lib/utils";

const PROGRAMS = ["Diksuchi", "Vridhi", "Vega", "Yuva Shristi"];
const STAGES   = ["Idea", "Prototype", "MVP", "Funding", "Growth", "Scaling"];
const FUNDING  = ["Bootstrapped", "Grant Supported", "Pre-Seed", "Seed", "Series A", "Series B"];
const STATUSES = ["Active", "Paused", "Graduated", "Completed", "On Hold"];
const MENTORS  = [
  "Dr. Ramesh Kumar",
  "Prof. Sunita Sharma",
  "Mr. Vikram Nair",
  "Dr. Priya Patel",
  "Mr. Anil Verma",
  "Prof. Meena Krishnan",
];

const startupSchema = z.object({
  startupName:  z.string().min(2, "Name is required"),
  founderName:  z.string().min(2, "Founder name is required"),
  founderEmail: z.string().email("Valid email required").or(z.literal("")).optional(),
  founderPhone: z.string().optional(),
  program:      z.string().min(1),
  stage:        z.string().min(1),
  mentor:       z.string().optional(),
  fundingStage: z.string().min(1),
  progress:     z.coerce.number().min(0).max(100),
  status:       z.string().min(1),
  description:  z.string().optional(),
  website:      z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  industry:     z.string().optional(),
  teamSize:     z.coerce.number().min(1).optional().or(z.literal("")),
  location:     z.string().optional(),
});
type StartupForm = z.infer<typeof startupSchema>;

function ProgressBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-emerald-500" : value >= 45 ? "bg-indigo-500" : "bg-amber-500";
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function StartupModal({
  startup,
  onClose,
}: {
  startup?: StartupData;
  onClose: () => void;
}) {
  const createStartup = useCreateStartup();
  const updateStartup = useUpdateStartup();
  const isEdit = !!startup;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StartupForm>({
    resolver: zodResolver(startupSchema),
    defaultValues: isEdit
      ? {
          startupName:  startup.startupName,
          founderName:  startup.founderName,
          founderEmail: startup.founderEmail ?? "",
          founderPhone: startup.founderPhone ?? "",
          program:      startup.program,
          stage:        startup.stage,
          mentor:       startup.mentor ?? "",
          fundingStage: startup.fundingStage,
          progress:     startup.progress,
          status:       startup.status,
          description:  startup.description ?? "",
          website:      startup.website ?? "",
          industry:     startup.industry ?? "",
          teamSize:     startup.teamSize ?? undefined,
          location:     startup.location ?? "",
        }
      : {
          program: "Diksuchi", stage: "Idea",
          fundingStage: "Bootstrapped", status: "Active", progress: 0,
        },
  });

  const progress = watch("progress");

  const onSubmit = async (data: StartupForm) => {
    const payload = {
      ...data,
      founderEmail: data.founderEmail || null,
      founderPhone: data.founderPhone || null,
      mentor:       data.mentor       || null,
      description:  data.description  || null,
      website:      data.website      || null,
      industry:     data.industry     || null,
      teamSize:     data.teamSize ? Number(data.teamSize) : null,
      location:     data.location     || null,
    };
    if (isEdit) {
      await updateStartup.mutateAsync({ id: startup.id, data: payload });
    } else {
      await createStartup.mutateAsync(payload);
    }
    reset();
    onClose();
  };

  const isPending = createStartup.isPending || updateStartup.isPending;

  const textField = (name: keyof StartupForm, label: string, placeholder?: string, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={cn(
          "h-10 rounded-xl bg-slate-50 border-slate-200 text-sm",
          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0",
          (errors as any)[name] && "border-red-400 bg-red-50/60"
        )}
      />
      {(errors as any)[name] && (
        <p className="text-xs text-red-500">{(errors as any)[name]?.message}</p>
      )}
    </div>
  );

  const selectField = (name: keyof StartupForm, label: string, options: string[], defaultVal?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</Label>
      <Select
        defaultValue={(startup as any)?.[name] ?? defaultVal}
        onValueChange={(v) => setValue(name, v as any)}
      >
        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEdit ? `Edit — ${startup.startupName}` : "Add New Startup"}
          </DialogTitle>
          <p className="text-sm text-slate-400">
            {isEdit ? "Update startup information below." : "Fill in the startup details."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textField("startupName",  "Startup Name",   "e.g. VeloData")}
            {textField("founderName",  "Founder Name",   "e.g. Rahul Nambiar")}
            {textField("founderEmail", "Founder Email",  "founder@startup.com", "email")}
            {textField("founderPhone", "Founder Phone",  "+91 98765 43210")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectField("program",      "Program",       PROGRAMS, "Diksuchi")}
            {selectField("stage",        "Stage",         STAGES,   "Idea")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectField("fundingStage", "Funding Stage", FUNDING,  "Bootstrapped")}
            {selectField("status",       "Status",        STATUSES, "Active")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectField("mentor",       "Mentor",        MENTORS)}
            {textField("industry",       "Industry",      "e.g. FinTech, AgriTech")}
          </div>

          {/* Progress slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Progress</Label>
              <span className="text-sm font-bold text-indigo-600">{progress ?? 0}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              {...register("progress")}
              className="w-full h-2 rounded-full accent-indigo-600 cursor-pointer"
            />
            <ProgressBar value={Number(progress ?? 0)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {textField("teamSize", "Team Size",   "e.g. 5",                    "number")}
            {textField("location", "Location",    "e.g. Bengaluru, Karnataka")}
          </div>
          {textField("website", "Website", "https://startup.com", "url")}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</Label>
            <Textarea
              placeholder="Brief description of the startup and its value proposition…"
              {...register("description")}
              className="min-h-[80px] resize-none rounded-xl bg-slate-50 border-slate-200 text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
            />
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => { reset(); onClose(); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm shadow-indigo-500/25"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isEdit ? "Saving…" : "Adding…"}</>
              ) : (
                isEdit ? "Save Changes" : "Add Startup"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
