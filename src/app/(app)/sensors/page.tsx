"use client";

// PAGE: Feature 2 support — Sensors/Devices. Register an ESP32 node and copy
// the one-time device key it returns (used to authenticate ingestion).
import { useState } from "react";
import useSWR from "swr";
import { Satellite, Trash2 } from "lucide-react";
import { Badge, Card, IconButton, PageHeader } from "@/components/ui";
import { apiDelete, apiPost } from "@/lib/api-client";
import { Input } from "@/components/Input";

interface Garden { id: string; name: string }
interface Device {
  id: string;
  name: string;
  hardwareId: string;
  type: string;
  status: "NEVER_SEEN" | "ONLINE" | "OFFLINE";
  lastSeenAt: string | null;
  garden: { name: string };
}

const statusTone: Record<Device["status"], "emerald" | "amber" | "slate"> = {
  ONLINE: "emerald",
  OFFLINE: "amber",
  NEVER_SEEN: "slate",
};

export default function SensorsPage() {
  const { data: gardens } = useSWR<Garden[]>("/api/gardens");
  const { data: devices, mutate } = useSWR<Device[]>("/api/devices", {
    refreshInterval: 10000,
  });
  const [gardenId, setGardenId] = useState("");
  const [name, setName] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [type, setType] = useState("esp32_node");
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNewKey("");
    try {
      const res = await apiPost<{ deviceKey: string }>("/api/devices", {
        gardenId,
        name,
        hardwareId,
        type,
      });
      setNewKey(res.deviceKey);
      setName("");
      setHardwareId("");
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Sensors & Devices"
        subtitle="Register ESP32 nodes for each garden. Device keys are shown once."
      />

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
              {(gardens ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <Input label="Name" value={name} onChange={setName} placeholder="Field node 1" required />
          <Input label="Hardware ID" value={hardwareId} onChange={setHardwareId} placeholder="esp32-001" required />
          <div>
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {["esp32_node", "dht22", "dht11", "soil_moisture", "rain", "solenoid_valve"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            Register device
          </button>
        </form>
        {error ? <p className="mt-2 text-sm font-bold text-rose-600">{error}</p> : null}
        {newKey ? (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/40">
            <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
              Device key (shown once — store it on the ESP32)
            </p>
            <code className="mt-1 block break-all text-sm font-bold text-emerald-800 dark:text-emerald-200">
              {newKey}
            </code>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(devices ?? []).map((d) => (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-lg bg-sky-50 p-2 text-sky-600 dark:bg-sky-950">
                  <Satellite size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-black">{d.name}</p>
                  <p className="break-all text-xs text-slate-500">{d.hardwareId} · {d.garden.name}</p>
                </div>
              </div>
              <IconButton onClick={() => { apiDelete(`/api/devices/${d.id}`).then(() => mutate()); }} className="border-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label={`Delete ${d.name}`}>
                <Trash2 size={16} />
              </IconButton>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="sky">{d.type}</Badge>
              <Badge tone={statusTone[d.status]}>{d.status}</Badge>
              {d.lastSeenAt ? (
                <Badge tone="slate">
                  seen {new Date(d.lastSeenAt).toLocaleTimeString()}
                </Badge>
              ) : null}
            </div>
          </Card>
        ))}
        {devices && devices.length === 0 ? (
          <p className="text-sm text-slate-400">No devices yet.</p>
        ) : null}
      </div>
    </div>
  );
}
