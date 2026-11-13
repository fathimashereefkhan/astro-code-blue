import type { AssessmentRecord } from "./health-data";

export const ASSESSMENT_STORAGE_KEY = "astro-code-blue-assessments";
export const ASSESSMENT_STORAGE_VERSION = 2;

export type MeasurementSource =
  | "manual_entry"
  | "self_reported"
  | "device"
  | "medical_test"
  | "imported";

export type MeasurementValue = string | number;

export type AssessmentMeasurement = {
  value: MeasurementValue;
  unit: string;
  recordedAt: string;
  source: MeasurementSource;
  notes?: string;
};

export type SymptomReport = {
  symptom: string;
  severity: "mild" | "moderate" | "severe" | "unspecified";
  recordedAt: string;
  source: "self_reported";
  notes?: string;
};

export type AssessmentGroups = {
  sleepAndWellness: Record<string, AssessmentMeasurement>;
  cognitiveHealth: Record<string, AssessmentMeasurement>;
  visionAndSymptoms: {
    measurements: Record<string, AssessmentMeasurement>;
    symptoms: SymptomReport[];
  };
  vitalSigns: Record<string, AssessmentMeasurement>;
  spaceEnvironment: Record<string, AssessmentMeasurement>;
  specializedMedical: Record<string, AssessmentMeasurement>;
};

export type StructuredAssessmentRecord = {
  schemaVersion: 2;
  id: string;
  assessmentDate: string;
  submittedAt: string;
  groups: AssessmentGroups;
  assessmentNotes?: string;
};

export type AssessmentBackendResponse = {
  actualMeasurements: AssessmentGroups;
  predictions: Array<{
    model: string;
    value: string | number;
    unit?: string;
    generatedAt: string;
  }>;
  recommendations: Array<{
    title: string;
    detail: string;
    source: string;
  }>;
};

const legacyRecordKeys = [
  "heartRate",
  "systolic",
  "diastolic",
  "oxygenSaturation",
  "bodyTemperature",
  "sleepDuration",
  "waterIntake",
] as const;

const validSources: MeasurementSource[] = [
  "manual_entry",
  "self_reported",
  "device",
  "medical_test",
  "imported",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLegacyAssessment(value: unknown): value is AssessmentRecord {
  if (!isObject(value)) return false;
  const record = value;
  return (
    (record.assessmentDate === undefined || typeof record.assessmentDate === "string") &&
    legacyRecordKeys.every((key) => typeof record[key] === "string") &&
    typeof record.observations === "string" &&
    typeof record.submittedAt === "string"
  );
}

function isMeasurement(value: unknown): value is AssessmentMeasurement {
  if (!isObject(value)) return false;
  const measurementValue = value.value;
  return (
    (typeof measurementValue === "string" ||
      (typeof measurementValue === "number" && Number.isFinite(measurementValue))) &&
    typeof value.unit === "string" &&
    typeof value.recordedAt === "string" &&
    !Number.isNaN(Date.parse(value.recordedAt)) &&
    typeof value.source === "string" &&
    validSources.includes(value.source as MeasurementSource) &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isMeasurementGroup(value: unknown): value is Record<string, AssessmentMeasurement> {
  return isObject(value) && Object.values(value).every(isMeasurement);
}

function isSymptomReport(value: unknown): value is SymptomReport {
  if (!isObject(value)) return false;
  return (
    typeof value.symptom === "string" &&
    ["mild", "moderate", "severe", "unspecified"].includes(String(value.severity)) &&
    typeof value.recordedAt === "string" &&
    !Number.isNaN(Date.parse(value.recordedAt)) &&
    value.source === "self_reported" &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isVisionAndSymptoms(value: unknown): value is AssessmentGroups["visionAndSymptoms"] {
  return (
    isObject(value) &&
    isMeasurementGroup(value.measurements) &&
    Array.isArray(value.symptoms) &&
    value.symptoms.every(isSymptomReport)
  );
}

export function isStructuredAssessment(value: unknown): value is StructuredAssessmentRecord {
  if (!isObject(value) || !isObject(value.groups)) return false;
  const groups = value.groups;
  return (
    value.schemaVersion === ASSESSMENT_STORAGE_VERSION &&
    typeof value.id === "string" &&
    typeof value.assessmentDate === "string" &&
    !Number.isNaN(Date.parse(value.assessmentDate)) &&
    typeof value.submittedAt === "string" &&
    !Number.isNaN(Date.parse(value.submittedAt)) &&
    isMeasurementGroup(groups.sleepAndWellness) &&
    isMeasurementGroup(groups.cognitiveHealth) &&
    isVisionAndSymptoms(groups.visionAndSymptoms) &&
    isMeasurementGroup(groups.vitalSigns) &&
    isMeasurementGroup(groups.spaceEnvironment) &&
    isMeasurementGroup(groups.specializedMedical) &&
    (value.assessmentNotes === undefined || typeof value.assessmentNotes === "string")
  );
}

function legacyMeasurement(
  value: string,
  unit: string,
  recordedAt: string,
): AssessmentMeasurement | undefined {
  if (!value.trim()) return undefined;
  return {
    value,
    unit,
    recordedAt: Number.isNaN(Date.parse(recordedAt))
      ? new Date().toISOString()
      : new Date(recordedAt).toISOString(),
    source: "manual_entry",
  };
}

function migrateLegacyAssessment(
  record: AssessmentRecord,
  index: number,
): StructuredAssessmentRecord {
  const recordedAt = record.submittedAt || record.assessmentDate || new Date().toISOString();
  const sleepAndWellness: Record<string, AssessmentMeasurement> = {};
  const vitalSigns: Record<string, AssessmentMeasurement> = {};

  const sleepDuration = legacyMeasurement(record.sleepDuration, "hours", recordedAt);
  const waterIntake = legacyMeasurement(record.waterIntake, "L", recordedAt);
  if (sleepDuration) sleepAndWellness.sleepDuration = sleepDuration;
  if (waterIntake) sleepAndWellness.waterIntake = waterIntake;

  const oldVitalFields = [
    ["heartRate", "BPM"],
    ["systolic", "mmHg"],
    ["diastolic", "mmHg"],
    ["oxygenSaturation", "%"],
    ["bodyTemperature", "°C"],
  ] as const;
  for (const [field, unit] of oldVitalFields) {
    const measurement = legacyMeasurement(record[field], unit, recordedAt);
    if (measurement) vitalSigns[field] = measurement;
  }

  const assessmentDate = record.assessmentDate?.trim() || recordedAt;
  const normalizedDate = Number.isNaN(Date.parse(assessmentDate))
    ? new Date(recordedAt).toISOString()
    : new Date(assessmentDate).toISOString();

  return {
    schemaVersion: ASSESSMENT_STORAGE_VERSION,
    id: `migrated-${index}-${record.submittedAt || "undated"}`,
    assessmentDate: normalizedDate,
    submittedAt: Number.isNaN(Date.parse(recordedAt))
      ? new Date().toISOString()
      : new Date(recordedAt).toISOString(),
    groups: {
      sleepAndWellness,
      cognitiveHealth: {},
      visionAndSymptoms: { measurements: {}, symptoms: [] },
      vitalSigns,
      spaceEnvironment: {},
      specializedMedical: {},
    },
    ...(record.observations.trim()
      ? { assessmentNotes: record.observations.trim() }
      : {}),
  };
}

export function parseStoredAssessments(raw: string): {
  records: StructuredAssessmentRecord[];
  invalidCount: number;
} {
  const parsed: unknown = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    const records: StructuredAssessmentRecord[] = [];
    let invalidCount = 0;
    parsed.forEach((entry, index) => {
      if (isStructuredAssessment(entry)) records.push(entry);
      else if (isLegacyAssessment(entry)) records.push(migrateLegacyAssessment(entry, index));
      else invalidCount += 1;
    });
    return { records, invalidCount };
  }

  if (isObject(parsed) && parsed.version === ASSESSMENT_STORAGE_VERSION && Array.isArray(parsed.records)) {
    const records: StructuredAssessmentRecord[] = [];
    let invalidCount = 0;
    for (const entry of parsed.records) {
      if (isStructuredAssessment(entry)) records.push(entry);
      else invalidCount += 1;
    }
    return { records, invalidCount };
  }

  throw new Error("Saved assessments have an unsupported format.");
}

function measurementValue(
  group: Record<string, AssessmentMeasurement>,
  key: string,
): string {
  const value = group[key]?.value;
  return value === undefined ? "" : String(value);
}

export function toAssessmentRecord(record: StructuredAssessmentRecord): AssessmentRecord {
  const vitalSigns = record.groups.vitalSigns;
  const sleepAndWellness = record.groups.sleepAndWellness;
  return {
    assessmentDate: record.assessmentDate,
    heartRate: measurementValue(vitalSigns, "heartRate"),
    systolic: measurementValue(vitalSigns, "systolic"),
    diastolic: measurementValue(vitalSigns, "diastolic"),
    oxygenSaturation: measurementValue(vitalSigns, "oxygenSaturation"),
    bodyTemperature: measurementValue(vitalSigns, "bodyTemperature"),
    sleepDuration: measurementValue(sleepAndWellness, "sleepDuration"),
    waterIntake: measurementValue(sleepAndWellness, "waterIntake"),
    observations: record.assessmentNotes ?? "",
    submittedAt: record.submittedAt,
  };
}

export const ASSESSMENT_MEASUREMENT_LABELS: Record<string, string> = {
  sleepDuration: "Sleep duration",
  sleepQuality: "Sleep quality",
  sleepDisturbances: "Sleep disturbances",
  bedtime: "Sleep schedule / bedtime",
  exerciseDuration: "Exercise duration",
  exerciseType: "Exercise type",
  waterIntake: "Hydration / water intake",
  fatigueLevel: "Fatigue level",
  moodRating: "Mood rating",
  stressLevel: "Stress level",
  concentrationDifficulty: "Concentration difficulty",
  emotionalDistress: "Isolation / emotional distress",
  reactionTime: "Reaction time",
  attention: "Attention",
  visualWorkingMemory: "Visual working memory",
  verbalWorkingMemory: "Verbal working memory",
  blurredVision: "Blurred vision",
  distortedVision: "Distorted vision",
  nearVisionChanges: "Near vision changes",
  visualAcuity: "Visual acuity",
  amslerGrid: "Amsler grid",
  heartRate: "Heart rate",
  systolic: "Systolic blood pressure",
  diastolic: "Diastolic blood pressure",
  oxygenSaturation: "Oxygen saturation",
  bodyTemperature: "Body temperature",
  respiratoryRate: "Respiratory rate",
  muscleFatigue: "Muscle fatigue",
  exercisePerformance: "Exercise performance",
  cabinCo2: "Cabin CO₂",
  radiationExposure: "Radiation exposure",
  radiationDoseRate: "Radiation dose rate",
  cabinTemperature: "Cabin temperature",
  cabinPressure: "Cabin pressure",
  humidity: "Humidity",
  boneMineralDensity: "Bone mineral density (DXA)",
  boneHealthMarkers: "Bone health markers",
  vitaminD: "Vitamin D",
  octEyeExam: "OCT / eye examination",
  neckVeinUltrasound: "Neck vein ultrasound",
  immuneMarkers: "Immune markers / labs",
};
