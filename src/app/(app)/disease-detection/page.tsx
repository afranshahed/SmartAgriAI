"use client";

// Uploads are bound to Garden -> Pot -> Plant before they reach FastAPI.
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Upload } from "lucide-react";
import { Badge, Card, PageHeader, severityTone } from "@/components/ui";

interface Garden { id: string; name: string }
interface Pot { id: string; label: string; plant: { id: string; commonName: string } | null }
interface Prediction {
  disease: string; crop: string; confidence: number; severity: string; symptoms: string[];
  treatment: { immediate: string[]; organic: string[]; chemical: string[]; prevention: string[] };
  recommendation: string; modelVersion: string;
}
interface HistoryRow {
  id: string; predictedDisease: string; confidence: number; createdAt: string; imageUrl: string;
}

export default function DiseaseDetectionPage() {
  const [gardenId, setGardenId] = useState("");
  const [potId, setPotId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: gardens } = useSWR<Garden[]>("/api/gardens");
  const { data: pots } = useSWR<Pot[]>(gardenId ? `/api/pots?gardenId=${gardenId}` : null);
  const selectedPot = pots?.find((pot) => pot.id === potId);
  const plant = selectedPot?.plant ?? null;
  const { data: reports, mutate } = useSWR<HistoryRow[]>(
    plant ? `/api/disease-detection/reports?plantId=${plant.id}` : null,
  );

  useEffect(() => {
    if (!gardenId && gardens?.[0]) setGardenId(gardens[0].id);
  }, [gardenId, gardens]);

  function chooseGarden(nextGardenId: string) {
    setGardenId(nextGardenId);
    setPotId("");
    setResult(null);
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setResult(null);
    setError("");
  }

  async function analyze() {
    if (!file || !gardenId || !potId || !plant) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("gardenId", gardenId);
      form.append("potId", potId);
      // The server derives and verifies this again from potId.
      form.append("plantId", plant.id);
      const response = await fetch("/api/disease-detection/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.prediction);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Leaf Disease Detection" subtitle="Select a plant, then send its leaf image to the existing AI model." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Garden" value={gardenId} onChange={chooseGarden} disabled={!gardens?.length}>
              <option value="">Select garden</option>
              {(gardens ?? []).map((garden) => <option key={garden.id} value={garden.id}>{garden.name}</option>)}
            </Select>
            <Select label="Pot" value={potId} onChange={setPotId} disabled={!gardenId}>
              <option value="">Select pot</option>
              {(pots ?? []).map((pot) => <option key={pot.id} value={pot.id}>{pot.label}{pot.plant ? "" : " (no plant)"}</option>)}
            </Select>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
            <span className="font-bold">Plant: </span>{plant?.commonName ?? "Select a pot with an assigned plant"}
          </div>
          <label className="mt-4 flex w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="leaf preview" className="h-auto max-h-56 max-w-full rounded-lg object-contain" />
            ) : <><Upload className="text-slate-400" size={32} /><span className="text-sm font-bold text-slate-600 dark:text-slate-300">Click to upload a leaf image</span></>}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
          </label>
          <button onClick={analyze} disabled={!file || !plant || loading} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "Analyzing..." : "Analyze leaf"}
          </button>
          {error ? <p className="mt-3 text-sm font-bold text-rose-600">{error}</p> : null}
        </Card>
        <Card>
          {result ? <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-xl font-black text-slate-950 dark:text-white">{result.disease}</h3><Badge tone={severityTone(result.severity)}>{result.severity}</Badge></div>
            <p className="text-sm font-medium text-slate-500">{result.crop} · {Math.round(result.confidence * 100)}% confidence · <span className="text-xs">{result.modelVersion}</span></p>
            {result.symptoms.length > 0 ? <div><p className="text-xs font-black uppercase text-slate-400">Symptoms</p><p className="text-sm text-slate-700 dark:text-slate-300">{result.symptoms.join(", ")}</p></div> : null}
            <TreatmentBlock title="Immediate" items={result.treatment.immediate} />
            <TreatmentBlock title="Organic" items={result.treatment.organic} />
            <TreatmentBlock title="Chemical" items={result.treatment.chemical} />
            <TreatmentBlock title="Prevention" items={result.treatment.prevention} />
          </div> : <div className="grid h-full place-items-center text-sm text-slate-400">Diagnosis will appear here</div>}
        </Card>
      </div>
      <div className="mt-6"><Card><h3 className="mb-1 text-sm font-black uppercase tracking-wide text-slate-500">Plant disease history</h3><p className="mb-3 text-xs text-slate-400">{plant ? `Previous predictions for ${plant.commonName}` : "Select a pot to view its plant history."}</p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{(reports ?? []).map((report) => <div key={report.id} className="flex items-center gap-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={report.imageUrl} alt="diagnosed leaf" className="h-10 w-10 rounded object-cover" />
          <div className="flex-1"><p className="text-sm font-bold">{report.predictedDisease}</p><p className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleString()}</p></div><Badge tone="slate">{Math.round(report.confidence * 100)}%</Badge>
        </div>)}{plant && reports?.length === 0 ? <p className="py-2 text-sm text-slate-400">No predictions for this plant yet.</p> : null}</div>
      </Card></div>
    </div>
  );
}

function Select({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700">{children}</select></label>;
}

function TreatmentBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return <div><p className="text-xs font-black uppercase text-slate-400">{title}</p><ul className="ml-4 list-disc text-sm text-slate-700 dark:text-slate-300">{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>;
}
