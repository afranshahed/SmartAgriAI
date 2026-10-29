"use client";

// PAGE: Plants CRUD - crops with growth stage + health status.
import { useState } from "react";
import useSWR from "swr";
import { Check, Flower2, Pencil, Trash2, X } from "lucide-react";
import { Badge, Card, IconButton, PageHeader } from "@/components/ui";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import { Input } from "../gardens/page";

interface Garden { id: string; name: string }
interface Pot {
  id: string;
  gardenId: string;
  label: string;
  plant?: { id: string; commonName: string } | null;
}
interface Plant {
  id: string;
  gardenId: string;
  potId: string;
  commonName: string;
  variety: string | null;
  growthStage: string;
  healthStatus: string;
  garden: { name: string };
  pot: { label: string };
}
interface EditingPlant {
  id: string;
  gardenId: string;
  potId: string;
  commonName: string;
  variety: string;
  growthStage: string;
  healthStatus: string;
}

const healthTone: Record<string, "emerald" | "rose" | "amber" | "slate"> = {
  healthy: "emerald",
  diseased: "rose",
  at_risk: "amber",
  recovering: "amber",
  unknown: "slate",
};

const growthStages = ["seedling", "vegetative", "flowering", "fruiting", "mature", "harvested"];
const healthStatuses = ["healthy", "at_risk", "diseased", "recovering", "unknown"];

export default function PlantsPage() {
  const { data: gardens } = useSWR<Garden[]>("/api/gardens");
  const { data: plants, mutate } = useSWR<Plant[]>("/api/plants");
  const [gardenId, setGardenId] = useState("");
  const { data: pots } = useSWR<Pot[]>(
    gardenId ? `/api/pots?gardenId=${gardenId}&availableForPlant=true` : null,
  );
  const [potId, setPotId] = useState("");
  const [commonName, setCommonName] = useState("");
  const [variety, setVariety] = useState("");
  const [editing, setEditing] = useState<EditingPlant | null>(null);
  const { data: editPots } = useSWR<Pot[]>(
    editing?.gardenId
      ? `/api/pots?gardenId=${editing.gardenId}&availableForPlant=true&currentPlantId=${editing.id}`
      : null,
  );
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");

  function selectGarden(nextGardenId: string) {
    setGardenId(nextGardenId);
    setPotId("");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiPost("/api/plants", { gardenId, potId, commonName, variety });
      setCommonName("");
      setVariety("");
      setPotId("");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  function startEdit(plant: Plant) {
    setEditError("");
    setEditing({
      id: plant.id,
      gardenId: plant.gardenId,
      potId: plant.potId,
      commonName: plant.commonName,
      variety: plant.variety ?? "",
      growthStage: plant.growthStage,
      healthStatus: plant.healthStatus,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError("");
    try {
      await apiPatch(`/api/plants/${editing.id}`, {
        gardenId: editing.gardenId,
        potId: editing.potId,
        commonName: editing.commonName,
        variety: editing.variety,
        growthStage: editing.growthStage,
        healthStatus: editing.healthStatus,
      });
      setEditing(null);
      mutate();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader title="Plants" subtitle="Track each crop's growth stage and health." />

      <Card className="mb-6">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Garden</span>
            <select
              value={gardenId}
              onChange={(e) => selectGarden(e.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Select...</option>
              {(gardens ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Pot</span>
            <select
              value={potId}
              onChange={(e) => setPotId(e.target.value)}
              required
              disabled={!gardenId}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900"
            >
              <option value="">{gardenId ? "Select..." : "Select garden first"}</option>
              {(pots ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <Input label="Crop" value={commonName} onChange={setCommonName} placeholder="Tomato" required />
          <Input label="Variety" value={variety} onChange={setVariety} placeholder="Roma" />
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            Add plant
          </button>
        </form>
        {error ? <p className="mt-2 text-sm font-bold text-rose-600">{error}</p> : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(plants ?? []).map((p) => (
          <Card key={p.id}>
            {editing?.id === p.id ? (
              <form onSubmit={saveEdit} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Crop"
                    value={editing.commonName}
                    onChange={(value) => setEditing({ ...editing, commonName: value })}
                    required
                  />
                  <Input
                    label="Variety"
                    value={editing.variety}
                    onChange={(value) => setEditing({ ...editing, variety: value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Garden</span>
                    <select
                      value={editing.gardenId}
                      onChange={(e) => setEditing({ ...editing, gardenId: e.target.value, potId: "" })}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {(gardens ?? []).map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Pot</span>
                    <select
                      value={editing.potId}
                      onChange={(e) => setEditing({ ...editing, potId: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Select...</option>
                      {(editPots ?? []).map((pot) => (
                        <option key={pot.id} value={pot.id}>
                          {pot.label}{pot.plant?.id === editing.id ? " (current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Growth</span>
                    <select
                      value={editing.growthStage}
                      onChange={(e) => setEditing({ ...editing, growthStage: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {growthStages.map((stage) => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Health</span>
                    <select
                      value={editing.healthStatus}
                      onChange={(e) => setEditing({ ...editing, healthStatus: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {healthStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {editError ? <p className="text-sm font-bold text-rose-600">{editError}</p> : null}
                <div className="flex justify-end gap-2">
                  <IconButton onClick={() => setEditing(null)} className="border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900" aria-label="Cancel edit">
                    <X size={16} />
                  </IconButton>
                  <IconButton type="submit" className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700" aria-label="Save plant">
                    <Check size={16} />
                  </IconButton>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950">
                      <Flower2 size={18} />
                    </span>
                    <div>
                      <p className="font-black">{p.commonName}</p>
                      <p className="text-xs text-slate-500">
                        {p.variety || "-"} - {p.garden.name} - {p.pot.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <IconButton onClick={() => startEdit(p)} className="border-transparent text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40" aria-label={`Edit ${p.commonName}`}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton onClick={() => { apiDelete(`/api/plants/${p.id}`).then(() => mutate()); }} className="border-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label={`Delete ${p.commonName}`}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="violet">{p.growthStage}</Badge>
                  <Badge tone={healthTone[p.healthStatus] ?? "slate"}>{p.healthStatus}</Badge>
                  <Badge tone="slate">{p.pot.label}</Badge>
                </div>
              </>
            )}
          </Card>
        ))}
        {plants && plants.length === 0 ? (
          <p className="text-sm text-slate-400">No plants yet.</p>
        ) : null}
      </div>
    </div>
  );
}
