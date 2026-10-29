"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Download } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { SeriesChart } from "@/components/SeriesChart";

type Garden = { id: string; name: string };
type Pot = { id: string; label: string };
type Data = { pot: { label: string; pumpState: string; irrigationMode: string; moistureOnThreshold: number; moistureOffThreshold: number }; soilMoisture: { value: number; recordedAt: string }[]; weather: { observedAt: string; temperature: number | null; humidity: number | null; rainProbability: number | null; windSpeed: number | null; condition: string | null }[]; irrigation: { id: string; startedAt: string; mode: string; status: string; reason: string | null; outcome: string | null }[]; pumpEvents: { id: string; occurredAt: string; previousState: string; newState: string; source: string; status: string; failureReason: string | null }[] };

export default function AnalyticsPage() {
  const { data: gardens } = useSWR<Garden[]>("/api/gardens");
  const [gardenId, setGardenId] = useState(""); const [potId, setPotId] = useState(""); const [range, setRange] = useState("24h"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [exportError, setExportError] = useState(""); const [exportSuccess, setExportSuccess] = useState(""); const [isExporting, setIsExporting] = useState(false);
  const { data: pots } = useSWR<Pot[]>(gardenId ? `/api/pots?gardenId=${gardenId}` : null);
  useEffect(() => setPotId(""), [gardenId]);
  useEffect(() => { if (pots?.length) setPotId((current) => pots.some((pot) => pot.id === current) ? current : pots[0].id); }, [pots]);
  const customValidation = useMemo(() => { if (range !== "custom") return ""; if (!from || !to) return "Select both From and To date-times."; return from >= to ? "To date and time must be later than From date and time." : ""; }, [from, range, to]);
  const params = useMemo(() => { const search = new URLSearchParams({ gardenId, potId, range }); if (range === "custom") { search.set("from", from); search.set("to", to); } return search.toString(); }, [from, gardenId, potId, range, to]);
  const analyticsUrl = gardenId && potId && !customValidation ? `/api/analytics/pot?${params}` : null;
  const { data, error, isLoading } = useSWR<Data>(analyticsUrl);
  async function exportExcel() {
    setExportError(""); setExportSuccess("");
    if (!gardenId || !potId) { setExportError("Select a garden and pot before exporting."); return; }
    if (customValidation) { setExportError(customValidation); return; }
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/pot-analytics?${params}`);
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error ?? "Unable to generate the Excel export."); }
      const objectUrl = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = objectUrl; link.download = "pot-analytics.xlsx"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(objectUrl);
      setExportSuccess("Excel file generated successfully.");
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Unable to generate the Excel export."); } finally { setIsExporting(false); }
  }
  return <div><PageHeader title="Pot analytics" subtitle="Soil and pump data are per pot; weather is stored once for its Garden." action={<button type="button" onClick={exportExcel} disabled={isExporting} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"><Download size={16}/>{isExporting ? "Exporting…" : "Export Excel"}</button>}/><Card className="mb-6"><div className="grid gap-3 md:grid-cols-3"><Picker label="Garden" value={gardenId} setValue={setGardenId} items={gardens ?? []}/><Picker label="Pot" value={potId} setValue={setPotId} items={pots ?? []}/><Picker label="Period" value={range} setValue={setRange} items={[{ id: "24h", name: "24 hours" }, { id: "7d", name: "7 days" }, { id: "30d", name: "30 days" }, { id: "custom", name: "Custom date & time range" }]}/></div>{range === "custom" && <div className="mt-3 grid gap-3 md:grid-cols-2"><DateTimeField label="From date & time" value={from} setValue={setFrom}/><DateTimeField label="To date & time" value={to} setValue={setTo} min={from}/></div>}{customValidation && <p className="mt-3 text-sm text-rose-600" role="alert">{customValidation}</p>}{exportError && <p className="mt-3 text-sm text-rose-600" role="alert">{exportError}</p>}{exportSuccess && <p className="mt-3 text-sm text-emerald-600" role="status">{exportSuccess}</p>}</Card>{!gardenId || !potId ? <Card>Select a garden and pot.</Card> : customValidation ? <Card>Select a valid custom date and time range to view analytics.</Card> : isLoading ? <Card>Loading analytics…</Card> : error ? <Card><p className="text-rose-600">{error.message}</p></Card> : data ? <><div className="mb-4 grid gap-3 sm:grid-cols-4"><Stat label="Pump" value={data.pot.pumpState}/><Stat label="Mode" value={data.pot.irrigationMode}/><Stat label="ON / OFF" value={`${data.pot.moistureOnThreshold}% / ${data.pot.moistureOffThreshold}%`}/><Stat label="Readings" value={String(data.soilMoisture.length)}/></div><div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-2 font-black">Soil moisture (%)</h3><SeriesChart data={data.soilMoisture} color="#0ea5e9" unit="%"/></Card><Card><h3 className="mb-2 font-black">Garden weather history</h3><Rows rows={data.weather.map((weather) => `${new Date(weather.observedAt).toLocaleString()} · ${weather.temperature ?? "—"}°C · ${weather.humidity ?? "—"}% humidity · rain ${weather.rainProbability ?? "—"}% · wind ${weather.windSpeed ?? "—"} · ${weather.condition ?? "—"}`)}/></Card></div><Card className="mt-4"><h3 className="font-black">Irrigation decisions</h3><Rows rows={data.irrigation.map((event) => `${new Date(event.startedAt).toLocaleString()} · ${event.mode} · ${event.outcome ?? event.status}${event.reason ? ` · ${event.reason}` : ""}`)}/></Card><Card className="mt-4"><h3 className="font-black">Pump history</h3><Rows rows={data.pumpEvents.map((event) => `${new Date(event.occurredAt).toLocaleString()} · ${event.previousState} → ${event.newState} · ${event.source} · ${event.status}${event.failureReason ? ` · ${event.failureReason}` : ""}`)}/></Card></> : null}</div>;
}
function Picker({ label, value, setValue, items }: { label: string; value: string; setValue: (value: string) => void; items: { id: string; name?: string; label?: string }[] }) { return <label className="text-sm font-bold">{label}<select value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 dark:bg-slate-950"><option value="">Select…</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name ?? item.label}</option>)}</select></label>; }
function DateTimeField({ label, value, setValue, min }: { label: string; value: string; setValue: (value: string) => void; min?: string }) { return <label className="text-sm font-bold">{label}<input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} min={min} className="mt-1 w-full rounded-lg border bg-white p-2 dark:bg-slate-950"/></label>; }
function Stat({ label, value }: { label: string; value: string }) { return <Card><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="font-black">{value}</p></Card>; }
function Rows({ rows }: { rows: string[] }) { return rows.length ? <div className="mt-2 max-h-44 overflow-y-auto text-sm">{rows.map((row, index) => <p className="break-words border-b py-1" key={index}>{row}</p>)}</div> : <p className="mt-2 text-sm text-slate-400">No stored records for this period.</p>; }
