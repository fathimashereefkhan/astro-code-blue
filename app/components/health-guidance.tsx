"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AssessmentRecord } from "../data/health-data";
import {
  ASSESSMENT_STORAGE_KEY,
  parseStoredAssessments,
  toAssessmentRecord,
} from "../data/health-assessments";
import {
  guidanceResearchItems,
  type GuidanceBackendResult,
  type GuidanceMeasurementId,
} from "../data/health-guidance";
import {
  advisorRecommendedActions,
  missionScenarios,
} from "../data/mission-advisor";

const measurementLabels: Record<GuidanceMeasurementId, string> = {
  heartRate: "Heart rate",
  bloodPressure: "Blood pressure",
  oxygenSaturation: "Oxygen saturation",
  bodyTemperature: "Body temperature",
  sleepDuration: "Sleep",
  waterIntake: "Water intake",
};

const measurementUnits: Record<GuidanceMeasurementId, string> = {
  heartRate: "BPM",
  bloodPressure: "mmHg",
  oxygenSaturation: "%",
  bodyTemperature: "°C",
  sleepDuration: "hours",
  waterIntake: "L",
};

const assessmentMeasurementIds: GuidanceMeasurementId[] = [
  "heartRate",
  "bloodPressure",
  "oxygenSaturation",
  "bodyTemperature",
  "sleepDuration",
  "waterIntake",
];

function getAssessmentMeasurement(
  record: AssessmentRecord,
  measurementId: GuidanceMeasurementId,
) {
  if (measurementId === "bloodPressure") {
    return `${record.systolic}/${record.diastolic}`;
  }
  return record[measurementId];
}

function formatRecordedDate(record: AssessmentRecord) {
  const rawDate = record.assessmentDate?.trim() || record.submittedAt;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  const hasTime = record.assessmentDate?.includes("T") || !record.assessmentDate?.trim();
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(hasTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

export default function HealthGuidance({
  backendResults = [],
}: {
  backendResults?: GuidanceBackendResult[];
}) {
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [hasLoadedAssessments, setHasLoadedAssessments] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const loadAssessments = useCallback(() => {
    try {
      const saved = window.localStorage.getItem(ASSESSMENT_STORAGE_KEY);
      if (!saved) {
        setRecords([]);
        setAssessmentError("");
        return;
      }

      const parsed = parseStoredAssessments(saved);
      setRecords(parsed.records.map(toAssessmentRecord));
      setAssessmentError(
        parsed.invalidCount > 0
          ? `${parsed.invalidCount} saved assessment record(s) were skipped because their format was invalid.`
          : "",
      );
    } catch {
      setRecords([]);
      setAssessmentError(
        "Saved assessment data could not be read. No personalized insight is available.",
      );
    } finally {
      setHasLoadedAssessments(true);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadAssessments, 0);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ASSESSMENT_STORAGE_KEY || event.key === null) {
        loadAssessments();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", loadAssessments);
    window.addEventListener("pageshow", loadAssessments);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", loadAssessments);
      window.removeEventListener("pageshow", loadAssessments);
    };
  }, [loadAssessments]);

  const latestRecord = records[records.length - 1] ?? null;
  const backendInsight = backendResults[0] ?? null;
  const selectedAction =
    advisorRecommendedActions.find((action) => action.id === selectedActionId) ?? null;
  const selectedScenario =
    missionScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
  const sourceLabel = backendInsight
    ? "LIVE BACKEND"
    : latestRecord
      ? "SAVED ASSESSMENT · AI OFFLINE"
      : "DEMO MODE · NO ASSESSMENT";

  return (
    <main className="content health-guidance-page">
      <div className="mission-advisor">
        <header className="advisor-header">
          <div className="advisor-brand">
            <div className="advisor-spark" aria-hidden="true">
              <span>✦</span>
              <i className="spark-orbit spark-orbit-one" />
              <i className="spark-orbit spark-orbit-two" />
            </div>
            <div>
              <p className="advisor-eyebrow">CREW HEALTH INTELLIGENCE / ADVISOR NODE</p>
              <h1>AI MISSION ADVISOR</h1>
              <p className="advisor-subtitle">
                Your intelligent spaceflight health companion.
              </p>
            </div>
          </div>
          <div className="advisor-status">
            <span className={`advisor-status-light${backendInsight ? " is-online" : ""}`} />
            <div>
              <span>AI STATUS</span>
              <strong>{backendInsight ? "INSIGHT RECEIVED" : "MODEL NOT CONNECTED"}</strong>
            </div>
            <i>{sourceLabel}</i>
          </div>
        </header>

        {assessmentError && (
          <p className="advisor-error" role="status">{assessmentError}</p>
        )}

        <section className="advisor-insight-panel" aria-labelledby="advisor-insight-title">
          <div className="advisor-insight-copy">
            <div className="advisor-section-kicker">
              <span className="advisor-spark-mini" aria-hidden="true">✦</span>
              AI HEALTH INSIGHT
              <span className={`advisor-insight-state${backendInsight ? " is-ready" : ""}`}>
                {backendInsight ? "PERSONALIZED RESULT" : "AWAITING ANALYSIS"}
              </span>
            </div>

            {backendInsight ? (
              <>
                <div className="advisor-priority-row">
                  <span className={`advisor-priority priority-${backendInsight.priority ?? "unset"}`}>
                    PRIORITY / {backendInsight.priority?.toUpperCase() ?? "NOT PROVIDED"}
                  </span>
                </div>
                <h2 id="advisor-insight-title">
                  {backendInsight.observation ||
                    `Insight for ${measurementLabels[backendInsight.measurementId].toLowerCase()}`}
                </h2>
                <div className="advisor-insight-reason">
                  <span>WHY IT MATTERS</span>
                  <p>{backendInsight.explanation}</p>
                </div>
                <div className="advisor-next-action">
                  <span>RECOMMENDED NEXT ACTION</span>
                  <p>{backendInsight.preventiveAction}</p>
                </div>
                <p className="advisor-disclaimer">
                  Backend-supplied guidance only. This interface does not diagnose or replace
                  mission medical instructions.
                </p>
              </>
            ) : !hasLoadedAssessments ? (
              <div className="advisor-empty-state" role="status">
                <span className="advisor-loading-mark" aria-hidden="true" />
                <h2 id="advisor-insight-title">Checking your assessment data</h2>
                <p>Your saved measurements and advisor connection status are loading.</p>
              </div>
            ) : !latestRecord ? (
              <div className="advisor-empty-state">
                <span className="advisor-empty-icon" aria-hidden="true">＋</span>
                <h2 id="advisor-insight-title">
                  An assessment is needed for personalized insight.
                </h2>
                <p>
                  No saved assessment is available. General mission research and educational
                  actions remain available below; no health finding or prediction is generated.
                </p>
                <Link className="advisor-primary-link" href="/assessment">
                  OPEN HEALTH ASSESSMENT <span aria-hidden="true">↗</span>
                </Link>
              </div>
            ) : (
              <div className="advisor-empty-state">
                <span className="advisor-awaiting-icon" aria-hidden="true">⌁</span>
                <h2 id="advisor-insight-title">Your assessment is ready for review.</h2>
                <p>
                  Measurements are available below, but this project has no configured AI
                  endpoint. They are shown as recorded—not interpreted as a finding or prediction.
                </p>
                <span className="advisor-no-priority">PRIORITY / NOT ASSESSED</span>
              </div>
            )}
          </div>

          <aside className="advisor-readout" aria-label="Measurement and prediction data">
            {backendInsight ? (
              <>
                <div className="advisor-readout-heading">
                  <span>BACKEND RESULT DATA</span>
                  <span className="advisor-readout-dot" />
                </div>
                <div className="advisor-backend-measurement">
                  <span>MEASURED INPUT / {measurementLabels[backendInsight.measurementId]}</span>
                  <strong>
                    {backendInsight.measured.value}
                    <small>
                      {" "}{backendInsight.measured.unit ||
                        measurementUnits[backendInsight.measurementId]}
                    </small>
                  </strong>
                  {backendInsight.measured.recordedAt && (
                    <time>{backendInsight.measured.recordedAt}</time>
                  )}
                </div>
                {backendInsight.modelPrediction && (
                  <div className="advisor-prediction">
                    <span>MODEL PREDICTION</span>
                    <strong>
                      {backendInsight.modelPrediction.value}
                      {backendInsight.modelPrediction.unit
                        ? ` ${backendInsight.modelPrediction.unit}`
                        : ""}
                    </strong>
                    <small>
                      {backendInsight.modelPrediction.horizon ||
                        backendInsight.modelPrediction.modelName ||
                        "Backend supplied"}
                    </small>
                  </div>
                )}
              </>
            ) : latestRecord ? (
              <>
                <div className="advisor-readout-heading">
                  <span>SAVED ASSESSMENT / AS RECORDED</span>
                  <span className="advisor-readout-dot is-recorded" />
                </div>
                <time className="advisor-record-date">{formatRecordedDate(latestRecord)}</time>
                <div className="advisor-measurement-grid">
                  {assessmentMeasurementIds.map((id) => (
                    <div className="advisor-measurement" key={id}>
                      <span>{measurementLabels[id]}</span>
                      <strong>
                        {getAssessmentMeasurement(latestRecord, id) || "—"}
                        <small> {measurementUnits[id]}</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <p className="advisor-readout-note">
                  Local assessment values are separate from AI output. No model prediction is
                  available.
                </p>
              </>
            ) : (
              <div className="advisor-readout-empty">
                <span className="advisor-readout-empty-icon" aria-hidden="true">⌁</span>
                <span>NO MEASUREMENTS LOADED</span>
                <small>Complete an assessment to see saved readings here.</small>
              </div>
            )}
          </aside>
        </section>

        <section className="advisor-actions-section" aria-labelledby="advisor-actions-title">
          <div className="advisor-section-heading">
            <div>
              <span className="advisor-overline">SMALL STEPS / CREW WELL-BEING</span>
              <h2 id="advisor-actions-title">RECOMMENDED ACTIONS</h2>
            </div>
            <span className="advisor-heading-note">EDUCATIONAL · NOT A TASK CHECKLIST</span>
          </div>
          <div className="advisor-actions-grid">
            {advisorRecommendedActions.map((action, index) => {
              const isSelected = selectedActionId === action.id;
              return (
                <button
                  className={`advisor-action-tile${isSelected ? " is-selected" : ""}`}
                  type="button"
                  key={action.id}
                  aria-expanded={isSelected}
                  aria-controls={isSelected ? "advisor-action-details" : undefined}
                  onClick={() =>
                    setSelectedActionId((current) => current === action.id ? null : action.id)
                  }
                >
                  <span className="advisor-action-number">0{index + 1}</span>
                  <span className="advisor-action-icon" aria-hidden="true">{action.icon}</span>
                  <strong>{action.title}</strong>
                  <span className="advisor-action-summary">{action.summary}</span>
                  <span className="advisor-action-schedule">{action.schedule}</span>
                  <span className="advisor-action-details">
                    {isSelected ? "CLOSE DETAILS" : "VIEW DETAILS"}
                    <i aria-hidden="true">{isSelected ? "−" : "↗"}</i>
                  </span>
                </button>
              );
            })}
          </div>
          {selectedAction && (
            <article className="advisor-action-expanded" id="advisor-action-details">
              <div>
                <span className="advisor-overline">{selectedAction.source}</span>
                <h3>{selectedAction.title}</h3>
              </div>
              <p>{selectedAction.details}</p>
            </article>
          )}
        </section>

        <section className="advisor-scenarios-section" aria-labelledby="advisor-scenarios-title">
          <div className="advisor-section-heading">
            <div>
              <span className="advisor-overline">MISSION READINESS / WHAT-IF BRIEFINGS</span>
              <h2 id="advisor-scenarios-title">EXPLORE MISSION SCENARIOS</h2>
            </div>
            <span className="advisor-heading-note">SELECT A SCENARIO TO EXPLORE</span>
          </div>

          <div className="advisor-scenario-grid">
            {missionScenarios.map((scenario, index) => (
              <button
                className={`advisor-scenario-tile${selectedScenarioId === scenario.id ? " is-selected" : ""}`}
                type="button"
                key={scenario.id}
                aria-pressed={selectedScenarioId === scenario.id}
                onClick={() =>
                  setSelectedScenarioId((current) =>
                    current === scenario.id ? null : scenario.id,
                  )
                }
              >
                <span className="advisor-scenario-index">SCENARIO / 0{index + 1}</span>
                <span className="advisor-scenario-icon" aria-hidden="true">{scenario.icon}</span>
                <strong>{scenario.title}</strong>
                <span>{scenario.subtitle}</span>
                <i aria-hidden="true">{selectedScenarioId === scenario.id ? "−" : "↗"}</i>
              </button>
            ))}
          </div>

          {selectedScenario && (
            <article className="advisor-scenario-detail" aria-live="polite">
              <div className="advisor-scenario-detail-header">
                <div>
                  <span className="advisor-overline">MISSION SCENARIO / DETAIL BRIEF</span>
                  <h3>{selectedScenario.title}</h3>
                  <p>{selectedScenario.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="advisor-close-button"
                  aria-label="Close scenario details"
                  onClick={() => setSelectedScenarioId(null)}
                >
                  ×
                </button>
              </div>

              <div className="advisor-scenario-detail-grid">
                <div>
                  <span className="advisor-detail-label">POSSIBLE EFFECTS</span>
                  <p>{selectedScenario.effects}</p>
                </div>
                <div>
                  <span className="advisor-detail-label">WHAT TO MONITOR</span>
                  <ul>
                    {selectedScenario.monitoring.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <span className="advisor-detail-label">PREVENTIVE GUIDANCE</span>
                  <ul>
                    {selectedScenario.preventiveMeasures.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <small>Follow current mission procedures; these notes are educational context.</small>
                </div>
                <div>
                  <span className="advisor-detail-label">WHEN TO REPORT</span>
                  <p>{selectedScenario.reporting}</p>
                </div>
              </div>
              <div className="advisor-scenario-research">
                <div>
                  <span className="advisor-detail-label">RESEARCH CONTEXT</span>
                  <p>{selectedScenario.researchContext}</p>
                </div>
                <span>{selectedScenario.guidanceSource}</span>
              </div>
            </article>
          )}
        </section>

        <details className="advisor-research">
          <summary>
            <span className="advisor-research-emblem" aria-hidden="true">R</span>
            <span>
              <span className="advisor-overline">REFERENCE LIBRARY</span>
              <strong>BEHIND THE SCIENCE</strong>
              <small>Supplied research findings, kept separate from project reminders.</small>
            </span>
            <i aria-hidden="true">+</i>
          </summary>
          <div className="advisor-research-content">
            {guidanceResearchItems.map((item) => (
              <article key={item.id}>
                <span>{item.source}</span>
                <h3>{item.title}</h3>
                <p>{item.finding}</p>
              </article>
            ))}
            <p className="advisor-research-disclaimer">
              NASA research and technical brief figures are references for professional astronaut
              operations, not a substitute for current mission protocols or medical advice.
            </p>
          </div>
        </details>

        <footer className="advisor-footer">
          <span>ASTRO CODE BLUE / HEALTH INTELLIGENCE</span>
          <span>EDUCATIONAL CONTEXT ONLY · FOLLOW CURRENT CREW MEDICAL INSTRUCTIONS</span>
        </footer>
      </div>
    </main>
  );
}
