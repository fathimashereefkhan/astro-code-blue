"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HealthTrendCard,
  HealthLevel,
  MissionBackground,
  SleepChart,
  type HealthReading,
} from "./overview-panels";
import {
  SIMULATED_LATEST_HEALTH,
  type AssessmentRecord,
} from "../data/health-data";
import {
  ASSESSMENT_STORAGE_KEY,
  parseStoredAssessments,
  toAssessmentRecord,
} from "../data/health-assessments";

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function OverviewDashboard() {
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [storageError, setStorageError] = useState("");

  const loadAssessments = useCallback(() => {
    try {
      const saved = window.localStorage.getItem(ASSESSMENT_STORAGE_KEY);
      if (saved) {
        const parsed = parseStoredAssessments(saved);
        setRecords(parsed.records.map(toAssessmentRecord));
        if (parsed.invalidCount > 0) {
          setStorageError(`${parsed.invalidCount} invalid assessment record(s) were skipped.`);
        }
      }
    } catch {
      setStorageError("Assessment data could not be read from this browser.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadAssessments, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadAssessments]);

  const latest = records[records.length - 1];
  const values = latest ?? SIMULATED_LATEST_HEALTH;
  const isDemo = !latest;
  const readings: HealthReading[] = [
    { id: "heartRate", label: "Heart Rate", value: values.heartRate, unit: "BPM", glyph: "♡" },
    { id: "bloodPressure", label: "Blood Pressure", value: `${values.systolic}/${values.diastolic}`, unit: "mmHg", glyph: "⌁" },
    { id: "oxygenSaturation", label: "Oxygen Saturation", value: values.oxygenSaturation, unit: "%", glyph: "◉" },
    { id: "bodyTemperature", label: "Body Temperature", value: values.bodyTemperature, unit: "°C", glyph: "♨" },
    {
      id: "hydration",
      label: "Daily water intake",
      value: latest?.waterIntake || (isDemo ? SIMULATED_LATEST_HEALTH.waterIntake : "—"),
      unit: "L",
      glyph: "◌",
    },
    {
      id: "sleep",
      label: "Sleep",
      value: latest?.sleepDuration || (isDemo ? SIMULATED_LATEST_HEALTH.sleepDuration : "—"),
      unit: "HRS",
      glyph: "◷",
    },
  ];

  return (
    <main className="content overview-page">
      <div className="overview-workspace">
        <MissionBackground />

        {storageError && <p className="overview-storage-error" role="status">{storageError}</p>}

        <div className="overview-panels-row">
          <section className="glass-panel crew-profile-panel" aria-labelledby="crew-profile-title">
            <h1 className="panel-title" id="crew-profile-title">CREW PROFILE</h1>
            <div className="profile-identity">
              <div>
                <h2>Commander A. Morgan</h2>
                <p>ASTRONAUT ID <strong>ACB-014</strong></p>
              </div>
              <span className="demo-tag">SIMULATED DATA</span>
            </div>
            <div className="profile-details">
              <div><span>MISSION</span><strong>ORBITAL HEALTH STUDY <small>DEMO</small></strong></div>
              <div><span>DURATION</span><strong>DAY 042 <small>DEMO</small></strong></div>
              <div><span>STATUS</span><strong><i className="status-indicator" /> ACTIVE <small>DEMO</small></strong></div>
              <div>
                <span>LAST ASSESSMENT</span>
                <strong>{latest ? formatTimestamp(new Date(latest.submittedAt)) : "NOT RECORDED"}</strong>
              </div>
            </div>
          </section>

          <section className="glass-panel health-level-panel" aria-labelledby="health-level-title">
            <div className="health-heading">
              <h2 className="panel-title" id="health-level-title">HEALTH LEVEL</h2>
              <span className={`data-source${isDemo ? " is-demo" : ""}`}>
                {isDemo ? "SIMULATED DATA" : "LOCAL ASSESSMENT"}
              </span>
            </div>
            <HealthLevel readings={readings} />
            <p className="panel-footnote">
              Illustrative simulated data—not medical recommendations or astronaut-specific normal ranges.
            </p>
          </section>
        </div>

        <div className="overview-analytics-grid">
          <section className="glass-panel sleep-panel" aria-labelledby="sleep-panel-title">
            <div className="sleep-summary">
              <div className="sleep-summary-heading">
                <h2 className="panel-title" id="sleep-panel-title">SLEEP</h2>
                <span className="data-source">{latest?.sleepDuration ? "LOCAL ENTRY" : "SIMULATED DATA"}</span>
              </div>
              <p className="sleep-duration">
                {latest?.sleepDuration || (isDemo ? SIMULATED_LATEST_HEALTH.sleepDuration : "—")}
                <small> HRS</small>
              </p>
              <p className="sleep-date">
                {latest?.sleepDuration
                  ? `Latest assessment · ${formatTimestamp(new Date(latest.submittedAt))}`
                  : "Sample sleep duration · demonstration"}
              </p>
              <div className="sleep-daily-detail">
                <span>DAILY WATER INTAKE</span>
                <strong>
                  {latest?.waterIntake
                    ? `${latest.waterIntake} L`
                    : isDemo
                      ? `${SIMULATED_LATEST_HEALTH.waterIntake} L`
                      : "—"}
                </strong>
                <small>
                  {latest?.waterIntake
                    ? "Latest saved entry"
                    : isDemo
                      ? "Simulated daily water intake"
                      : "No local entry"}
                </small>
              </div>
            </div>

            <div className="sleep-chart-area">
              <div className="sleep-chart-heading">
                <div>
                  <h3>Sleep trend</h3>
                  <p>{latest?.sleepDuration ? "Saved assessment history" : "Weekly sample · demonstration data"}</p>
                </div>
                <span className="sleep-chart-unit">HOURS</span>
              </div>
              <SleepChart records={records} />
            </div>

          </section>

          <HealthTrendCard
            records={records}
            field="heartRate"
            label="HEART RATE"
            unit="BPM"
            color="#00d4ff"
          />
          <HealthTrendCard
            records={records}
            field="oxygenSaturation"
            label="OXYGEN SATURATION"
            unit="%"
            color="#168bff"
          />
          <HealthTrendCard
            records={records}
            field="bloodPressure"
            label="BLOOD PRESSURE"
            unit="mmHg"
            color="#00d4ff"
          />
          <HealthTrendCard
            records={records}
            field="waterIntake"
            label="DAILY WATER INTAKE"
            unit="L"
            color="#00d4ff"
          />
          <HealthTrendCard
            records={records}
            field="bodyTemperature"
            label="BODY TEMPERATURE"
            unit="°C"
            color="#168bff"
          />
        </div>

        <section className="glass-panel health-insights-panel" aria-labelledby="health-insights-title">
          <div className="health-insights-heading">
            <div>
              <span className="health-insights-kicker">CREW HEALTH / OBSERVATIONS</span>
              <h2 id="health-insights-title">Health Insights</h2>
            </div>
            <span className="health-insights-source">
              {latest ? "LATEST LOCAL ASSESSMENT" : "DEMO MODE"}
            </span>
          </div>
          <div className="health-insights-content">
            {latest ? (
              <>
                <span className="insight-marker" aria-hidden="true">i</span>
                <div>
                  <p>
                    {latest.observations.trim()
                      ? latest.observations
                      : "No additional observations were included in the latest assessment."}
                  </p>
                  <small>
                    Based only on the latest assessment saved in this browser. This interface does not provide medical interpretation.
                  </small>
                </div>
              </>
            ) : (
              <>
                <span className="insight-marker" aria-hidden="true">i</span>
                <div>
                  <p>Insights will appear here after a health assessment is submitted.</p>
                  <small>
                    No health assessment is stored. Sample chart values are demonstrations and are not astronaut measurements.
                  </small>
                </div>
              </>
            )}
          </div>
        </section>

        <footer className="overview-footer">
          <span>ASTRO CODE BLUE <i>•</i> CREW HEALTH MONITORING</span>
          <span>DEMONSTRATION INTERFACE <i>•</i> NO LIVE TELEMETRY</span>
        </footer>
      </div>
    </main>
  );
}
