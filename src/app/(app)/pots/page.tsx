"use client";

// PAGE: Pots CRUD — containers within a garden (label + soil type).
import { useState } from "react";
import useSWR from "swr";
import { Package, Trash2 } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { apiDelete, apiPost } from "@/lib/api-client";
import { Input } from "../gardens/page";

interface Garden { id: string; name: string }
interface Pot {
  id: string;
  label: string;
  soilType: string;
  garden: { name: string };
  plant: { id: string; commonName: string } | null;
  moistureOnThreshold: number;
  moistureOffThreshold: number;
  irrigationMode: "AUTO" | "MANUAL";
  pumpState: "on" | "off";
  currentMoisture: number | null;
}

export default function PotsPage() {
  const { data: gardens } = useSWR<Garden[]>("/api/gardens");
  const { data: pots, mutate } = useSWR<Pot[]>("/api/pots");
  const [gardenId, setGardenId] = useState("");
  const [label, setLabel] = useState("");
  const [soilType, setSoilType] = useState("loam");
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiPost("/api/pots", { gardenId, label, soilType });
      setLabel("");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader title="Pots" subtitle="Physical containers within a garden. Manage irrigation from Irrigation." />

      <Card className="mb-6">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Garden</span>
            <select
              value={gardenId}
              onChange={(e) => setGardenId(e.target.value)}
              required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Select…</option>
              {(gardens ?? []).map((garden) => (
                <option key={garden.id} value={garden.id}>{garden.name}</option>
              ))}
            </select>
          </div>
          <Input label="Label" value={label} onChange={setLabel} placeholder="Pot A1" required />
          <div>
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Soil</span>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {["loam", "clay", "sandy", "silt", "peat", "potting_mix"].map((soil) => (
                <option key={soil} value={soil}>{soil}</option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            Add pot
          </button>
        </form>
        {error ? <p className="mt-2 text-sm font-bold text-rose-600">{error}</p> : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(pots ?? []).map((pot) => (
          <Card key={pot.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950">
                  <Package size={18} />
                </span>
                <div>
                  <p className="font-black">{pot.label}</p>
                  <p className="text-xs text-slate-500">{pot.garden.name}</p>
                </div>
              </div>
              <button
                onClick={() => { apiDelete(`/api/pots/${pot.id}`).then(() => mutate()); }}
                className="text-slate-400 hover:text-rose-600"
                aria-label={`Delete ${pot.label}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <Badge tone="amber">{pot.soilType}</Badge>
              <Badge tone={pot.plant ? "emerald" : "slate"}>
                {pot.plant ? pot.plant.commonName : "empty"}
              </Badge>
              <Badge tone={pot.pumpState === "on" ? "sky" : "slate"}>
                Pump {pot.pumpState.toUpperCase()}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-400">Pump status</p>
                <p className="font-black">{pot.pumpState.toUpperCase()}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-400">Mode</p>
                <p className="font-black">{pot.irrigationMode}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-400">Soil moisture</p>
                <p className="font-black">{pot.currentMoisture == null ? "No reading" : `${pot.currentMoisture}%`}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase text-slate-400">Pump ON / OFF</p>
                <p className="font-black">{pot.moistureOnThreshold}% / {pot.moistureOffThreshold}%</p>
              </div>
            </div>
          </Card>
        ))}
        {pots && pots.length === 0 ? <p className="text-sm text-slate-400">No pots yet.</p> : null}
      </div>
    </div>
  );
}
