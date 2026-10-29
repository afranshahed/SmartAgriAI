"use client";

import { BellRing, BrainCircuit, CloudSun, Droplets, Flower2, Leaf, LineChart, Radio } from "lucide-react";
import { useState, type ComponentType } from "react";

type Feature = { title: string; summary: string; detail: string; Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean }> };

const features: Feature[] = [
  { title: "AI disease detection", summary: "Analyze a leaf image", detail: "Associate a leaf image with a plant to review a model prediction and the available treatment guidance.", Icon: Leaf },
  { title: "Smart irrigation", summary: "Configure each pot", detail: "Monitor moisture thresholds, choose automatic or manual control, and review irrigation activity per pot.", Icon: Droplets },
  { title: "IoT monitoring", summary: "Follow connected readings", detail: "View supported soil and environmental readings received from connected devices.", Icon: Radio },
  { title: "Gardens & plants", summary: "Keep growing spaces organized", detail: "Set up gardens, pots, and plants so monitoring and care stay tied to the right place.", Icon: Flower2 },
  { title: "Analytics & history", summary: "Explore stored records", detail: "Review sensor and irrigation history for a selected pot, with supported spreadsheet exports.", Icon: LineChart },
  { title: "Weather insights", summary: "Add location context", detail: "See available weather information associated with a garden location alongside its conditions.", Icon: CloudSun },
  { title: "Health & recommendations", summary: "Make sense of signals", detail: "Use the existing health score and rules-based recommendations to investigate plant conditions.", Icon: BrainCircuit },
  { title: "Notifications", summary: "Stay informed", detail: "Surface relevant system and device notifications in one place, with delivery history where configured.", Icon: BellRing },
];

export function FeatureShowcase() {
  const [selected, setSelected] = useState(0);
  const feature = features[selected];
  const PreviewIcon = feature.Icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-stretch">
      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((item, index) => {
          const Icon = item.Icon;
          const active = index === selected;
          return <button key={item.title} type="button" onClick={() => setSelected(index)} aria-pressed={active} className={`group min-h-32 rounded-2xl border p-5 text-left transition motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${active ? "border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40" : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900"}`}>
            <span className={`mb-4 inline-flex rounded-xl p-2.5 ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-300"}`}><Icon size={19} aria-hidden="true" /></span>
            <span className="block text-sm font-black text-slate-950 dark:text-white">{item.title}</span>
            <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">{item.summary}</span>
          </button>;
        })}
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-2xl shadow-slate-950/15 sm:p-9">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <div className="flex items-center justify-between"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-200">Platform capability</span><PreviewIcon size={28} className="text-emerald-300" aria-hidden="true" /></div>
            <h3 className="mt-8 text-3xl font-black tracking-tight">{feature.title}</h3>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-300">{feature.detail}</p>
          </div>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Designed around your garden</p>
            <div className="mt-4 flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="text-sm font-semibold text-slate-200">Connected workflows, organized in one workspace</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
