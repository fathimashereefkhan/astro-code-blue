"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SIMULATED_HEALTH_DATA,
  type AssessmentRecord,
} from "../data/health-data";

import {
  ASSESSMENT_STORAGE_KEY,
  parseStoredAssessments,
  toAssessmentRecord,
} from "../data/health-assessments";

type TimeRange = "24h" | "7d" | "30d" | "all";
type MetricField = "sleepDuration" | "heartRate" | "oxygenSaturation" | "waterIntake";
type TrendField =
  | MetricField
  | "systolic"
  | "diastolic"
  | "bodyTemperature";
type DisplayRecord = {
  record: AssessmentRecord;
  sampleDay: string | null;
  timestamp: number | null;
  dateLabel: string;
  chartLabel: string;
  key: string;
};
type TrendPoint = Record<TrendField, number | null> & {
  dateLabel: string;
};
type ChartSeries = {
  dataKey: TrendField;
  name: string;
  color: string;
  unit: string;
};

const timeRanges: { id: TimeRange; label: string; duration: number | null }[] = [
  { id: "24h", label: "Last 24 hours", duration: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "Last 7 days", duration: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "Last 30 days", duration: 30 * 24 * 60 * 60 * 1000 },
  { id: "all", label: "All records", duration: null },
];

const summaryMetrics: { field: MetricField; label: string; unit: string; glyph: string }[] = [
  { field: "sleepDuration", label: "Sleep duration", unit: "HRS", glyph: "◷" },
  { field: "heartRate", label: "Heart rate", unit: "BPM", glyph: "♡" },
  { field: "oxygenSaturation", label: "Oxygen saturation", unit: "%", glyph: "◉" },
  { field: "waterIntake", label: "Water intake", unit: "L", glyph: "◌" },
];

const chartDefinitions: {
  title: string;
  description: string;
  unit: string;
  series: ChartSeries[];
}[] = [
  {
    title: "Sleep duration",
    description: "Recorded hours of sleep",
    unit: "HOURS",
    series: [{ dataKey: "sleepDuration", name: "Sleep", color: "#00d4ff", unit: "hrs" }],
  },
  {
    title: "Heart rate",
    description: "Recorded heart rate",
    unit: "BPM",
    series: [{ dataKey: "heartRate", name: "Heart rate", color: "#168bff", unit: "BPM" }],
  },
  {
    title: "Oxygen saturation",
    description: "Recorded oxygen saturation",
    unit: "%",
    series: [{ dataKey: "oxygenSaturation", name: "Oxygen saturation", color: "#00d4ff", unit: "%" }],
  },
  {
    title: "Water intake",
    description: "Recorded daily water intake",
    unit: "LITRES",
    series: [{ dataKey: "waterIntake", name: "Water intake", color: "#39bdf8", unit: "L" }],
  },
  {
    title: "Blood pressure",
    description: "Recorded systolic and diastolic measurements",
    unit: "MMHG",
    series: [
      { dataKey: "systolic", name: "Systolic", color: "#00d4ff", unit: "mmHg" },
      { dataKey: "diastolic", name: "Diastolic", color: "#168bff", unit: "mmHg" },
    ],
  },
  {
    title: "Body temperature",
    description: "Recorded body temperature",
    unit: "°C",
    series: [{ dataKey: "bodyTemperature", name: "Body temperature", color: "#39bdf8", unit: "°C" }],
  },
];

function parseRecordDate(record: AssessmentRecord): Date | null {
  const rawDate = record.assessmentDate?.trim() || record.submittedAt.trim();
  if (!rawDate) return null;
  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRecordDate(record: AssessmentRecord, sampleDay: string | null) {
  if (sampleDay) return `${sampleDay} · SIMULATED`;
  const date = parseRecordDate(record);
  if (!date) return "Date not recorded";
  const options: Intl.DateTimeFormatOptions =
    record.assessmentDate?.includes("T") || !record.assessmentDate?.trim()
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatChartDate(record: AssessmentRecord, sampleDay: string | null) {
  if (sampleDay) return sampleDay;
  const date = parseRecordDate(record);
  if (!date) return "NO DATE";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function parseMeasurement(record: AssessmentRecord, field: TrendField): number | null {
  const rawValue = record[field].trim();
  if (!rawValue) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function makeDisplayRecord(
  record: AssessmentRecord,
  index: number,
  sampleDay: string | null = null,
): DisplayRecord {
  const date = parseRecordDate(record);
  return {
    record,
    sampleDay,
    timestamp: date?.getTime() ?? null,
    dateLabel: formatRecordDate(record, sampleDay),
    chartLabel: formatChartDate(record, sampleDay),
    key: `${record.submittedAt || record.assessmentDate || sampleDay || "assessment"}-${index}`,
  };
}

function HealthTrendChart({
  title,
  description,
  unit,
  data,
  series,
}: {
  title: string;
  description: string;
  unit: string;
  data: TrendPoint[];
  series: ChartSeries[];
}) {
  const hasMeasurements = data.some((point) =>
    series.some((item) => point[item.dataKey] !== null),
  );

  return (
    <article className="trend-chart-card">
      <header className="trend-chart-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{unit}</span>
      </header>
      {hasMeasurements ? (
        <div className="trend-chart-plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid stroke="rgba(146, 174, 202, 0.12)" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                axisLine={{ stroke: "rgba(146, 174, 202, 0.18)" }}
                tickLine={false}
                tick={{ fill: "#8295aa", fontSize: 10 }}
                minTickGap={18}
              />
              <YAxis
                domain={["auto", "auto"]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8295aa", fontSize: 10 }}
                width={46}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid rgba(0, 212, 255, 0.36)",
                  borderRadius: 6,
                  background: "rgba(4, 17, 34, 0.96)",
                  color: "#eff8ff",
                  fontSize: 11,
                }}
                labelStyle={{ color: "#75dff5" }}
                formatter={(value, name) => [`${value ?? "—"}`, name]}
              />
              {series.length > 1 && (
                <Legend
                  wrapperStyle={{ color: "#9badbf", fontSize: 10 }}
                  iconType="circle"
                  iconSize={7}
                />
              )}
              {series.map((item) => (
                <Line
                  key={item.dataKey}
                  type="monotone"
                  dataKey={item.dataKey}
                  name={item.name}
                  unit={item.unit}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={{ r: 2, fill: item.color, strokeWidth: 0 }}
                  activeDot={{ r: 4, stroke: "#dffaff", strokeWidth: 1 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="trend-chart-empty">No readings for this metric in the selected period.</div>
      )}
    </article>
  );
}


function getChangeDirection(change: string) {
  const normalized = change.toLowerCase();

  if (normalized.includes("increased")) {
    return "increased";
  }

  if (normalized.includes("decreased")) {
    return "decreased";
  }

  return "changed";
}


export default function HealthTrendsDashboard() {
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [period, setPeriod] = useState<TimeRange>("7d");
  const [isLoading, setIsLoading] = useState(true);
  const [invalidCount, setInvalidCount] = useState(0);
  const [storageError, setStorageError] = useState("");
  const [inspectedEntry, setInspectedEntry] = useState<DisplayRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  
const loadAssessments = useCallback(async () => {
  setIsLoading(true);

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/assessments"
    );

    if (!response.ok) {
      throw new Error("Could not retrieve assessments from the backend.");
    }

    const data: unknown = await response.json();

    // Validate the records using the existing assessment parser
    const parsed = parseStoredAssessments(
      JSON.stringify({
        version: 2,
        records: data,
      })
    );

    setRecords(parsed.records.map(toAssessmentRecord));
    setInvalidCount(parsed.invalidCount);
    setStorageError("");
  } catch (error) {
    console.error("Error loading assessments:", error);

    setRecords([]);
    setInvalidCount(0);
    setStorageError(
      "Could not load assessments from the backend. Please check your connection."
    );
  } finally {
    setIsLoading(false);
  }
}, []);


  useEffect(() => {
    const initialLoad = window.setTimeout(loadAssessments, 0);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ASSESSMENT_STORAGE_KEY || event.key === null) loadAssessments();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadAssessments();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", loadAssessments);
    window.addEventListener("pageshow", loadAssessments);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", loadAssessments);
      window.removeEventListener("pageshow", loadAssessments);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadAssessments]);

  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    const initialUpdate = window.setTimeout(updateTime, 0);
    const updateInterval = window.setInterval(updateTime, 60_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(updateInterval);
    };
  }, []);

  useEffect(() => {
    if (!inspectedEntry) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectedEntry(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectedEntry]);

  const hasSavedAssessments = records.length > 0;
  const allEntries = useMemo(() => {
    if (hasSavedAssessments) {
      return records.map((record, index) => makeDisplayRecord(record, index));
    }
    return SIMULATED_HEALTH_DATA.map((record, index) =>
      makeDisplayRecord(record, index, record.day),
    );
  }, [hasSavedAssessments, records]);

  const filteredEntries = useMemo(() => {
    if (!hasSavedAssessments) {
      const sampleCount = period === "24h" ? 1 : period === "7d" ? 7 : allEntries.length;
      return allEntries.slice(-sampleCount);
    }

    const sorted = [...allEntries].sort((a, b) => {
      if (a.timestamp === null) return b.timestamp === null ? 0 : -1;
      if (b.timestamp === null) return 1;
      return a.timestamp - b.timestamp;
    });
    const selectedRange = timeRanges.find((range) => range.id === period);
    if (!selectedRange?.duration) return sorted;
    if (currentTime === 0) return [];
    const now = currentTime;
    const cutoff = now - selectedRange.duration;
    return sorted.filter((entry) =>
      entry.timestamp !== null && entry.timestamp >= cutoff && entry.timestamp <= now,
    );
  }, [allEntries, currentTime, hasSavedAssessments, period]);

  const chartData = useMemo<TrendPoint[]>(() =>
    filteredEntries.map(({ record, chartLabel }) => ({
      dateLabel: chartLabel,
      sleepDuration: parseMeasurement(record, "sleepDuration"),
      heartRate: parseMeasurement(record, "heartRate"),
      oxygenSaturation: parseMeasurement(record, "oxygenSaturation"),
      waterIntake: parseMeasurement(record, "waterIntake"),
      systolic: parseMeasurement(record, "systolic"),
      diastolic: parseMeasurement(record, "diastolic"),
      bodyTemperature: parseMeasurement(record, "bodyTemperature"),
    })),
  [filteredEntries]);

  const latestMetricEntries = summaryMetrics.map((metric) => {
    const latest = [...filteredEntries].reverse().find((entry) =>
      parseMeasurement(entry.record, metric.field) !== null,
    );
    return { ...metric, entry: latest };
  });

  const latestAnalysisEntry = [...filteredEntries]
  .reverse()
  .find((entry) => entry.record.analysis != null);

const latestAnalysis = latestAnalysisEntry?.record.analysis;

  const simulated = !hasSavedAssessments;

  return (
    <main className="content health-trends-page">
      <div className="trends-shell">
        <header className="trends-page-heading">
          <div>
            <p className="trends-eyebrow"><span /> CREW SYSTEMS / HEALTH ANALYTICS</p>
            <h1>Health Trends</h1>
            <p>Assessment history and measurements across selected time periods.</p>
          </div>
          <span className={`trends-source${simulated ? " is-simulated" : ""}`}>
            <i /> {simulated ? "SIMULATED DATA" : "SAVED ASSESSMENTS"}
          </span>
        </header>

        {storageError && <p className="trends-notice" role="status">{storageError}</p>}
        {invalidCount > 0 && (
          <p className="trends-notice" role="status">
            {invalidCount} invalid assessment {invalidCount === 1 ? "record was" : "records were"} skipped.
          </p>
        )}

        <section className="trends-section" aria-labelledby="trends-overview-title">
          <div className="trends-section-heading">
            <div>
              <span className="trends-section-kicker">01 / CURRENT PERIOD</span>
              <h2 id="trends-overview-title">Health overview</h2>
            </div>
            <div className="trends-range-filter" aria-label="Filter health data by time period">
              {timeRanges.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  className={period === range.id ? "active" : ""}
                  aria-pressed={period === range.id}
                  onClick={() => setPeriod(range.id)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="trends-loading" role="status">
              <span className="trends-loader" /> Loading assessment history…
            </div>
          ) : (
            <div className="trends-metric-grid">
              {latestMetricEntries.map((metric, index) => (
                <article className="trends-metric-card" key={metric.field}>
                  <div className="trends-metric-top">
                    <span className="trends-metric-index">0{index + 1}</span>
                    <span className="trends-metric-glyph" aria-hidden="true">{metric.glyph}</span>
                    <span className="trends-metric-source">{metric.entry ? (simulated ? "SAMPLE" : "LATEST") : "NO READING"}</span>
                  </div>
                  <h3>{metric.label}</h3>
                  <p className="trends-metric-value">
                    {metric.entry
                      ? metric.entry.record[metric.field].trim() || "—"
                      : "—"}
                    <small> {metric.unit}</small>
                  </p>
                  <p className="trends-metric-date">
                    {metric.entry ? metric.entry.dateLabel : "No reading in this period"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

                {/* Assessment Analysis */}
        {!isLoading && !simulated && (
          <section className="trends-section analysis-panel">
            <div className="trends-section-heading">
              <div>
                <span className="trends-section-kicker">
                  AI / RULE-BASED ASSESSMENT
                </span>
                <h2>Assessment Analysis</h2>
                <p>
                  {latestAnalysisEntry
                    ? `Analysis from ${latestAnalysisEntry.dateLabel}`
                    : "No analysis available for this period"}
                </p>
              </div>
            </div>

            {latestAnalysis ? (
              <div className="analysis-content">
                <div className="analysis-group">
                  <h3>Insights</h3>
                  {latestAnalysis.insights.length > 0 ? (
                    <ul>
                      {latestAnalysis.insights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No insights were generated for this assessment.</p>
                  )}
                </div>

                <div className="analysis-group">
                  <h3>Historical Changes</h3>
                  {latestAnalysis.historical_changes.length > 0 ? (
                    <ul>
                      
{latestAnalysis.historical_changes.map((change, index) => {
  const direction = getChangeDirection(change);

  return (
    <li key={index} className={`analysis-change analysis-change-${direction}`}>
      <span className="analysis-change-indicator" aria-hidden="true">
        {direction === "increased"
          ? "↑"
          : direction === "decreased"
          ? "↓"
          : "•"}
      </span>
      <span>{change}</span>
    </li>
  );
})}

                    </ul>
                  ) : (
                    <p>No historical changes were identified.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="trends-empty-state">
                No saved analysis is available for the assessments in this period.
              </p>
            )}
          </section>
        )}

        <section className="trends-section" aria-labelledby="trends-charts-title">
          <div className="trends-section-heading">
            <div>
              <span className="trends-section-kicker">02 / MEASUREMENT HISTORY</span>
              <h2 id="trends-charts-title">Health trend charts</h2>
              <p>{simulated ? "Illustrative weekly sample · not astronaut measurements" : `${filteredEntries.length} saved assessment${filteredEntries.length === 1 ? "" : "s"} in this period`}</p>
            </div>
          </div>
          {isLoading ? (
            <div className="trends-loading" role="status">
              <span className="trends-loader" /> Preparing charts…
            </div>
          ) : (
            <div className="trends-chart-grid">
              {chartDefinitions.map((chart) => (
                <HealthTrendChart
                  key={chart.title}
                  title={chart.title}
                  description={chart.description}
                  unit={chart.unit}
                  data={chartData}
                  series={chart.series}
                />
              ))}
            </div>
          )}
        </section>

        <section className="research-context-panel" aria-labelledby="sleep-research-title">
          <div className="research-context-mark" aria-hidden="true">R</div>
          <div>
            <span className="trends-section-kicker">NASA RESEARCH CONTEXT</span>
            <h2 id="sleep-research-title">Sleep and performance</h2>
            <p>
              The supplied research cites approximately 8 hours of sleep and reports that restriction to 5–6 hours can impair performance within a week.
              This is research context, not a personal threshold or medical recommendation.
            </p>
          </div>
        </section>

        <section className="trends-section history-section" aria-labelledby="health-history-title">
          <div className="trends-section-heading">
            <div>
              <span className="trends-section-kicker">03 / RECORD ARCHIVE</span>
              <h2 id="health-history-title">Health history</h2>
              <p>{simulated ? "Simulated sample records only" : "Saved locally in this browser"}</p>
            </div>
          </div>
          {isLoading ? (
            <div className="trends-loading" role="status">
              <span className="trends-loader" /> Loading records…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="trends-empty-state">
              No assessments are available in this time period.
              {hasSavedAssessments && <span>Try a wider date range.</span>}
            </div>
          ) : (
            <div className="trends-history-wrap">
              <table className="trends-history-table">
                <thead>
                  <tr>
                    <th scope="col">Measurement date</th>
                    <th scope="col">Heart rate</th>
                    <th scope="col">Blood pressure</th>
                    <th scope="col">Oxygen</th>
                    <th scope="col">Temp.</th>
                    <th scope="col">Sleep</th>
                    <th scope="col">Water</th>
                    <th scope="col">Observations</th>
                    <th scope="col"><span className="visually-hidden">Inspect record</span></th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredEntries].reverse().map((entry) => (
                    <tr key={entry.key}>
                      <td>{entry.dateLabel}</td>
                      <td>{entry.record.heartRate || "—"} <small>BPM</small></td>
                      <td>
                        {entry.record.systolic && entry.record.diastolic
                          ? `${entry.record.systolic}/${entry.record.diastolic}`
                          : "—"} <small>mmHg</small>
                      </td>
                      <td>{entry.record.oxygenSaturation || "—"} <small>%</small></td>
                      <td>{entry.record.bodyTemperature || "—"} <small>°C</small></td>
                      <td>{entry.record.sleepDuration || "—"} <small>h</small></td>
                      <td>{entry.record.waterIntake || "—"} <small>L</small></td>
                      <td className="trends-observation-cell">{entry.record.observations.trim() || "—"}</td>
                      <td>
                        <button
                          className="trends-inspect-button"
                          type="button"
                          onClick={() => setInspectedEntry(entry)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="trends-disclaimer">
          Measurements are displayed as recorded and are not diagnoses or medical safety assessments.
        </p>
      </div>

      {inspectedEntry && (
        <div
          className="trends-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInspectedEntry(null);
          }}
        >
          <section className="trends-record-dialog" role="dialog" aria-modal="true" aria-labelledby="record-dialog-title">
            <div className="trends-dialog-heading">
              <div>
                <span className="trends-section-kicker">
                  {simulated ? "SIMULATED SAMPLE" : "SAVED ASSESSMENT"}
                </span>
                <h2 id="record-dialog-title">Assessment details</h2>
                <p>{inspectedEntry.dateLabel}</p>
              </div>
              <button
                className="trends-dialog-close"
                type="button"
                onClick={() => setInspectedEntry(null)}
                aria-label="Close assessment details"
              >
                ×
              </button>
            </div>
            <dl className="trends-record-details">
              <div><dt>Heart rate</dt><dd>{inspectedEntry.record.heartRate || "—"} BPM</dd></div>
              <div><dt>Blood pressure</dt><dd>{inspectedEntry.record.systolic || "—"}/{inspectedEntry.record.diastolic || "—"} mmHg</dd></div>
              <div><dt>Oxygen saturation</dt><dd>{inspectedEntry.record.oxygenSaturation || "—"}%</dd></div>
              <div><dt>Body temperature</dt><dd>{inspectedEntry.record.bodyTemperature || "—"} °C</dd></div>
              <div><dt>Sleep duration</dt><dd>{inspectedEntry.record.sleepDuration || "—"} hours</dd></div>
              <div><dt>Daily water intake</dt><dd>{inspectedEntry.record.waterIntake || "—"} L</dd></div>
            </dl>
            <div className="trends-record-observations">
              <span>OBSERVATIONS</span>
              <p>{inspectedEntry.record.observations.trim() || "No observations recorded."}</p>
            </div>

            {/* Assessment Analysis */}
<div className="trends-record-observations">
  <span>ASSESSMENT INSIGHTS</span>

  {inspectedEntry.record.analysis ? (
    inspectedEntry.record.analysis.insights.length > 0 ? (
      <ul>
        {inspectedEntry.record.analysis.insights.map((insight, index) => (
          <li key={index}>{insight}</li>
        ))}
      </ul>
    ) : (
      <p>No insights were generated.</p>
    )
  ) : (
    <p>No analysis available for this assessment.</p>
  )}
</div>

<div className="trends-record-observations">
  <span>HISTORICAL CHANGES</span>

  {inspectedEntry.record.analysis ? (
    inspectedEntry.record.analysis.historical_changes.length > 0 ? (
      <ul>
        
{inspectedEntry.record.analysis.historical_changes.map((change, index) => {
  const direction = getChangeDirection(change);

  return (
    <li key={index} className={`analysis-change analysis-change-${direction}`}>
      <span className="analysis-change-indicator" aria-hidden="true">
        {direction === "increased"
          ? "↑"
          : direction === "decreased"
          ? "↓"
          : "•"}
      </span>
      <span>{change}</span>
    </li>
  );
})}

      </ul>
    ) : (
      <p>No historical changes identified.</p>
    )
  ) : (
    <p>No analysis available for this assessment.</p>
  )}
</div>

          </section>
        </div>
      )}
    </main>
  );
}
