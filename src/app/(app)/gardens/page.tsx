"use client";

// PAGE: Gardens CRUD - create/list/edit/delete growing areas. (Also exports the
// shared <Input> control reused by the Pots/Plants/Sensors/Settings forms.)
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Check, MapPin, Pencil, Radio, Trash2, Trees, X } from "lucide-react";
import { Badge, Card, IconButton, PageHeader } from "@/components/ui";
import { Input } from "@/components/Input";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import { getSelectedGardenId, setSelectedGardenId } from "@/lib/selected-garden";

interface Garden {
  id: string;
  name: string;
  type: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
  _count: { pots: number; plants: number; devices: number };
}

interface GardenForm {
  name: string;
  type: string;
  location: string;
  lat: string;
  lng: string;
}

interface GardenOverview {
  id: string;
  deviceSummary: { online: number; offline: number };
  pumpsOn: number;
}

const emptyForm: GardenForm = {
  name: "",
  type: "outdoor",
  location: "",
  lat: "",
  lng: "",
};

function parseGardenForm(form: GardenForm) {
  return {
    name: form.name,
    type: form.type,
    location: form.location || undefined,
    lat: Number(form.lat),
    lng: Number(form.lng),
  };
}

export default function GardensPage() {
  const { data: gardens, mutate } = useSWR<Garden[]>("/api/gardens");
  const { data: gardenOverviews } = useSWR<GardenOverview[]>(
    "/api/gardens/overview",
    { refreshInterval: 30000 },
  );
  const [form, setForm] = useState<GardenForm>(emptyForm);
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<GardenForm>(emptyForm);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");

  const selectedGarden =
    gardens?.find((garden) => garden.id === selectedId) ?? gardens?.[0];
  const activeSelectedId = selectedGarden?.id ?? "";
  const overviewByGardenId = new Map(
    (gardenOverviews ?? []).map((overview) => [overview.id, overview]),
  );

  useEffect(() => {
    if (!gardens?.length || selectedId) return;
    const savedGardenId = getSelectedGardenId();
    setSelectedId(
      gardens.some((garden) => garden.id === savedGardenId)
        ? savedGardenId!
        : gardens[0].id,
    );
  }, [gardens, selectedId]);

  useEffect(() => {
    if (selectedId) setSelectedGardenId(selectedId);
  }, [selectedId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiPost("/api/gardens", parseGardenForm(form));
      setForm(emptyForm);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  function startEdit(garden: Garden) {
    setEditError("");
    setEditingId(garden.id);
    setEditing({
      name: garden.name,
      type: garden.type,
      location: garden.location ?? "",
      lat: garden.lat != null ? String(garden.lat) : "",
      lng: garden.lng != null ? String(garden.lng) : "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditError("");
    try {
      await apiPatch(`/api/gardens/${editingId}`, parseGardenForm(editing));
      setEditingId(null);
      mutate();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(id: string) {
    await apiDelete(`/api/gardens/${id}`);
    if (activeSelectedId === id) setSelectedId("");
    mutate();
  }

  return (
    <div>
      <PageHeader title="Gardens" subtitle="Group your pots, plants and sensors by growing area." />

      <Card className="mb-6">
        <form onSubmit={create} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            label="Name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            placeholder="North Field"
            required
          />
          <SelectField
            label="Type"
            value={form.type}
            onChange={(type) => setForm({ ...form, type })}
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
            placeholder="Dhaka"
          />
          <Input
            label="Latitude"
            value={form.lat}
            onChange={(lat) => setForm({ ...form, lat })}
            placeholder="23.81"
            type="number"
            step="any"
            required
          />
          <Input
            label="Longitude"
            value={form.lng}
            onChange={(lng) => setForm({ ...form, lng })}
            placeholder="90.41"
            type="number"
            step="any"
            required
          />
          <div className="flex items-end">
            <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              Add garden
            </button>
          </div>
        </form>
        {error ? <p className="mt-2 text-sm font-bold text-rose-600">{error}</p> : null}
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                Active garden
              </p>
              <p className="mt-1 text-2xl font-black">
                {selectedGarden?.name ?? "No garden selected"}
              </p>
            </div>
            <label className="block min-w-56">
              <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">
                Switch garden
              </span>
              <select
                value={activeSelectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {(gardens ?? []).map((garden) => (
                  <option key={garden.id} value={garden.id}>
                    {garden.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedGarden ? (
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Latitude" value={formatCoordinate(selectedGarden.lat)} />
              <Detail label="Longitude" value={formatCoordinate(selectedGarden.lng)} />
              <Detail label="Created" value={formatDate(selectedGarden.createdAt)} />
              <Detail label="Updated" value={formatDate(selectedGarden.updatedAt)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Create a garden to start switching between gardens.</p>
          )}
        </Card>

        <Card>
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Garden summary
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="emerald">{gardens?.length ?? 0} gardens</Badge>
            <Badge tone="slate">{selectedGarden?._count.pots ?? 0} pots</Badge>
            <Badge tone="slate">{selectedGarden?._count.plants ?? 0} plants</Badge>
            <Badge tone="slate">{selectedGarden?._count.devices ?? 0} devices</Badge>
            {activeSelectedId && overviewByGardenId.get(activeSelectedId) ? (
              <Badge tone={overviewByGardenId.get(activeSelectedId)!.deviceSummary.offline ? "amber" : "sky"}>
                <Radio className="mr-1" size={12} />
                {overviewByGardenId.get(activeSelectedId)!.deviceSummary.online} online
              </Badge>
            ) : null}
            {(overviewByGardenId.get(activeSelectedId)?.pumpsOn ?? 0) > 0 ? (
              <Badge tone="emerald">{overviewByGardenId.get(activeSelectedId)!.pumpsOn} pump on</Badge>
            ) : null}
          </div>
          {activeSelectedId ? (
            <Link
              href={`/gardens/${activeSelectedId}`}
              className="mt-4 inline-block text-sm font-bold text-emerald-600"
            >
              Open garden dashboard →
            </Link>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(gardens ?? []).map((garden) => (
          <Card
            key={garden.id}
            className={garden.id === activeSelectedId ? "border-emerald-200 dark:border-emerald-900" : ""}
          >
            {editingId === garden.id ? (
              <form onSubmit={saveEdit} className="space-y-3">
                <Input
                  label="Name"
                  value={editing.name}
                  onChange={(name) => setEditing({ ...editing, name })}
                  required
                />
                <SelectField
                  label="Type"
                  value={editing.type}
                  onChange={(type) => setEditing({ ...editing, type })}
                />
                <Input
                  label="Location"
                  value={editing.location}
                  onChange={(location) => setEditing({ ...editing, location })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Latitude"
                    value={editing.lat}
                    onChange={(lat) => setEditing({ ...editing, lat })}
                    type="number"
                    step="any"
                    required
                  />
                  <Input
                    label="Longitude"
                    value={editing.lng}
                    onChange={(lng) => setEditing({ ...editing, lng })}
                    type="number"
                    step="any"
                    required
                  />
                </div>
                {editError ? <p className="text-sm font-bold text-rose-600">{editError}</p> : null}
                <div className="flex justify-end gap-2">
                  <IconButton
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                    aria-label="Cancel edit"
                  >
                    <X size={16} />
                  </IconButton>
                  <IconButton
                    type="submit"
                    className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                    aria-label="Save garden"
                  >
                    <Check size={16} />
                  </IconButton>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(garden.id)}
                    className="flex min-w-0 items-start gap-2 text-left"
                  >
                    <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950">
                      <Trees size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-black">{garden.name}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={12} />
                        {garden.location || "No location label"}
                      </span>
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <IconButton
                      onClick={() => startEdit(garden)}
                      className="border-transparent text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40"
                      aria-label="Edit garden"
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      onClick={() => remove(garden.id)}
                      className="border-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      aria-label="Delete garden"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="emerald">{garden.type}</Badge>
                  <Badge tone="slate">{garden._count.pots} pots</Badge>
                  <Badge tone="slate">{garden._count.plants} plants</Badge>
                  {overviewByGardenId.get(garden.id) ? (
                    <Badge tone={overviewByGardenId.get(garden.id)!.deviceSummary.offline ? "amber" : "sky"}>
                      <Radio className="mr-1" size={12} />
                      {overviewByGardenId.get(garden.id)!.deviceSummary.online} online
                      {overviewByGardenId.get(garden.id)!.deviceSummary.offline
                        ? ` · ${overviewByGardenId.get(garden.id)!.deviceSummary.offline} offline`
                        : ""}
                    </Badge>
                  ) : null}
                  {(overviewByGardenId.get(garden.id)?.pumpsOn ?? 0) > 0 ? (
                    <Badge tone="emerald">{overviewByGardenId.get(garden.id)!.pumpsOn} pump on</Badge>
                  ) : null}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  {formatCoordinate(garden.lat)}, {formatCoordinate(garden.lng)}
                </div>
                <Link
                  href={`/gardens/${garden.id}`}
                  className="mt-4 inline-block text-sm font-bold text-emerald-600"
                >
                  Open garden dashboard →
                </Link>
              </>
            )}
          </Card>
        ))}
        {gardens && gardens.length === 0 ? (
          <p className="text-sm text-slate-400">No gardens yet. Add your first above.</p>
        ) : null}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="outdoor">Outdoor</option>
        <option value="greenhouse">Greenhouse</option>
        <option value="indoor">Indoor</option>
        <option value="hydroponic">Hydroponic</option>
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="font-bold text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function formatCoordinate(value: number | null) {
  return value == null ? "Not set" : value.toFixed(5);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}
