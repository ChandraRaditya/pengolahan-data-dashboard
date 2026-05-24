import Dashboard from "@/components/Dashboard";
import {
  getAllProvinces,
  getMonthlyByPulau,
  getMonthlyTotals,
  getPeriods,
  getProvinceTimeline,
  getRowsByPeriod,
  getTopProvinces,
  getTotalsByPulau,
} from "@/data/cppd";

export default function Home() {
  const periods = getPeriods();
  const monthlyTotals = getMonthlyTotals();
  const monthlyByPulau = getMonthlyByPulau();
  const allProvinces = getAllProvinces();

  const rowsByPeriod = Object.fromEntries(
    periods.map((p) => [p.key, getRowsByPeriod(p.key)]),
  );
  const totalsByPulauByPeriod = Object.fromEntries(
    periods.map((p) => [p.key, getTotalsByPulau(p.key)]),
  );
  const topByPeriod = Object.fromEntries(
    periods.map((p) => [p.key, getTopProvinces(p.key, 10)]),
  );
  const timelineByProvince = Object.fromEntries(
    allProvinces.map((p) => [p, getProvinceTimeline(p)]),
  );

  return (
    <Dashboard
      periods={periods}
      monthlyTotals={monthlyTotals}
      monthlyByPulau={monthlyByPulau}
      allProvinces={allProvinces}
      rowsByPeriod={rowsByPeriod}
      totalsByPulauByPeriod={totalsByPulauByPeriod}
      topByPeriod={topByPeriod}
      timelineByProvince={timelineByProvince}
    />
  );
}
