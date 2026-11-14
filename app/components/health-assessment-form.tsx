"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AssessmentAnalysis } from "../data/health-data";
import astronautImage from "../astro.png";
import {
  ASSESSMENT_MEASUREMENT_LABELS,
  ASSESSMENT_STORAGE_KEY,
  ASSESSMENT_STORAGE_VERSION,
  parseStoredAssessments,
  type AssessmentGroups,
  type AssessmentMeasurement,
  type MeasurementSource,
  type StructuredAssessmentRecord,
  type SymptomReport,
} from "../data/health-assessments";

type FieldKind = "number" | "text" | "textarea" | "time" | "select";
type FieldConfig = {
  id: string;
  label: string;
  unit: string;
  kind: FieldKind;
  customUnit?: boolean;
  options?: string[];
  unitOptions?: string[];
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
};
type DraftMeasurement = {
  value: string;
  unit: string;
  recordedAt: string;
  source: MeasurementSource;
  notes: string;
};
type DraftGroups = {
  sleepAndWellness: Record<string, DraftMeasurement>;
  cognitiveHealth: Record<string, DraftMeasurement>;
  visionAndSymptoms: {
    measurements: Record<string, DraftMeasurement>;
    symptoms: Record<string, { selected: boolean; severity: SymptomReport["severity"]; notes: string }>;
  };
  vitalSigns: Record<string, DraftMeasurement>;
  spaceEnvironment: Record<string, DraftMeasurement>;
  specializedMedical: Record<string, DraftMeasurement>;
};
type AssessmentDraft = {
  assessmentDate: string;
  groups: DraftGroups;
  assessmentNotes: string;
};
type MeasurementGroup = Exclude<keyof DraftGroups, "visionAndSymptoms">;
type ImportGroup = "cognitiveHealth" | "spaceEnvironment";
type MeasurementRow = {
  group: string;
  label: string;
  value: string;
  unit: string;
  recordedAt: string;
  source: string;
};
type DraftReviewRow = {
  group: keyof AssessmentGroups;
  label: string;
  value: string;
  unit: string;
};

const assessmentStages = [
  { number: "01", title: "Vital signs", detail: "Vitals" },
  { number: "02", title: "Sleep & physical condition", detail: "Wellness" },
  { number: "03", title: "Symptoms", detail: "Symptoms" },
  { number: "04", title: "Review scan", detail: "Review" },
] as const;

const scanMessages = [
  "INITIALIZING MEDICAL SYSTEM...",
  "PROCESSING VITAL SIGNS...",
  "REVIEWING PHYSICAL CONDITION...",
  "ANALYZING REPORTED SYMPTOMS...",
  "PREPARING ASSESSMENT REPORT...",
];

const stageGroups: Record<number, readonly (keyof AssessmentGroups)[]> = {
  1: ["vitalSigns"],
  2: ["sleepAndWellness", "cognitiveHealth", "spaceEnvironment", "specializedMedical"],
  3: ["visionAndSymptoms"],
};

const sourceOptions: { value: MeasurementSource; label: string }[] = [
  { value: "manual_entry", label: "Manual entry" },
  { value: "self_reported", label: "Self-reported" },
  { value: "device", label: "Device" },
  { value: "medical_test", label: "Medical test" },
  { value: "imported", label: "Imported record" },
];

const sectionFields = {
  sleepAndWellness: [
    { id: "sleepDuration", label: "Sleep duration", unit: "hours", kind: "number", min: 0, step: 0.1 },
    { id: "sleepQuality", label: "Sleep quality", unit: "1–5", kind: "number", min: 1, max: 5, step: 1 },
    { id: "sleepDisturbances", label: "Sleep disturbances", unit: "self-report", kind: "select", options: ["Yes", "No"] },
    { id: "bedtime", label: "Sleep schedule / bedtime", unit: "local time", kind: "time" },
    { id: "exerciseDuration", label: "Exercise duration", unit: "minutes", kind: "number", min: 0, step: 1 },
    { id: "exerciseType", label: "Exercise type", unit: "activity", kind: "select", options: ["Aerobic", "Resistance", "Other"] },
    { id: "waterIntake", label: "Hydration / water intake", unit: "L", kind: "number", min: 0, step: 0.1 },
    { id: "fatigueLevel", label: "Fatigue level", unit: "1–5", kind: "number", min: 1, max: 5, step: 1 },
  ],
  cognitiveHealth: [
    { id: "moodRating", label: "Mood rating", unit: "1–5", kind: "number", min: 1, max: 5, step: 1 },
    { id: "stressLevel", label: "Stress level", unit: "1–5", kind: "number", min: 1, max: 5, step: 1 },
    { id: "concentrationDifficulty", label: "Concentration difficulty", unit: "self-report", kind: "select", options: ["Yes", "No"] },
    { id: "emotionalDistress", label: "Feeling isolated or emotionally distressed", unit: "self-report", kind: "select", options: ["Yes", "No"] },
    { id: "reactionTime", label: "Reaction time", unit: "as reported", customUnit: true, kind: "number", min: 0, step: 0.01, hint: "Enter the original result and units reported by the assessment." },
    { id: "attention", label: "Attention", unit: "as reported", customUnit: true, kind: "number", min: 0, step: 0.01 },
    { id: "visualWorkingMemory", label: "Visual working memory", unit: "as reported", customUnit: true, kind: "number", min: 0, step: 0.01 },
    { id: "verbalWorkingMemory", label: "Verbal working memory", unit: "as reported", customUnit: true, kind: "number", min: 0, step: 0.01 },
  ],
  visionAndSymptoms: [
    { id: "blurredVision", label: "Blurred vision", unit: "self-report", kind: "select", options: ["Yes", "No"] },
    { id: "distortedVision", label: "Distorted vision", unit: "self-report", kind: "select", options: ["Yes", "No"] },
    { id: "nearVisionChanges", label: "Near vision changes", unit: "self-report", kind: "select", options: ["Yes", "No"] },
    { id: "visualAcuity", label: "Visual acuity result", unit: "as recorded", kind: "text" },
    { id: "amslerGrid", label: "Amsler grid result", unit: "as recorded", kind: "text" },
  ],
  vitalSigns: [
    { id: "heartRate", label: "Heart rate", unit: "BPM", kind: "number", min: 0, step: 1 },
    { id: "systolic", label: "Systolic blood pressure", unit: "mmHg", kind: "number", min: 0, step: 1 },
    { id: "diastolic", label: "Diastolic blood pressure", unit: "mmHg", kind: "number", min: 0, step: 1 },
    { id: "oxygenSaturation", label: "Oxygen saturation", unit: "%", kind: "number", min: 0, step: 0.1 },
    { id: "bodyTemperature", label: "Body temperature", unit: "°C", kind: "number", min: 0, step: 0.1 },
    { id: "respiratoryRate", label: "Respiratory rate", unit: "breaths/min", kind: "number", min: 0, step: 1 },
    { id: "muscleFatigue", label: "Muscle fatigue", unit: "self-report", kind: "textarea" },
    { id: "exercisePerformance", label: "Exercise performance", unit: "self-report", kind: "textarea" },
  ],
  spaceEnvironment: [
    { id: "cabinCo2", label: "Cabin CO₂ concentration", unit: "mmHg", kind: "number", min: 0, step: 0.01 },
    { id: "radiationExposure", label: "Radiation exposure", unit: "mSv", kind: "number", min: 0, step: 0.001 },
    { id: "radiationDoseRate", label: "Radiation dose rate", unit: "mSv/day", kind: "number", min: 0, step: 0.001 },
    { id: "cabinTemperature", label: "Cabin temperature", unit: "°C", kind: "number", step: 0.1 },
    { id: "cabinPressure", label: "Cabin pressure", unit: "kPa", kind: "number", min: 0, step: 0.01, unitOptions: ["kPa", "mmHg", "psi"] },
    { id: "humidity", label: "Humidity", unit: "%", kind: "number", min: 0, step: 0.1 },
  ],
  specializedMedical: [
    { id: "boneMineralDensity", label: "Bone mineral density (DXA)", unit: "result as reported", customUnit: true, kind: "textarea" },
    { id: "boneHealthMarkers", label: "Bone health markers (blood / urine)", unit: "results as reported", customUnit: true, kind: "textarea" },
    { id: "vitaminD", label: "Vitamin D level", unit: "ng/mL", kind: "number", min: 0, step: 0.1 },
    { id: "octEyeExam", label: "OCT / eye examination results", unit: "results as reported", customUnit: true, kind: "textarea" },
    { id: "neckVeinUltrasound", label: "Neck vein ultrasound results", unit: "results as reported", customUnit: true, kind: "textarea" },
    { id: "immuneMarkers", label: "Immune markers / laboratory results", unit: "results as reported", customUnit: true, kind: "textarea" },
  ],
} satisfies Record<string, FieldConfig[]>;

const sectionMeta = [
  {
    id: "sleepAndWellness",
    number: "01",
    title: "Sleep & daily wellness",
    description: "Self-reported sleep, activity, hydration and fatigue.",
  },
  {
    id: "cognitiveHealth",
    number: "02",
    title: "Mental & cognitive health",
    description: "Record how you feel and enter results only from a completed assessment.",
  },
  {
    id: "visionAndSymptoms",
    number: "03",
    title: "Vision & symptoms",
    description: "Separate vision observations from self-reported symptoms.",
  },
  {
    id: "vitalSigns",
    number: "04",
    title: "Vital signs & physical health",
    description: "Optional readings from available monitoring devices.",
  },
  {
    id: "spaceEnvironment",
    number: "05",
    title: "Space environment",
    description: "Use recorded spacecraft sensor or radiation-monitor data when available.",
  },
  {
    id: "specializedMedical",
    number: "06",
    title: "Specialized medical measurements",
    description: "Optional results from appropriate equipment and professional assessment.",
  },
] as const;

const symptomNames = [
  "Headache",
  "Dizziness",
  "Lightheadedness",
  "Nausea",
  "Fainting",
  "Muscle pain",
  "Sleep difficulty",
  "Other symptoms",
] as const;

const numericMeasurementIds = new Set([
  "sleepDuration", "sleepQuality", "exerciseDuration", "waterIntake", "fatigueLevel",
  "moodRating", "stressLevel", "reactionTime", "attention", "visualWorkingMemory",
  "verbalWorkingMemory", "heartRate", "systolic", "diastolic", "oxygenSaturation",
  "bodyTemperature", "respiratoryRate", "cabinCo2", "radiationExposure",
  "radiationDoseRate", "cabinTemperature", "cabinPressure", "humidity", "vitaminD",
]);
const medicalResultIds = new Set([
  "reactionTime", "attention", "visualWorkingMemory", "verbalWorkingMemory",
  "boneMineralDensity", "boneHealthMarkers", "vitaminD", "octEyeExam",
  "neckVeinUltrasound", "immuneMarkers",
]);
const selfReportedIds = new Set([
  "sleepDuration", "sleepQuality", "sleepDisturbances", "bedtime",
  "exerciseDuration", "exerciseType", "waterIntake", "fatigueLevel",
  "moodRating", "stressLevel", "concentrationDifficulty", "emotionalDistress",
  "blurredVision", "distortedVision", "nearVisionChanges", "muscleFatigue",
  "exercisePerformance",
]);

const groupTitles: Record<keyof AssessmentGroups, string> = {
  sleepAndWellness: "Sleep & daily wellness",
  cognitiveHealth: "Mental & cognitive health",
  visionAndSymptoms: "Vision & symptoms",
  vitalSigns: "Vital signs & physical health",
  spaceEnvironment: "Space environment",
  specializedMedical: "Specialized medical measurements",
};

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function emptyMeasurement(field: FieldConfig, recordedAt: string): DraftMeasurement {
  const source: MeasurementSource = medicalResultIds.has(field.id)
    ? "medical_test"
    : selfReportedIds.has(field.id)
      ? "self_reported"
      : "manual_entry";
  return {
    value: "",
    unit: field.unit,
    recordedAt,
    source,
    notes: "",
  };
}

function createEmptyDraft(recordedAt: string): AssessmentDraft {
  const now = recordedAt;
  const makeGroup = (fields: readonly FieldConfig[]) =>
    Object.fromEntries(fields.map((field) => [field.id, emptyMeasurement(field, now)]));
  return {
    assessmentDate: now,
    groups: {
      sleepAndWellness: makeGroup(sectionFields.sleepAndWellness),
      cognitiveHealth: makeGroup(sectionFields.cognitiveHealth),
      visionAndSymptoms: {
        measurements: makeGroup(sectionFields.visionAndSymptoms),
        symptoms: Object.fromEntries(
          symptomNames.map((symptom) => [
            symptom,
            { selected: false, severity: "unspecified" as const, notes: "" },
          ]),
        ),
      },
      vitalSigns: makeGroup(sectionFields.vitalSigns),
      spaceEnvironment: makeGroup(sectionFields.spaceEnvironment),
      specializedMedical: makeGroup(sectionFields.specializedMedical),
    },
    assessmentNotes: "",
  };
}

function validateField(field: FieldConfig, value: string) {
  if (!value.trim() || field.kind !== "number") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Enter a valid number.";
  if (field.min !== undefined && parsed < field.min) return `Enter a value of at least ${field.min}.`;
  if (field.max !== undefined && parsed > field.max) return `Enter a value no greater than ${field.max}.`;
  if (field.step === 1 && !Number.isInteger(parsed)) return "Enter a whole number.";
  return "";
}

function sourceLabel(source: MeasurementSource) {
  return sourceOptions.find((option) => option.value === source)?.label ?? "Recorded";
}

function measurementRows(record: StructuredAssessmentRecord): MeasurementRow[] {
  const rows: MeasurementRow[] = [];
  for (const [group, values] of Object.entries(record.groups)) {
    const measurements =
      group === "visionAndSymptoms"
        ? record.groups.visionAndSymptoms.measurements
        : values as Record<string, AssessmentMeasurement>;
    for (const [key, measurement] of Object.entries(measurements)) {
      rows.push({
        group: groupTitles[group as keyof AssessmentGroups],
        label: ASSESSMENT_MEASUREMENT_LABELS[key] ?? key,
        value: String(measurement.value),
        unit: measurement.unit,
        recordedAt: measurement.recordedAt,
        source: sourceLabel(measurement.source),
      });
    }
  }
  return rows;
}

function draftReviewRows(draft: AssessmentDraft): DraftReviewRow[] {
  return sectionMeta.flatMap((section) => {
    const fields = sectionFields[section.id];
    return fields.flatMap((field) => {
      const measurement =
        section.id === "visionAndSymptoms"
          ? draft.groups.visionAndSymptoms.measurements[field.id]
          : draft.groups[section.id][field.id];
      if (!measurement?.value.trim()) return [];
      return [{
        group: section.id,
        label: field.label,
        value: measurement.value,
        unit: measurement.unit,
      }];
    });
  });
}

function isAssessmentAnalysis(value: unknown): value is AssessmentAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const analysis = value as Record<string, unknown>;
  return (
    typeof analysis.assessment_id === "string" &&
    typeof analysis.measurements_analyzed === "number" &&
    Array.isArray(analysis.insights) &&
    analysis.insights.every((insight) => typeof insight === "string") &&
    Array.isArray(analysis.historical_changes) &&
    analysis.historical_changes.every((change) => typeof change === "string")
  );
}

function countRecordedValues(record: StructuredAssessmentRecord) {
  return measurementRows(record).length + record.groups.visionAndSymptoms.symptoms.length;
}

function formatRecordedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toStoredMeasurement(
  draft: DraftMeasurement,
  fieldId: string,
): AssessmentMeasurement | undefined {
  if (!draft.value.trim()) return undefined;
  const value = numericMeasurementIds.has(fieldId) ? Number(draft.value) : draft.value.trim();
  return {
    value,
    unit: draft.unit.trim(),
    recordedAt: new Date(draft.recordedAt).toISOString(),
    source: draft.source,
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
  };
}

function toStoredGroup(fields: Record<string, DraftMeasurement>) {
  const measurements: Record<string, AssessmentMeasurement> = {};
  for (const [fieldId, draft] of Object.entries(fields)) {
    const measurement = toStoredMeasurement(draft, fieldId);
    if (measurement) measurements[fieldId] = measurement;
  }
  return measurements;
}

function makeStoredRecord(draft: AssessmentDraft): StructuredAssessmentRecord {
  const submittedAt = new Date().toISOString();
  const selectedSymptoms: SymptomReport[] = symptomNames.flatMap((symptom) => {
    const entry = draft.groups.visionAndSymptoms.symptoms[symptom];
    if (!entry.selected) return [];
    const label =
      symptom === "Other symptoms"
        ? entry.notes.trim().split("\n", 1)[0] || "Other symptoms"
        : symptom;
    return [{
      symptom: label,
      severity: entry.severity,
      recordedAt: submittedAt,
      source: "self_reported",
      ...(entry.notes.trim() ? { notes: entry.notes.trim() } : {}),
    }];
  });
  return {
    schemaVersion: ASSESSMENT_STORAGE_VERSION,
    id: crypto.randomUUID(),
    assessmentDate: new Date(draft.assessmentDate).toISOString(),
    submittedAt,
    groups: {
      sleepAndWellness: toStoredGroup(draft.groups.sleepAndWellness),
      cognitiveHealth: toStoredGroup(draft.groups.cognitiveHealth),
      visionAndSymptoms: {
        measurements: toStoredGroup(draft.groups.visionAndSymptoms.measurements),
        symptoms: selectedSymptoms,
      },
      vitalSigns: toStoredGroup(draft.groups.vitalSigns),
      spaceEnvironment: toStoredGroup(draft.groups.spaceEnvironment),
      specializedMedical: toStoredGroup(draft.groups.specializedMedical),
    },
    ...(draft.assessmentNotes.trim()
      ? { assessmentNotes: draft.assessmentNotes.trim() }
      : {}),
  };
}

function MeasurementInput({
  field,
  measurement,
  error,
  visual = false,
  onChange,
}: {
  field: FieldConfig;
  measurement: DraftMeasurement;
  error?: string;
  visual?: boolean;
  onChange: (value: Partial<DraftMeasurement>) => void;
}) {
  const id = `assessment-${field.id}`;
  const invalid = Boolean(error);
  return (
    <div className="astronaut-assessment-field">
      {visual && (
        <div className="vital-measurement-display" aria-hidden="true">
          <span className="vital-measurement-orbit">{measurement.value || "—"}</span>
          <span>LIVE ENTRY</span>
        </div>
      )}
      <label htmlFor={id}>
        {field.label}
        <span className="assessment-unit">{field.unitOptions ? "select unit" : field.unit}</span>
      </label>
      <div className={`assessment-input-row${field.unitOptions ? " has-unit-picker" : ""}`}>
        {field.kind === "textarea" ? (
          <textarea
            id={id}
            rows={2}
            value={measurement.value}
            onChange={(event) => onChange({ value: event.target.value })}
            aria-invalid={invalid}
            placeholder="Optional result or note"
          />
        ) : field.kind === "select" ? (
          <select
            id={id}
            value={measurement.value}
            onChange={(event) => onChange({ value: event.target.value })}
            aria-invalid={invalid}
          >
            <option value="">Not recorded</option>
            {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : (
          <input
            id={id}
            type={field.kind}
            min={field.kind === "number" ? field.min : undefined}
            max={field.kind === "number" ? field.max : undefined}
            step={field.kind === "number" ? field.step : undefined}
            inputMode={field.kind === "number" ? "decimal" : undefined}
            value={measurement.value}
            onChange={(event) => onChange({ value: event.target.value })}
            aria-invalid={invalid}
            placeholder={field.kind === "number" ? "Optional" : "Select or enter"}
          />
        )}
        {field.unitOptions ? (
          <select
            className="assessment-unit-picker"
            aria-label={`${field.label} unit`}
            value={measurement.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
          >
            {field.unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        ) : field.customUnit ? (
          <input
            className="assessment-custom-unit"
            aria-label={`${field.label} unit`}
            value={measurement.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
            placeholder="Source unit"
          />
        ) : (
          <span className="assessment-unit-chip">{field.kind === "select" ? "SELECT" : field.unit}</span>
        )}
      </div>
      {field.hint && <small className="assessment-field-hint">{field.hint}</small>}
      {error && <span className="assessment-field-error">{error}</span>}
      <details className="measurement-metadata">
        <summary>Time, source &amp; notes</summary>
        <div className="measurement-metadata-grid">
          <div>
            <label htmlFor={`${id}-recorded-at`}>Measurement date &amp; time</label>
            <input
              id={`${id}-recorded-at`}
              type="datetime-local"
              step={60}
              required={Boolean(measurement.value.trim())}
              value={measurement.recordedAt}
              onChange={(event) => onChange({ recordedAt: event.target.value })}
              aria-invalid={Boolean(measurement.value.trim() && !measurement.recordedAt)}
            />
          </div>
          <div>
            <label htmlFor={`${id}-source`}>Data source</label>
            <select
              id={`${id}-source`}
              value={measurement.source}
              onChange={(event) => onChange({ source: event.target.value as MeasurementSource })}
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="measurement-notes-field">
            <label htmlFor={`${id}-notes`}>Optional notes</label>
            <textarea
              id={`${id}-notes`}
              rows={2}
              value={measurement.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Context for this specific reading"
            />
          </div>
        </div>
      </details>
    </div>
  );
}

export default function HealthAssessmentForm() {
  const [draft, setDraft] = useState<AssessmentDraft>(() => createEmptyDraft(""));
  const [records, setRecords] = useState<StructuredAssessmentRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [canSaveLocally, setCanSaveLocally] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storageError, setStorageError] = useState("");
  const [importMessage, setImportMessage] = useState<{ group: ImportGroup; text: string } | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<StructuredAssessmentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [scanMessageIndex, setScanMessageIndex] = useState(0);
  const [backendAssessmentId, setBackendAssessmentId] = useState("");
  const [reportUnavailable, setReportUnavailable] = useState(false);
  const submissionInProgress = useRef(false);

  const loadRecords = useCallback(() => {
    try {
      const saved = window.localStorage.getItem(ASSESSMENT_STORAGE_KEY);
      if (!saved) {
        setRecords([]);
        setStorageError("");
        setCanSaveLocally(true);
        return;
      }
      const parsed = parseStoredAssessments(saved);
      setRecords(parsed.records);
      setCanSaveLocally(parsed.invalidCount === 0);
      setStorageError(
        parsed.invalidCount
          ? `${parsed.invalidCount} invalid record(s) were skipped. Saving is disabled to avoid replacing unreadable history.`
          : "",
      );
    } catch {
      setRecords([]);
      setCanSaveLocally(false);
      setStorageError("Saved assessments could not be read. Existing data has not been changed.");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      setDraft(createEmptyDraft(localDateTimeValue()));
      loadRecords();
    }, 0);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ASSESSMENT_STORAGE_KEY || event.key === null) loadRecords();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", loadRecords);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", loadRecords);
    };
  }, [loadRecords]);

  useEffect(() => {
    if (!isSubmitting) return;
    const intervalId = window.setInterval(() => {
      setScanMessageIndex((current) => (current + 1) % scanMessages.length);
    }, 1400);
    return () => window.clearInterval(intervalId);
  }, [isSubmitting]);

  const latestRows = useMemo(
    () => submittedRecord ? measurementRows(submittedRecord) : [],
    [submittedRecord],
  );
  const reviewRows = useMemo(() => draftReviewRows(draft), [draft]);

  function updateMeasurement(
    group: MeasurementGroup | "visionMeasurements",
    fieldId: string,
    change: Partial<DraftMeasurement>,
  ) {
    setDraft((current) => {
      if (group === "visionMeasurements") {
        return {
          ...current,
          groups: {
            ...current.groups,
            visionAndSymptoms: {
              ...current.groups.visionAndSymptoms,
              measurements: {
                ...current.groups.visionAndSymptoms.measurements,
                [fieldId]: { ...current.groups.visionAndSymptoms.measurements[fieldId], ...change },
              },
            },
          },
        };
      }
      return {
        ...current,
        groups: {
          ...current.groups,
          [group]: {
            ...current.groups[group],
            [fieldId]: { ...current.groups[group][fieldId], ...change },
          },
        },
      };
    });
    setSubmittedRecord(null);
    setErrors((current) => {
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  async function importJson(
    event: ChangeEvent<HTMLInputElement>,
    group: ImportGroup,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportMessage(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("The import must be a JSON object.");
      }
      const root = parsed as Record<string, unknown>;
      const groups = typeof root.groups === "object" && root.groups !== null
        ? root.groups as Record<string, unknown>
        : root;
      const importedGroup = groups[group];
      if (typeof importedGroup !== "object" || importedGroup === null || Array.isArray(importedGroup)) {
        throw new Error(`The JSON file must contain a "${group}" object.`);
      }
      const values = importedGroup as Record<string, unknown>;
      const fields: readonly FieldConfig[] = sectionFields[group];
      const knownFields = new Map(fields.map((field) => [field.id, field]));
      let applied = 0;
      let invalid = 0;
      let unknown = 0;
      const changes: Record<string, Partial<DraftMeasurement>> = {};
      for (const [key, rawEntry] of Object.entries(values)) {
        const field = knownFields.get(key);
        if (!field) {
          unknown += 1;
          continue;
        }
        const entry =
          typeof rawEntry === "object" && rawEntry !== null && !Array.isArray(rawEntry)
            ? rawEntry as Record<string, unknown>
            : { value: rawEntry };
        if (typeof entry.value !== "string" && typeof entry.value !== "number") {
          invalid += 1;
          continue;
        }
        const value = String(entry.value);
        const validationError = validateField(field, value);
        const unit = typeof entry.unit === "string" ? entry.unit : field.unit;
        if (
          validationError ||
          (field.unitOptions
            ? !field.unitOptions.includes(unit)
            : field.customUnit
              ? !unit.trim()
              : unit !== field.unit)
        ) {
          invalid += 1;
          continue;
        }
        const date = typeof entry.recordedAt === "string" ? new Date(entry.recordedAt) : new Date();
        if (Number.isNaN(date.getTime())) {
          invalid += 1;
          continue;
        }
        changes[key] = {
          value,
          unit,
          recordedAt: localDateTimeValue(date),
          source: "imported",
          notes: typeof entry.notes === "string" ? entry.notes : "",
        };
        applied += 1;
      }
      if (!applied) {
        throw new Error(
          invalid
            ? "No valid readings were imported. Check field names, values and units."
            : "No recognized readings were found in this file.",
        );
      }
      setDraft((current) => ({
        ...current,
        groups: {
          ...current.groups,
          [group]: { ...current.groups[group], ...Object.fromEntries(
            Object.entries(changes).map(([key, change]) => [
              key,
              { ...current.groups[group][key], ...change },
            ]),
          ) },
        },
      }));
      setSubmittedRecord(null);
      setImportMessage({
        group,
        text: `${applied} reading${applied === 1 ? "" : "s"} imported${invalid ? `; ${invalid} invalid item(s) skipped` : ""}${unknown ? `; ${unknown} unrecognized item(s) skipped` : ""}.`,
      });
    } catch (error) {
      setImportMessage({
        group,
        text: error instanceof Error ? error.message : "The JSON file could not be imported.",
      });
    }
  }

  function validateDraft(
    groupScope?: readonly (keyof AssessmentGroups)[],
    includeAssessmentDate = true,
  ) {
    const nextErrors: Record<string, string> = {};
    for (const [group, fields] of Object.entries(sectionFields)) {
      if (groupScope && !groupScope.includes(group as keyof AssessmentGroups)) continue;
      for (const field of fields) {
        const measurement =
          group === "visionAndSymptoms"
            ? draft.groups.visionAndSymptoms.measurements[field.id]
            : draft.groups[group as MeasurementGroup][field.id];
        if (!measurement) continue;
        const valueError = validateField(field, measurement.value);
        if (valueError) nextErrors[field.id] = valueError;
        if (measurement.value.trim()) {
          if (!measurement.unit.trim()) {
            nextErrors[field.id] = "Enter the unit reported by the source.";
          } else if (!measurement.recordedAt || Number.isNaN(new Date(measurement.recordedAt).getTime())) {
            nextErrors[field.id] = "Enter a valid date and time for this reading.";
          }
        }
      }
    }
    if (
      includeAssessmentDate &&
      (!draft.assessmentDate || Number.isNaN(new Date(draft.assessmentDate).getTime()))
    ) {
      nextErrors.assessmentDate = "Enter a valid assessment date and time.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function advanceStep() {
    if (currentStep >= 4) return;
    const groups = stageGroups[currentStep];
    if (groups && !validateDraft(groups, false)) return;
    setErrors({});
    setBackendError("");
    setCurrentStep((current) => Math.min(current + 1, 4));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentStep !== 4) {
      advanceStep();
      return;
    }
    if (submissionInProgress.current) return;

    setStorageError("");
    setBackendError("");

    if (!isLoaded || !canSaveLocally) {
      setStorageError(
        "Saved history could not be read safely, so this assessment was not submitted."
      );
      return;
    }

    if (!validateDraft()) return;

    submissionInProgress.current = true;
    setScanMessageIndex(0);
    setIsSubmitting(true);

    try {
      const record: StructuredAssessmentRecord = makeStoredRecord(draft);

      const response = await fetch(
        "http://127.0.0.1:8000/assessments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(record),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const validationIssues =
          errorData.detail?.validation_issues;

        if (validationIssues && validationIssues.length > 0) {
          throw new Error(validationIssues.join("\n"));
        }

        throw new Error(
          errorData.detail?.message ||
          "The backend could not save this assessment."
        );
      }

      let responseData: unknown;
      try {
        responseData = await response.json();
        setReportUnavailable(false);
      } catch {
        setReportUnavailable(true);
      }
      const result =
        typeof responseData === "object" && responseData !== null
          ? responseData as Record<string, unknown>
          : {};
      const analysis = isAssessmentAnalysis(result.analysis)
        ? result.analysis
        : undefined;
      const assessmentId =
        typeof result.assessment_id === "string"
          ? result.assessment_id
          : analysis?.assessment_id ?? "";
      const savedRecord = analysis ? { ...record, analysis } : record;

      setReportUnavailable(!assessmentId && !analysis);
      setBackendAssessmentId(assessmentId);
      setSubmittedRecord(savedRecord);
      setBackendError("");
      setStorageError("");

      const nextRecords = [...records, savedRecord];
      try {
        window.localStorage.setItem(
          ASSESSMENT_STORAGE_KEY,
          JSON.stringify({
            version: ASSESSMENT_STORAGE_VERSION,
            records: nextRecords,
          })
        );
        setRecords(nextRecords);
      } catch {
        setStorageError(
          "The backend accepted this assessment, but its local history copy could not be saved."
        );
      }
    } catch (error) {
      console.error("Assessment submission error:", error);
      setBackendError(
        error instanceof Error
          ? error.message
          : "Could not connect to the backend. Please try again."
      );
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  function startNewAssessment() {
    setDraft(createEmptyDraft(localDateTimeValue()));
    setSubmittedRecord(null);
    setErrors({});
    setImportMessage(null);
    setStorageError("");
    setBackendError("");
    setBackendAssessmentId("");
    setReportUnavailable(false);
    setCurrentStep(0);
  }

  return (
    <main className="content astronaut-assessment-page">
      <div className="assessment-console">
        <header className="assessment-console-header">
          <div className="assessment-title-block">
            <span className="assessment-orbit-mark" aria-hidden="true">✦</span>
            <div>
              <p className="assessment-eyebrow">ASTRO CODE BLUE / CREW HEALTH RECORD</p>
              <h1>ASTRONAUT HEALTH SCAN</h1>
              <p className="assessment-subtitle">Initiate your personal health assessment.</p>
            </div>
          </div>
          <div className="assessment-local-status">
            <i aria-hidden="true" />
            <span>SECURE LINK · BACKEND SUBMISSION ENABLED</span>
          </div>
        </header>

        {currentStep === 0 && !submittedRecord && (
          <section className="scan-welcome" aria-labelledby="scan-welcome-title">
            <div className="scan-welcome-copy">
              <span className="assessment-section-kicker">MISSION MEDICAL SYSTEM / READY</span>
              <h2 id="scan-welcome-title">Initialize medical scan</h2>
              <p>
                Complete four guided assessment stages from the spacecraft medical console.
                Enter only information you have observed or measured; unavailable readings may
                be left blank.
              </p>
              <ul className="scan-welcome-facts">
                <li><span aria-hidden="true">01</span> Vital signs</li>
                <li><span aria-hidden="true">02</span> Sleep &amp; physical condition</li>
                <li><span aria-hidden="true">03</span> Symptoms assessment</li>
                <li><span aria-hidden="true">04</span> Review &amp; submit</li>
              </ul>
              <button
                className="assessment-submit-button scan-start-button"
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={!isLoaded}
              >
                {isLoaded ? "START SCAN" : "INITIALIZING..."}
                <span aria-hidden="true">→</span>
              </button>
              <p className="scan-welcome-note">
                The scanning sequence is a visual presentation while your assessment is submitted.
                It does not perform medical imaging.
              </p>
            </div>
            <div className="scan-chamber" aria-hidden="true">
              <span className="chamber-label chamber-label-top">MEDICAL BAY / 01</span>
              <div className="chamber-arch">
                <div className="chamber-ring chamber-ring-outer" />
                <div className="chamber-ring chamber-ring-inner" />
                <div className="scan-image-frame">
                  <div
                    className="scan-chamber-image"
                    aria-hidden="true"
                    style={{ backgroundImage: `url("${astronautImage.src}")` }}
                  />
                </div>
                <span className="chamber-scan-line" />
              </div>
              <span className="chamber-label chamber-label-bottom">SUBJECT STATUS / AWAITING INPUT</span>
              <span className="chamber-coordinate">00° 00′ 00″ N<br />SPACECRAFT MEDICAL BAY</span>
            </div>
          </section>
        )}

        {currentStep > 0 && !submittedRecord && (
          <div className="assessment-intro-strip">
            <div>
              <span className="assessment-section-kicker">CREW DATA COLLECTION</span>
              <p>Enter only observed or measured information. Unavailable readings may be left blank.</p>
            </div>
            <span className="assessment-record-count">{isLoaded ? `${records.length} SAVED RECORDS` : "LOADING HISTORY"}</span>
          </div>
        )}

        {storageError && <p className="assessment-alert" role="alert">{storageError}</p>}

        {currentStep > 0 && !submittedRecord && (
          <form className="astronaut-assessment-form" onSubmit={handleSubmit} noValidate>
          <nav className="assessment-progress" aria-label="Assessment progress">
            <div className="assessment-progress-heading">
              <span className="assessment-section-kicker">HEALTH ASSESSMENT / STAGE {String(currentStep).padStart(2, "0")} OF 04</span>
              <span>{Math.round((currentStep / assessmentStages.length) * 100)}% COMPLETE</span>
            </div>
            <ol>
              {assessmentStages.map((stage, index) => {
                const stageNumber = index + 1;
                return (
                  <li
                    className={stageNumber < currentStep ? "is-complete" : stageNumber === currentStep ? "is-current" : ""}
                    key={stage.number}
                  >
                    {stageNumber < currentStep ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(stageNumber)}
                        aria-label={`Return to ${stage.title}`}
                      >
                        <span className="assessment-progress-number" aria-hidden="true">✓</span>
                        <span>{stage.detail}</span>
                      </button>
                    ) : (
                      <span aria-current={stageNumber === currentStep ? "step" : undefined}>
                        <span className="assessment-progress-number" aria-hidden="true">{stage.number}</span>
                        <span>{stage.detail}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          {backendError && (
            <div className="assessment-alert" role="alert">
              {backendError}
            </div>
          )}
          {currentStep === 4 && (
          <section className="assessment-datetime-panel">
            <div>
              <span className="assessment-section-kicker">RECORD METADATA</span>
              <h2>Assessment date &amp; time</h2>
              <p>Use the date and local time the assessment was recorded.</p>
            </div>
            <div className="assessment-datetime-control">
              <label htmlFor="assessment-date-time">Date &amp; time</label>
              <input
                id="assessment-date-time"
                type="datetime-local"
                step={60}
                required
                value={draft.assessmentDate}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, assessmentDate: event.target.value }));
                  setSubmittedRecord(null);
                  setErrors((current) => ({ ...current, assessmentDate: "" }));
                }}
                aria-invalid={Boolean(errors.assessmentDate)}
              />
              {errors.assessmentDate && <span className="assessment-field-error">{errors.assessmentDate}</span>}
            </div>
          </section>
          )}

          <div className="assessment-sections">
            {sectionMeta.filter((section) => stageGroups[currentStep]?.includes(section.id)).map((section) => {
              return (
                <details
                  className="assessment-section"
                  key={section.id}
                  open
                >
                  <summary>
                    <span className="assessment-section-number">{section.number}</span>
                    <span className="assessment-section-summary">
                      <strong>{section.title}</strong>
                      <small>{section.description}</small>
                    </span>
                    <span className="assessment-section-chevron" aria-hidden="true">+</span>
                  </summary>
                  <div className="assessment-section-body">
                    {section.id === "sleepAndWellness" && (
                      <div className="assessment-field-grid">
                        {sectionFields.sleepAndWellness.map((field) => (
                          <MeasurementInput
                            key={field.id}
                            field={field}
                            measurement={draft.groups.sleepAndWellness[field.id]}
                            error={errors[field.id]}
                            onChange={(change) => updateMeasurement("sleepAndWellness", field.id, change)}
                          />
                        ))}
                      </div>
                    )}

                    {section.id === "cognitiveHealth" && (
                      <>
                        <div className="assessment-guidance-callout">
                          <strong>WinSCAT is a specialized assessment</strong>
                          <p>WinSCAT takes approximately 11–15 minutes in the supplied research. Enter or import original results only when available; this form does not provide a substitute test or create scores.</p>
                          <label className="assessment-import-button">
                            <span>IMPORT RECORDED RESULTS</span>
                            <input
                              type="file"
                              accept=".json,application/json"
                              onChange={(event) => void importJson(event, "cognitiveHealth")}
                            />
                          </label>
                        </div>
                        <details className="assessment-import-help">
                          <summary>Accepted JSON structure</summary>
                          <p>Use a <code>cognitiveHealth</code> object with field names matching the result inputs. Each value may include <code>value</code>, <code>unit</code>, <code>recordedAt</code> and <code>notes</code>.</p>
                        </details>
                        {importMessage?.group === "cognitiveHealth" && <p className="assessment-import-status" role="status">{importMessage.text}</p>}
                        <div className="assessment-field-grid">
                          {sectionFields.cognitiveHealth.map((field) => (
                            <MeasurementInput
                              key={field.id}
                              field={field}
                              measurement={draft.groups.cognitiveHealth[field.id]}
                              error={errors[field.id]}
                              onChange={(change) => updateMeasurement("cognitiveHealth", field.id, change)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {section.id === "visionAndSymptoms" && (
                      <>
                        <div className="assessment-field-grid">
                          {sectionFields.visionAndSymptoms.map((field) => (
                            <MeasurementInput
                              key={field.id}
                              field={field}
                              measurement={draft.groups.visionAndSymptoms.measurements[field.id]}
                              error={errors[field.id]}
                              onChange={(change) => updateMeasurement("visionMeasurements", field.id, change)}
                            />
                          ))}
                        </div>
                        <div className="symptom-entry-panel">
                          <div className="symptom-entry-heading">
                            <div>
                              <span className="assessment-section-kicker">SELF-REPORTED</span>
                              <h3>Symptoms to record</h3>
                            </div>
                            <span>Select any that apply</span>
                          </div>
                          <div className="symptom-selector-grid">
                            {symptomNames.map((symptom) => {
                              const entry = draft.groups.visionAndSymptoms.symptoms[symptom];
                              const symptomId = `symptom-${symptom.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                              return (
                                <div className={`symptom-selector${entry.selected ? " is-selected" : ""}`} key={symptom}>
                                  <label htmlFor={symptomId}>
                                    <input
                                      id={symptomId}
                                      type="checkbox"
                                      checked={entry.selected}
                                      onChange={(event) => {
                                        setDraft((current) => ({
                                          ...current,
                                          groups: {
                                            ...current.groups,
                                            visionAndSymptoms: {
                                              ...current.groups.visionAndSymptoms,
                                              symptoms: {
                                                ...current.groups.visionAndSymptoms.symptoms,
                                                [symptom]: { ...entry, selected: event.target.checked },
                                              },
                                            },
                                          },
                                        }));
                                        setSubmittedRecord(null);
                                      }}
                                    />
                                    <span>{symptom}</span>
                                  </label>
                                  {entry.selected && (
                                    <div className="symptom-details">
                                      <label htmlFor={`${symptomId}-severity`}>Severity</label>
                                      <select
                                        id={`${symptomId}-severity`}
                                        value={entry.severity}
                                        onChange={(event) => {
                                          setDraft((current) => ({
                                            ...current,
                                            groups: {
                                              ...current.groups,
                                              visionAndSymptoms: {
                                                ...current.groups.visionAndSymptoms,
                                                symptoms: {
                                                  ...current.groups.visionAndSymptoms.symptoms,
                                                  [symptom]: { ...entry, severity: event.target.value as SymptomReport["severity"] },
                                                },
                                              },
                                            },
                                          }));
                                          setSubmittedRecord(null);
                                        }}
                                      >
                                        <option value="unspecified">Not specified</option>
                                        <option value="mild">Mild</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="severe">Severe</option>
                                      </select>
                                      <label htmlFor={`${symptomId}-notes`}>Notes</label>
                                      <textarea
                                        id={`${symptomId}-notes`}
                                        rows={2}
                                        value={entry.notes}
                                        placeholder={symptom === "Other symptoms" ? "Describe the symptom" : "Optional details"}
                                        onChange={(event) => {
                                          setDraft((current) => ({
                                            ...current,
                                            groups: {
                                              ...current.groups,
                                              visionAndSymptoms: {
                                                ...current.groups.visionAndSymptoms,
                                                symptoms: {
                                                  ...current.groups.visionAndSymptoms.symptoms,
                                                  [symptom]: { ...entry, notes: event.target.value },
                                                },
                                              },
                                            },
                                          }));
                                          setSubmittedRecord(null);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="symptom-entry-note">Symptoms are self-reported observations, not diagnoses.</p>
                        </div>
                      </>
                    )}

                    {section.id === "vitalSigns" && (
                      <>
                        <p className="assessment-section-note">Leave any reading blank if the measurement or device is unavailable.</p>
                        <div className="assessment-field-grid">
                          {sectionFields.vitalSigns.map((field) => (
                            <MeasurementInput
                              key={field.id}
                              field={field}
                              measurement={draft.groups.vitalSigns[field.id]}
                              error={errors[field.id]}
                              visual={field.kind === "number"}
                              onChange={(change) => updateMeasurement("vitalSigns", field.id, change)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {section.id === "spaceEnvironment" && (
                      <>
                        <div className="assessment-guidance-callout">
                          <strong>Use spacecraft sensor or radiation-monitor records</strong>
                          <p>These are environmental readings, not self-estimated values. Import a JSON record or enter values from available monitoring equipment.</p>
                          <label className="assessment-import-button">
                            <span>IMPORT SENSOR RECORD</span>
                            <input
                              type="file"
                              accept=".json,application/json"
                              onChange={(event) => void importJson(event, "spaceEnvironment")}
                            />
                          </label>
                        </div>
                        <details className="assessment-import-help">
                          <summary>Accepted JSON structure</summary>
                          <p>Use a <code>spaceEnvironment</code> object with field names matching the inputs. Each value may include <code>value</code>, <code>unit</code>, <code>recordedAt</code> and <code>notes</code>. Imported readings are labeled as imported.</p>
                        </details>
                        {importMessage?.group === "spaceEnvironment" && <p className="assessment-import-status" role="status">{importMessage.text}</p>}
                        <div className="assessment-field-grid">
                          {sectionFields.spaceEnvironment.map((field) => (
                            <MeasurementInput
                              key={field.id}
                              field={field}
                              measurement={draft.groups.spaceEnvironment[field.id]}
                              error={errors[field.id]}
                              onChange={(change) => updateMeasurement("spaceEnvironment", field.id, change)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {section.id === "specializedMedical" && (
                      <>
                        <div className="assessment-guidance-callout specialized-note">
                          <strong>Optional professional results only</strong>
                          <p>These assessments require appropriate equipment and professional interpretation. DXA bone-density results are generally obtained pre-flight or post-flight in the supplied research; they are not daily self-assessment inputs.</p>
                        </div>
                        <div className="assessment-field-grid">
                          {sectionFields.specializedMedical.map((field) => (
                            <MeasurementInput
                              key={field.id}
                              field={field}
                              measurement={draft.groups.specializedMedical[field.id]}
                              error={errors[field.id]}
                              onChange={(change) => updateMeasurement("specializedMedical", field.id, change)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </div>

          {currentStep === 2 && <section className="assessment-notes-panel">
            <label htmlFor="assessment-additional-notes">Additional assessment notes <span>Optional</span></label>
            <textarea
              id="assessment-additional-notes"
              rows={3}
              value={draft.assessmentNotes}
              onChange={(event) => {
                setDraft((current) => ({ ...current, assessmentNotes: event.target.value }));
                setSubmittedRecord(null);
              }}
              placeholder="Add context that does not fit a specific measurement."
            />
          </section>}

          {currentStep === 4 && (
            <section className="assessment-review" aria-labelledby="assessment-review-title">
              <div className="assessment-review-heading">
                <div>
                  <span className="assessment-section-kicker">FINAL CHECK / RECORD DATE {formatRecordedDate(draft.assessmentDate)}</span>
                  <h2 id="assessment-review-title">Review your assessment</h2>
                </div>
                <span className="assessment-review-count">{reviewRows.length + Object.values(draft.groups.visionAndSymptoms.symptoms).filter((item) => item.selected).length} RECORDED ITEMS</span>
              </div>
              {[
                {
                  title: "Vital signs",
                  rows: reviewRows.filter((row) => row.group === "vitalSigns"),
                  symptoms: [],
                },
                {
                  title: "Sleep & physical condition",
                  rows: reviewRows.filter((row) =>
                    ["sleepAndWellness", "cognitiveHealth", "spaceEnvironment", "specializedMedical"].includes(row.group),
                  ),
                  symptoms: [],
                },
                {
                  title: "Symptoms & vision",
                  rows: reviewRows.filter((row) => row.group === "visionAndSymptoms"),
                  symptoms: symptomNames.flatMap((symptom) => {
                    const item = draft.groups.visionAndSymptoms.symptoms[symptom];
                    return item.selected
                      ? [{ label: symptom === "Other symptoms" ? item.notes || symptom : symptom, detail: item.severity }]
                      : [];
                  }),
                },
              ].map((category) => (
                <section className="assessment-review-group" key={category.title}>
                  <h3>{category.title}</h3>
                  {category.rows.length === 0 && category.symptoms.length === 0 ? (
                    <p className="assessment-review-empty">No readings or reports entered.</p>
                  ) : (
                    <ul>
                      {category.rows.map((row) => (
                        <li key={`${row.group}-${row.label}`}>
                          <span>{row.label}</span>
                          <strong>{row.value} <small>{row.unit}</small></strong>
                        </li>
                      ))}
                      {category.symptoms.map((symptom) => (
                        <li key={`${symptom.label}-${symptom.detail}`}>
                          <span>{symptom.label}</span>
                          <strong>{symptom.detail}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              {draft.assessmentNotes.trim() && (
                <p className="assessment-review-notes"><strong>Additional notes:</strong> {draft.assessmentNotes}</p>
              )}
            </section>
          )}

          <div className="assessment-form-footer">
            <p><i aria-hidden="true" /> Values are recorded as entered; unavailable readings stay blank.</p>
            <div>
              <button
                className="assessment-secondary-button"
                type="button"
                onClick={() => {
                  setCurrentStep((current) => Math.max(current - 1, 0));
                  setErrors({});
                }}
                disabled={isSubmitting}
              >
                BACK
              </button>
              {currentStep < 4 ? (
                <button
                  className="assessment-submit-button"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    advanceStep();
                  }}
                >
                  CONTINUE
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="assessment-submit-button"
                  type="submit"
                  disabled={!isLoaded || isSubmitting}
                >
                  {isSubmitting ? "SUBMITTING..." : backendError ? "RETRY SUBMISSION" : "CONFIRM AND SUBMIT"}
                  <span aria-hidden="true">{isSubmitting ? "…" : "→"}</span>
                </button>
              )}
            </div>
          </div>
          <p className="assessment-storage-disclaimer">
            Confirming submits this assessment to the existing mission backend. A local copy is retained for browser history.
          </p>
          </form>
        )}

        {isSubmitting && (
          <div className="medical-scan-overlay" role="status" aria-live="polite" aria-busy="true">
            <div className="medical-scan-panel">
              <div className="medical-scan-visual" aria-hidden="true">
                <span className="medical-scan-orbit medical-scan-orbit-one" />
                <span className="medical-scan-orbit medical-scan-orbit-two" />
                <div className="scan-image-frame scan-image-frame-overlay">
                  <div
                    className="scan-chamber-image"
                    aria-hidden="true"
                    style={{ backgroundImage: `url("${astronautImage.src}")` }}
                  />
                </div>
                <span className="medical-scan-beam" />
              </div>
              <span className="assessment-section-kicker">SECURE UPLINK / LIVE SUBMISSION</span>
              <h2>Scanning in progress</h2>
              <p>{scanMessages[scanMessageIndex]}</p>
              <div className="medical-scan-progress" aria-hidden="true">
                <span />
              </div>
              <small>Your assessment is being submitted. This visual sequence is not medical imaging.</small>
            </div>
          </div>
        )}

        {submittedRecord && (
          <section className="assessment-submission-summary" role="status" aria-live="polite" aria-labelledby="assessment-submission-title">
            <div className="submission-success-mark" aria-hidden="true">✓</div>
            <div className="submission-summary-content">
              <span className="assessment-section-kicker">MISSION MEDICAL SYSTEM / SUBMISSION COMPLETE</span>
              <h2 id="assessment-submission-title">Assessment completed</h2>
              <p>{countRecordedValues(submittedRecord)} recorded item(s) submitted at {formatRecordedDate(submittedRecord.submittedAt)}.</p>
              {backendAssessmentId && (
                <p className="assessment-result-id">ASSESSMENT ID <strong>{backendAssessmentId}</strong></p>
              )}
              {reportUnavailable ? (
                <p className="assessment-result-note">The backend accepted the assessment, but no report details were included in its response.</p>
              ) : submittedRecord.analysis ? (
                <div className="assessment-backend-analysis">
                  <h3>Health insights returned by the backend</h3>
                  {submittedRecord.analysis.insights.length ? (
                    <ul>{submittedRecord.analysis.insights.map((insight, index) => <li key={`${index}-${insight}`}>{insight}</li>)}</ul>
                  ) : (
                    <p>No insights were returned for this assessment.</p>
                  )}
                  <h3>Historical changes</h3>
                  {submittedRecord.analysis.historical_changes.length ? (
                    <ul>{submittedRecord.analysis.historical_changes.map((change, index) => <li key={`${index}-${change}`}>{change}</li>)}</ul>
                  ) : (
                    <p>No historical changes were returned.</p>
                  )}
                </div>
              ) : (
                <p className="assessment-result-note">The backend response did not include health insights or historical changes.</p>
              )}
              {latestRows.length > 0 ? (
                <div className="submission-measurement-list">
                  {latestRows.map((row, index) => (
                    <div className="submission-measurement-row" key={`${row.label}-${index}`}>
                      <span>{row.label}<small>{row.group}</small></span>
                      <strong>{row.value} <small>{row.unit}</small></strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="submission-empty-summary">No measurement values were entered. Your record contains assessment metadata only.</p>
              )}
              {submittedRecord.groups.visionAndSymptoms.symptoms.length > 0 && (
                <div className="submission-symptoms">
                  <strong>SELF-REPORTED SYMPTOMS</strong>
                  <span>{submittedRecord.groups.visionAndSymptoms.symptoms.map((item) => `${item.symptom} · ${item.severity}`).join(" / ")}</span>
                </div>
              )}
              <div className="submission-actions">
                <Link href="/trends">VIEW HEALTH TRENDS <span aria-hidden="true">↗</span></Link>
                <Link href="/guidance">VIEW HEALTH GUIDANCE <span aria-hidden="true">↗</span></Link>
                <button className="assessment-secondary-button" type="button" onClick={startNewAssessment}>
                  NEW ASSESSMENT
                </button>
              </div>
            </div>
          </section>
        )}

        <details className="assessment-history">
          <summary>
            <span className="assessment-history-emblem" aria-hidden="true">⌁</span>
            <span>
              <small className="assessment-section-kicker">LOCAL RECORD ARCHIVE</small>
              <strong>Assessment history</strong>
              <small>{isLoaded ? `${records.length} saved record(s)` : "Loading saved assessments"}</small>
            </span>
            <i aria-hidden="true">+</i>
          </summary>
          {!isLoaded ? (
            <p className="assessment-history-empty">Loading saved records…</p>
          ) : records.length === 0 ? (
            <p className="assessment-history-empty">No saved assessments yet. Saved records will appear here.</p>
          ) : (
            <ol className="assessment-history-list">
              {[...records].reverse().map((record) => {
                const rows = measurementRows(record);
                return (
                  <li key={record.id}>
                    <details>
                      <summary>
                        <span className="assessment-history-date">{formatRecordedDate(record.assessmentDate)}</span>
                        <span>{countRecordedValues(record)} recorded item(s)</span>
                        <i aria-hidden="true">+</i>
                      </summary>
                      {rows.length ? (
                        <div className="assessment-history-values">
                          {rows.map((row, index) => (
                            <div key={`${record.id}-${row.label}-${index}`}>
                              <span>{row.label}</span>
                              <strong>{row.value} <small>{row.unit}</small></strong>
                              <small>{formatRecordedDate(row.recordedAt)} · {row.source}</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="assessment-history-empty">No measurement values were recorded.</p>
                      )}
                      {record.groups.visionAndSymptoms.symptoms.length > 0 && (
                        <p className="assessment-history-symptoms">
                          Self-reported symptoms: {record.groups.visionAndSymptoms.symptoms.map((symptom) => symptom.symptom).join(", ")}
                        </p>
                      )}
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
        </details>

        <details className="assessment-research-note">
          <summary>RESEARCH &amp; DATA BOUNDARIES <span aria-hidden="true">+</span></summary>
          <p>Assessment domains follow the supplied NASA HRP research context and this project&apos;s provided indicators. Values are recorded as entered; this form applies no NASA thresholds, diagnoses, or medication recommendations. Research schedules and specialized tests are context only and do not replace current mission procedures or professional assessment.</p>
        </details>
      </div>
    </main>
  );
}
