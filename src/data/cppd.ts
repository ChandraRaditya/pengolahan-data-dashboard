import { CPPD_CSV } from "./cppd-raw";

export type CppdRow = {
  tahun: number;
  bulan: string; // raw label e.g. "31 Januari 2025"
  monthIndex: number; // 0..11
  monthName: string; // "Januari"
  monthShort: string; // "Jan"
  periodKey: string; // "2025-01"
  periodLabel: string; // "Jan 2025"
  kodeWilayah: string;
  wilayah: string;
  pulau: PulauKey;
  cppd: number;
};

export type PulauKey =
  | "Sumatera"
  | "Jawa"
  | "Bali & Nusa Tenggara"
  | "Kalimantan"
  | "Sulawesi"
  | "Maluku & Papua";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const PULAU_LOOKUP: Record<string, PulauKey> = {
  "11": "Sumatera",
  "12": "Sumatera",
  "13": "Sumatera",
  "14": "Sumatera",
  "15": "Sumatera",
  "16": "Sumatera",
  "17": "Sumatera",
  "18": "Sumatera",
  "19": "Sumatera",
  "21": "Sumatera",
  "31": "Jawa",
  "32": "Jawa",
  "33": "Jawa",
  "34": "Jawa",
  "35": "Jawa",
  "36": "Jawa",
  "51": "Bali & Nusa Tenggara",
  "52": "Bali & Nusa Tenggara",
  "53": "Bali & Nusa Tenggara",
  "61": "Kalimantan",
  "62": "Kalimantan",
  "63": "Kalimantan",
  "64": "Kalimantan",
  "65": "Kalimantan",
  "71": "Sulawesi",
  "72": "Sulawesi",
  "73": "Sulawesi",
  "74": "Sulawesi",
  "75": "Sulawesi",
  "76": "Sulawesi",
  "81": "Maluku & Papua",
  "82": "Maluku & Papua",
  "91": "Maluku & Papua",
  "92": "Maluku & Papua",
  "93": "Maluku & Papua",
  "94": "Maluku & Papua",
  "95": "Maluku & Papua",
  "96": "Maluku & Papua",
};

// Minimal CSV parser that handles double-quoted fields.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        // skip
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseIndoNumber(value: string): number {
  // Indonesian style: "2.529,51" or "2529,51" -> 2529.51
  const cleaned = value.replace(/\./g, "").replace(/,/g, ".").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseBulan(label: string): { monthIndex: number; tahun: number } {
  // example: "31 Januari 2025"
  const parts = label.trim().split(/\s+/);
  const monthName = parts[1];
  const tahun = Number.parseInt(parts[2] ?? "0", 10);
  const monthIndex = MONTH_NAMES.indexOf(monthName);
  return { monthIndex, tahun };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

let cached: CppdRow[] | null = null;

export function getAllRows(): CppdRow[] {
  if (cached) return cached;
  const rows = parseCsv(CPPD_CSV);
  const [, ...body] = rows;
  const result: CppdRow[] = [];
  for (const r of body) {
    if (r.length < 5) continue;
    const tahunStr = r[0];
    const bulan = r[1];
    const kode = r[2];
    const wilayah = r[3];
    const cppdStr = r[4];
    if (!tahunStr || !bulan || !kode || !wilayah) continue;
    const { monthIndex, tahun } = parseBulan(bulan);
    if (monthIndex < 0) continue;
    const pulau = PULAU_LOOKUP[kode] ?? "Sumatera";
    result.push({
      tahun,
      bulan,
      monthIndex,
      monthName: MONTH_NAMES[monthIndex],
      monthShort: MONTH_SHORT[monthIndex],
      periodKey: `${tahun}-${pad2(monthIndex + 1)}`,
      periodLabel: `${MONTH_SHORT[monthIndex]} ${tahun}`,
      kodeWilayah: kode,
      wilayah,
      pulau,
      cppd: parseIndoNumber(cppdStr),
    });
  }
  cached = result;
  return result;
}

export type Period = { key: string; label: string; tahun: number; monthIndex: number };

export function getPeriods(): Period[] {
  const map = new Map<string, Period>();
  for (const r of getAllRows()) {
    if (!map.has(r.periodKey)) {
      map.set(r.periodKey, {
        key: r.periodKey,
        label: r.periodLabel,
        tahun: r.tahun,
        monthIndex: r.monthIndex,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function getRowsByPeriod(periodKey: string): CppdRow[] {
  return getAllRows().filter((r) => r.periodKey === periodKey);
}

export function getMonthlyTotals(): Array<{
  periodKey: string;
  periodLabel: string;
  total: number;
  jumlahProvinsi: number;
  jumlahProvinsiAktif: number;
}> {
  const periods = getPeriods();
  return periods.map((p) => {
    const rows = getRowsByPeriod(p.key);
    const total = rows.reduce((acc, r) => acc + r.cppd, 0);
    const jumlahProvinsiAktif = rows.filter((r) => r.cppd > 0).length;
    return {
      periodKey: p.key,
      periodLabel: p.label,
      total,
      jumlahProvinsi: rows.length,
      jumlahProvinsiAktif,
    };
  });
}

export function getTotalsByPulau(periodKey: string): Array<{
  pulau: PulauKey;
  total: number;
}> {
  const rows = getRowsByPeriod(periodKey);
  const map = new Map<PulauKey, number>();
  for (const r of rows) {
    map.set(r.pulau, (map.get(r.pulau) ?? 0) + r.cppd);
  }
  const order: PulauKey[] = [
    "Sumatera",
    "Jawa",
    "Bali & Nusa Tenggara",
    "Kalimantan",
    "Sulawesi",
    "Maluku & Papua",
  ];
  return order.map((pulau) => ({ pulau, total: map.get(pulau) ?? 0 }));
}

export function getMonthlyByPulau(): Array<
  Record<string, string | number> & { periodLabel: string }
> {
  const periods = getPeriods();
  const order: PulauKey[] = [
    "Sumatera",
    "Jawa",
    "Bali & Nusa Tenggara",
    "Kalimantan",
    "Sulawesi",
    "Maluku & Papua",
  ];
  return periods.map((p) => {
    const rows = getRowsByPeriod(p.key);
    const sums = new Map<PulauKey, number>();
    for (const r of rows) {
      sums.set(r.pulau, (sums.get(r.pulau) ?? 0) + r.cppd);
    }
    const out: Record<string, string | number> & { periodLabel: string } = {
      periodLabel: p.label,
    };
    for (const k of order) {
      out[k] = Math.round((sums.get(k) ?? 0) * 100) / 100;
    }
    return out;
  });
}

export function getTopProvinces(
  periodKey: string,
  topN = 10,
): Array<{ wilayah: string; cppd: number; pulau: PulauKey }> {
  return getRowsByPeriod(periodKey)
    .filter((r) => r.cppd > 0)
    .sort((a, b) => b.cppd - a.cppd)
    .slice(0, topN)
    .map((r) => ({ wilayah: r.wilayah, cppd: r.cppd, pulau: r.pulau }));
}

export function getProvinceTimeline(
  wilayah: string,
): Array<{ periodKey: string; periodLabel: string; cppd: number }> {
  return getAllRows()
    .filter((r) => r.wilayah === wilayah)
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
    .map((r) => ({
      periodKey: r.periodKey,
      periodLabel: r.periodLabel,
      cppd: r.cppd,
    }));
}

export function getAllProvinces(): string[] {
  const set = new Set<string>();
  for (const r of getAllRows()) set.add(r.wilayah);
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

export const PULAU_ORDER: PulauKey[] = [
  "Sumatera",
  "Jawa",
  "Bali & Nusa Tenggara",
  "Kalimantan",
  "Sulawesi",
  "Maluku & Papua",
];

export const PULAU_COLORS: Record<PulauKey, string> = {
  Sumatera: "#34d399", // emerald-400
  Jawa: "#fbbf24", // amber-400
  "Bali & Nusa Tenggara": "#f472b6", // pink-400
  Kalimantan: "#60a5fa", // blue-400
  Sulawesi: "#c084fc", // purple-400
  "Maluku & Papua": "#fb923c", // orange-400
};
