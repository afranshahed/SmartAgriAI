"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Droplets, Power } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { apiPatch, apiPost } from "@/lib/api-client";

interface Garden { id: string; name: string }
interface Pot {
  id: string;
  label: string;
  irrigationMode: "AUTO" | "MANUAL";
  moistureOnThreshold: number;
  moistureOffThreshold: number;
  pumpState: "on" | "off";
  currentMoisture: number | null;
  moistureRecordedAt: string | null;
  latestCommand: {
    command: "PUMP_ON" | "PUMP_OFF";
    status: "PENDING" | "SENT" | "RETRYING" | "ACKNOWLEDGED" | "FAILED" | "EXPIRED" | "CANCELLED";
    error: string | null;
    deliveryAcknowledgedAt: string | null;
    executionResultAt: string | null;
  } | null;
}
interface LogRow {
  id: string;
  mode: string;
  status: "on" | "off";
  reason: string | null;
  startedAt: string;
}

export default function IrrigationPage() {
  const { data: gardens } = useSWR<Garden[]>("/api/gardens");
  const [gardenId, setGardenId] = useState("");
  const { data: pots, mutate: mutatePots } = useSWR<Pot[]>(
    gardenId ? `/api/pots?gardenId=${gardenId}` : null,
    { refreshInterval: 5000 },
  );
  const [potId, setPotId] = useState("");
  const selectedPot = pots?.find((pot) => pot.id === potId);
  const { data: logs, mutate: mutateLogs } = useSWR<LogRow[]>(
    gardenId && potId
      ? `/api/irrigation/logs?gardenId=${gardenId}&potId=${potId}`
      : null,
    { refreshInterval: 5000 },
  );
  const [onThresholdDraft, setOnThresholdDraft] = useState<number | null>(null);
  const [offThresholdDraft, setOffThresholdDraft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setPotId("");
    setOnThresholdDraft(null);
    setOffThresholdDraft(null);
  }, [gardenId]);

  useEffect(() => {
    if (!pots?.length) return;
    setPotId((currentPotId) =>
      pots.some((pot) => pot.id === currentPotId) ? currentPotId : pots[0].id,
    );
  }, [pots]);

  const onThreshold = onThresholdDraft ?? selectedPot?.moistureOnThreshold ?? 0;
  const offThreshold = offThresholdDraft ?? selectedPot?.moistureOffThreshold ?? 100;
  const moistureIsStale = Boolean(
    selectedPot?.moistureRecordedAt &&
      Date.now() - new Date(selectedPot.moistureRecordedAt).getTime() > 10 * 60 * 1000,
  );

  async function updateConfig(config: Partial<Pick<Pot, "irrigationMode" | "moistureOnThreshold" | "moistureOffThreshold">>) {
    if (!selectedPot) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await apiPatch<{ autoDecision?: { message: string } }>(`/api/pots/${selectedPot.id}/irrigation`, config);
      setOnThresholdDraft(null);
      setOffThresholdDraft(null);
      if (response.autoDecision?.message) setNotice(response.autoDecision.message);
      await Promise.all([mutatePots(), mutateLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update irrigation settings.");
    } finally {
      setBusy(false);
    }
  }

  async function setPump(status: "on" | "off") {
    if (!selectedPot) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await apiPost<{ accepted: boolean; message: string }>(`/api/pots/${selectedPot.id}/pump`, { pumpState: status });
      setNotice(response.message);
      await Promise.all([mutatePots(), mutateLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue pump command.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Smart Irrigation"
        subtitle="Select a garden and pot to manage its automatic watering, manual pump commands, and threshold."
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Garden</span>
            <select
              value={gardenId}
              onChange={(event) => setGardenId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Select a garden…</option>
              {(gardens ?? []).map((garden) => (
                <option key={garden.id} value={garden.id}>{garden.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Pot</span>
            <select
              value={potId}
              onChange={(event) => { setPotId(event.target.value); setOnThresholdDraft(null); setOffThresholdDraft(null); setNotice(""); }}
              disabled={!gardenId || !pots?.length}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-900"
            >
              {!pots?.length ? <option value="">{gardenId ? "No pots in this garden" : "Select a garden first"}</option> : null}
              {(pots ?? []).map((pot) => (
                <option key={pot.id} value={pot.id}>{pot.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {selectedPot ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">Pump control</h3>
              <div className="mb-5 flex items-center gap-4">
                <span className={`grid h-16 w-16 place-items-center rounded-full text-white ${selectedPot.pumpState === "on" ? "bg-sky-500" : "bg-slate-400"}`}>
                  <Droplets size={28} />
                </span>
                <div>
                  <p className="text-2xl font-black">Confirmed pump {selectedPot.pumpState.toUpperCase()}</p>
                  <Badge tone={selectedPot.irrigationMode === "MANUAL" ? "amber" : "emerald"}>
                    {selectedPot.irrigationMode === "MANUAL" ? "Manual" : "Automatic"}
                  </Badge>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-slate-400">Soil moisture</p><p className="font-black">{selectedPot.currentMoisture == null ? "No reading" : `${selectedPot.currentMoisture}%`}</p></div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-slate-400">Reading status</p><p className="font-black">{selectedPot.moistureRecordedAt ? moistureIsStale ? "Stale" : new Date(selectedPot.moistureRecordedAt).toLocaleTimeString() : "Waiting"}</p></div>
              </div>
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Control mode</span>
                <select
                  value={selectedPot.irrigationMode}
                  disabled={busy}
                  onChange={(event) => updateConfig({ irrigationMode: event.target.value as Pot["irrigationMode"] })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="AUTO">Automatic</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy || selectedPot.irrigationMode !== "MANUAL"}
                  onClick={() => setPump("on")}
                  className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Power size={16} /> Manual Pump ON
                </button>
                <button
                  disabled={busy || selectedPot.irrigationMode !== "MANUAL"}
                  onClick={() => setPump("off")}
                  className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Power size={16} /> Manual Pump OFF
                </button>
              </div>
              {selectedPot.irrigationMode === "AUTO" ? <p className="mt-3 text-xs text-slate-500">Switch to Manual to send an on or off command.</p> : null}
              {selectedPot.latestCommand?.status === "FAILED" ? <p className="mt-3 text-sm font-bold text-rose-600">Device command failed: {selectedPot.latestCommand.error ?? "The device did not apply the pump command."}</p> : null}
              {selectedPot.latestCommand && ["PENDING", "SENT", "RETRYING"].includes(selectedPot.latestCommand.status) ? <p className="mt-3 text-xs text-sky-700 dark:text-sky-300">Requested {selectedPot.latestCommand.command === "PUMP_ON" ? "ON" : "OFF"} · {selectedPot.latestCommand.deliveryAcknowledgedAt ? "delivered; awaiting execution result" : selectedPot.latestCommand.status === "RETRYING" ? "retry scheduled" : "awaiting delivery"}. Confirmed state remains above.</p> : null}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">AUTO moisture thresholds</h3>
              <p className="mb-2 text-sm text-slate-500">
                Auto-irrigation starts for {selectedPot.label} when soil moisture falls to this level.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Pump ON at or below<input type="number" min={0} max={99} value={onThreshold} onChange={(event) => setOnThresholdDraft(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" /><span className="text-xs text-slate-500">{onThreshold}%</span></label>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Pump OFF at or above<input type="number" min={1} max={100} value={offThreshold} onChange={(event) => setOffThresholdDraft(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" /><span className="text-xs text-slate-500">{offThreshold}%</span></label>
              </div>
              {onThreshold >= offThreshold ? <p className="mt-2 text-xs font-bold text-rose-600">The OFF threshold must be greater than the ON threshold.</p> : <p className="mt-2 text-xs text-slate-500">Between these values, AUTO preserves the confirmed pump state.</p>}
              <button
                disabled={busy || onThreshold >= offThreshold || (onThreshold === selectedPot.moistureOnThreshold && offThreshold === selectedPot.moistureOffThreshold)}
                onClick={() => updateConfig({ moistureOnThreshold: onThreshold, moistureOffThreshold: offThreshold })}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Save thresholds for this pot
              </button>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Irrigation history — {selectedPot.label}</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(logs ?? []).map((log) => (
                  <div key={log.id} className="flex flex-col items-start gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        Pump {log.status.toUpperCase()} <span className="font-medium text-slate-400">· {log.mode}</span>
                      </p>
                      <p className="break-words text-xs text-slate-500">{log.reason}</p>
                    </div>
                    <span className="break-words text-xs text-slate-400">{new Date(log.startedAt).toLocaleString()}</span>
                  </div>
                ))}
                {logs && logs.length === 0 ? <p className="py-2 text-sm text-slate-400">No irrigation events for this pot yet.</p> : null}
              </div>
            </Card>
          </div>
        </>
      ) : gardenId && pots ? (
        <Card><p className="text-sm text-slate-400">Add a pot to this garden before configuring irrigation.</p></Card>
      ) : gardenId ? (
        <Card><p className="text-sm text-slate-400">Loading irrigation data…</p></Card>
      ) : (
        <Card><p className="text-sm text-slate-400">Select a garden and pot to configure irrigation.</p></Card>
      )}
      {error ? <p className="mt-4 text-sm font-bold text-rose-600">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm font-medium text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">{notice}</p> : null}
    </div>
  );
}
