"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CppdRow,
  Period,
  PulauKey,
} from "@/data/cppd";
import { PULAU_COLORS, PULAU_ORDER } from "@/data/cppd";

type MonthlyTotal = {
  periodKey: string;
  periodLabel: string;
  total: number;
  jumlahProvinsi: number;
  jumlahProvinsiAktif: number;
};

type PulauTotal = { pulau: PulauKey; total: number };

type TopProvince = { wilayah: string; cppd: number; pulau: PulauKey };

type MonthlyByPulauRow = Record<string, string | number> & {
  periodLabel: string;
};

type ProvinceTimelinePoint = {
  periodKey: string;
  periodLabel: string;
  cppd: number;
};

type Props = {
  periods: Period[];
  monthlyTotals: MonthlyTotal[];
  monthlyByPulau: MonthlyByPulauRow[];
  allProvinces: string[];
  rowsByPeriod: Record<string, CppdRow[]>;
  totalsByPulauByPeriod: Record<string, PulauTotal[]>;
  topByPeriod: Record<string, TopProvince[]>;
  timelineByProvince: Record<string, ProvinceTimelinePoint[]>;
};

const NUMBER_ID = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});
const NUMBER_ID_INT = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

function formatTon(n: number): string {
  return `${NUMBER_ID.format(n)} ton`;
}

function formatTonShort(n: number): string {
  if (n >= 1000) return `${NUMBER_ID.format(n / 1000)}k`;
  return NUMBER_ID.format(n);
}

export default function Dashboard(props: Props) {
  const {
    periods,
    monthlyTotals,
    monthlyByPulau,
    allProvinces,
    rowsByPeriod,
    totalsByPulauByPeriod,
    topByPeriod,
    timelineByProvince,
  } = props;

  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    periods[periods.length - 1]?.key ?? "",
  );
  const [selectedProvince, setSelectedProvince] = useState<string>("Jawa Barat");

  const currentMonthly = monthlyTotals.find(
    (m) => m.periodKey === selectedPeriod,
  );
  const previousIndex = periods.findIndex((p) => p.key === selectedPeriod) - 1;
  const previousMonthly =
    previousIndex >= 0 ? monthlyTotals[previousIndex] : undefined;

  const totalNasional = currentMonthly?.total ?? 0;
  const totalPrev = previousMonthly?.total ?? 0;
  const deltaPct =
    totalPrev > 0 ? ((totalNasional - totalPrev) / totalPrev) * 100 : 0;
  const provinsiAktif = currentMonthly?.jumlahProvinsiAktif ?? 0;
  const totalProvinsi = currentMonthly?.jumlahProvinsi ?? 0;

  const sortedRows = useMemo(() => {
    const rows = rowsByPeriod[selectedPeriod] ?? [];
    return [...rows].sort((a, b) => b.cppd - a.cppd);
  }, [rowsByPeriod, selectedPeriod]);

  const tertinggi = sortedRows[0];
  const provinsiNol = sortedRows.filter((r) => r.cppd === 0).length;

  const pulauData = totalsByPulauByPeriod[selectedPeriod] ?? [];
  const pulauChartData = pulauData
    .filter((p) => p.total > 0)
    .map((p) => ({ name: p.pulau, value: Math.round(p.total * 100) / 100 }));
  const totalPulau = pulauChartData.reduce((a, b) => a + b.value, 0);

  const topProvinces = topByPeriod[selectedPeriod] ?? [];

  const provinceTimeline = timelineByProvince[selectedProvince] ?? [];
  const provinceTotal = provinceTimeline.reduce((a, b) => a + b.cppd, 0);
  const provinceLatest = provinceTimeline[provinceTimeline.length - 1]?.cppd ?? 0;
  const provincePeak = provinceTimeline.reduce(
    (max, p) => (p.cppd > max ? p.cppd : max),
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10">
        {/* HEADER */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Pengolahan Data &middot; Pelatihan Prakom
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Dashboard Cadangan Pangan
              <span className="text-emerald-400"> Pemerintah Daerah</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Pemantauan stok CPPD (dalam ton) per provinsi, periode Januari
              2025 sampai Januari 2026. Data bersumber dari laporan bulanan
              cadangan pangan daerah.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <PeriodSelector
              periods={periods}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
            />
          </div>
        </header>

        {/* KPI CARDS */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total CPPD Nasional"
            value={formatTon(totalNasional)}
            sub={
              previousMonthly
                ? `${deltaPct >= 0 ? "↑" : "↓"} ${NUMBER_ID.format(
                    Math.abs(deltaPct),
                  )}% vs ${previousMonthly.periodLabel}`
                : "Periode awal"
            }
            tone={deltaPct >= 0 ? "up" : "down"}
            accent="emerald"
          />
          <KpiCard
            label="Provinsi Memiliki Stok"
            value={`${provinsiAktif} / ${totalProvinsi}`}
            sub={`${NUMBER_ID.format(
              (provinsiAktif / Math.max(totalProvinsi, 1)) * 100,
            )}% provinsi aktif`}
            accent="amber"
          />
          <KpiCard
            label="Stok Tertinggi"
            value={tertinggi ? tertinggi.wilayah : "-"}
            sub={tertinggi ? formatTon(tertinggi.cppd) : ""}
            accent="rose"
          />
          <KpiCard
            label="Provinsi Stok 0 Ton"
            value={`${provinsiNol} provinsi`}
            sub="Perlu mendapat perhatian"
            accent="sky"
          />
        </section>

        {/* MAIN GRID */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* National trend */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Tren Stok CPPD Nasional"
              subtitle="Total stok seluruh provinsi per akhir bulan"
            />
            <ChartFrame className="h-72">
                <AreaChart
                  data={monthlyTotals}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="periodLabel"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    tickFormatter={(v: number) => formatTonShort(v)}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Nasional"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fill="url(#gradTotal)"
                    dot={{ fill: "#34d399", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
            </ChartFrame>
          </Card>

          {/* Distribution by Pulau */}
          <Card>
            <CardHeader
              title="Distribusi per Pulau"
              subtitle={`Periode ${currentMonthly?.periodLabel ?? ""}`}
            />
            <div className="flex h-72 items-center">
              <div className="relative h-full w-1/2">
                <ChartFrame className="h-full w-full">
                  <PieChart>
                    <Pie
                      data={pulauChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pulauChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PULAU_COLORS[entry.name as PulauKey]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip suffix=" ton" />} />
                  </PieChart>
                </ChartFrame>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="text-base font-semibold text-white">
                    {formatTonShort(totalPulau)}
                  </span>
                  <span className="text-[10px] text-slate-500">ton</span>
                </div>
              </div>
              <ul className="flex w-1/2 flex-col gap-2 pl-2">
                {PULAU_ORDER.map((p) => {
                  const item = pulauData.find((d) => d.pulau === p);
                  const value = item?.total ?? 0;
                  const pct = totalPulau > 0 ? (value / totalPulau) * 100 : 0;
                  return (
                    <li key={p} className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-block size-2.5 rounded-sm"
                        style={{ backgroundColor: PULAU_COLORS[p] }}
                      />
                      <span className="flex-1 truncate text-slate-300">{p}</span>
                      <span className="font-medium text-white">
                        {NUMBER_ID.format(pct)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Top 10 provinces */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Top 10 Provinsi dengan Stok Tertinggi"
              subtitle={`Periode ${currentMonthly?.periodLabel ?? ""}`}
            />
            <ChartFrame className="h-80">
                <BarChart
                  data={topProvinces}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="#334155"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    tickFormatter={(v: number) => formatTonShort(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="wilayah"
                    stroke="#cbd5e1"
                    fontSize={12}
                    width={140}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <Tooltip content={<DarkTooltip suffix=" ton" />} />
                  <Bar dataKey="cppd" radius={[0, 8, 8, 0]} name="CPPD">
                    {topProvinces.map((entry) => (
                      <Cell
                        key={entry.wilayah}
                        fill={PULAU_COLORS[entry.pulau]}
                      />
                    ))}
                  </Bar>
                </BarChart>
            </ChartFrame>
          </Card>

          {/* Per province explorer */}
          <Card>
            <CardHeader
              title="Telusuri per Provinsi"
              subtitle="Pergerakan stok sepanjang periode"
            />
            <div className="mb-4">
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/60"
              >
                {allProvinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <MiniStat label="Stok terkini" value={formatTonShort(provinceLatest)} />
              <MiniStat label="Tertinggi" value={formatTonShort(provincePeak)} />
              <MiniStat
                label="Rata-rata"
                value={formatTonShort(
                  provinceTimeline.length
                    ? provinceTotal / provinceTimeline.length
                    : 0,
                )}
              />
            </div>
            <ChartFrame className="mt-3 h-44">
                <LineChart
                  data={provinceTimeline}
                  margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="periodLabel"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    tickFormatter={(v: number) => formatTonShort(v)}
                  />
                  <Tooltip content={<DarkTooltip suffix=" ton" />} />
                  <Line
                    type="monotone"
                    dataKey="cppd"
                    stroke="#fbbf24"
                    strokeWidth={2.5}
                    dot={{ fill: "#fbbf24", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
            </ChartFrame>
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Stacked area per pulau */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Komposisi Stok per Pulau"
              subtitle="Tren bulanan, ditumpuk per pulau"
            />
            <ChartFrame className="h-80">
                <AreaChart
                  data={monthlyByPulau}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="periodLabel"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    tickFormatter={(v: number) => formatTonShort(v)}
                  />
                  <Tooltip content={<DarkTooltip suffix=" ton" />} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }}
                  />
                  {PULAU_ORDER.map((p) => (
                    <Area
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stackId="1"
                      stroke={PULAU_COLORS[p]}
                      fill={PULAU_COLORS[p]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
            </ChartFrame>
          </Card>

          {/* Provinces list with progress bars */}
          <Card>
            <CardHeader
              title="Stok Seluruh Provinsi"
              subtitle={`Periode ${currentMonthly?.periodLabel ?? ""}`}
            />
            <div className="-mr-2 max-h-80 overflow-y-auto pr-2">
              <ul className="space-y-2">
                {sortedRows.map((r) => {
                  const max = sortedRows[0]?.cppd ?? 1;
                  const pct = (r.cppd / max) * 100;
                  return (
                    <li key={r.kodeWilayah} className="text-xs">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-200">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: PULAU_COLORS[r.pulau] }}
                          />
                          {r.wilayah}
                        </span>
                        <span className="font-medium text-white">
                          {NUMBER_ID.format(r.cppd)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PULAU_COLORS[r.pulau],
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </section>

        {/* INSIGHT */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardHeader
              title="Catatan & Insight"
              subtitle="Ringkasan analisis data CPPD"
            />
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <Insight
                title="Konsentrasi pada Jawa Barat"
                desc="Jawa Barat secara konsisten menjadi penyumbang stok terbesar dengan rata-rata di atas 2.000 ton per bulan. Dominan terhadap total nasional."
              />
              <Insight
                title="Provinsi belum memiliki CPPD"
                desc="DKI Jakarta dan beberapa provinsi di Papua tercatat 0 ton sepanjang tahun. Perlu intervensi kebijakan untuk pembentukan stok."
              />
              <Insight
                title="Lonjakan akhir tahun"
                desc="Tren naik signifikan terlihat pada Desember 2025 di Jawa Barat, Kalimantan, dan beberapa provinsi Sumatera, mengindikasikan penambahan stok pra-Nataru."
              />
            </div>
          </Card>
        </section>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Sumber: laporan CPPD bulanan per provinsi (data internal pelatihan).
          Satuan ton, periode Jan 2025 - Jan 2026.
        </footer>
      </div>
    </div>
  );
}

function PeriodSelector({
  periods,
  value,
  onChange,
}: {
  periods: Period[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm backdrop-blur">
      <span className="text-slate-300">Periode</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white outline-none"
      >
        {periods.map((p) => (
          <option key={p.key} value={p.key} className="bg-slate-900">
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function emptySubscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function ChartFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isClient = useIsClient();
  return (
    <div className={className}>
      {isClient ? (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle ? (
        <p className="text-xs text-slate-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

const ACCENTS: Record<string, { ring: string; text: string; chip: string }> = {
  emerald: {
    ring: "ring-emerald-400/30",
    text: "text-emerald-300",
    chip: "bg-emerald-400/10 text-emerald-300",
  },
  amber: {
    ring: "ring-amber-400/30",
    text: "text-amber-300",
    chip: "bg-amber-400/10 text-amber-300",
  },
  rose: {
    ring: "ring-rose-400/30",
    text: "text-rose-300",
    chip: "bg-rose-400/10 text-rose-300",
  },
  sky: {
    ring: "ring-sky-400/30",
    text: "text-sky-300",
    chip: "bg-sky-400/10 text-sky-300",
  },
};

function KpiCard({
  label,
  value,
  sub,
  tone,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
  accent: keyof typeof ACCENTS;
}) {
  const a = ACCENTS[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur ring-1 ${a.ring}`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-2xl ${a.chip}`}
      />
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {sub ? (
        <p
          className={`mt-1 text-xs ${
            tone === "down" ? "text-rose-300" : a.text
          }`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Insight({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="mb-1 text-sm font-semibold text-white">{title}</p>
      <p className="text-xs leading-relaxed text-slate-300">{desc}</p>
    </div>
  );
}

type TooltipPayloadEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: unknown;
};

function DarkTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined ? (
        <p className="mb-1 font-medium text-slate-200">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, i) => (
          <li
            key={`${entry.name ?? i}`}
            className="flex items-center gap-2 text-slate-300"
          >
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="flex-1">{entry.name}</span>
            <span className="font-semibold text-white">
              {typeof entry.value === "number"
                ? NUMBER_ID_INT.format(entry.value)
                : entry.value}
              {suffix ?? ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
