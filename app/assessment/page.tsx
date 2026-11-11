"use client";

import { useEffect, useState, type FormEvent } from "react";

type AssessmentFields = {
  assessmentDate: string;
  heartRate: string;
  systolic: string;
  diastolic: string;
  oxygenSaturation: string;
  bodyTemperature: string;
  sleepDuration: string;
  waterIntake: string;
  observations: string;
};

type AssessmentRecord = AssessmentFields & {
  submittedAt: string;
};

type NumericField =
  | "heartRate"
  | "systolic"
  | "diastolic"
  | "oxygenSaturation"
  | "bodyTemperature"
  | "sleepDuration"
  | "waterIntake";

const STORAGE_KEY = "astro-code-blue-assessments";
function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

const numericFields: { name: NumericField; label: string; unit: string }[] = [
  { name: "heartRate", label: "Heart Rate", unit: "BPM" },
  { name: "systolic", label: "Systolic", unit: "mmHg" },
  { name: "diastolic", label: "Diastolic", unit: "mmHg" },
  { name: "oxygenSaturation", label: "Oxygen Saturation", unit: "%" },
  { name: "bodyTemperature", label: "Body Temperature", unit: "°C" },
  { name: "sleepDuration", label: "Sleep Duration", unit: "hours" },
  { name: "waterIntake", label: "Water Intake", unit: "litres" },
];

const emptyFields: AssessmentFields = {
  assessmentDate: "",
  heartRate: "",
  systolic: "",
  diastolic: "",
  oxygenSaturation: "",
  bodyTemperature: "",
  sleepDuration: "",
  waterIntake: "",
  observations: "",
};

function isAssessmentRecord(value: unknown): value is AssessmentRecord {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.submittedAt === "string" &&
    (record.assessmentDate === undefined || typeof record.assessmentDate === "string") &&
    typeof record.heartRate === "string" &&
    typeof record.systolic === "string" &&
    typeof record.diastolic === "string" &&
    typeof record.oxygenSaturation === "string" &&
    typeof record.bodyTemperature === "string" &&
    typeof record.sleepDuration === "string" &&
    typeof record.waterIntake === "string" &&
    typeof record.observations === "string"
  );
}

export default function AssessmentPage() {
  const [fields, setFields] = useState<AssessmentFields>(emptyFields);
  const [errors, setErrors] = useState<Partial<Record<keyof AssessmentFields, string>>>({});
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    setFields((current) => ({ ...current, assessmentDate: getLocalDate() }));
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every(isAssessmentRecord)) {
        throw new Error("Saved assessments have an invalid format.");
      }

      setRecords(parsed);
    } catch {
      setStorageError("Saved assessments could not be loaded from this browser.");
    }
  }, []);

  function updateField(name: keyof AssessmentFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSuccessMessage("");
  }

  function handleReset() {
    setFields({ ...emptyFields, assessmentDate: getLocalDate() });
    setErrors({});
    setSuccessMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");
    setStorageError("");

    const nextErrors: Partial<Record<keyof AssessmentFields, string>> = {};
    if (!fields.assessmentDate) {
      nextErrors.assessmentDate = "This field is required.";
    }

    for (const field of numericFields) {
      const value = fields[field.name].trim();
      if (!value) {
        nextErrors[field.name] = "This field is required.";
      } else if (!/^(?:\d+|\d*\.\d+)$/.test(value) || !Number.isFinite(Number(value))) {
        nextErrors[field.name] = "Enter a valid number.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const record: AssessmentRecord = {
      ...fields,
      submittedAt: new Date().toISOString(),
    };
    const nextRecords = [...records, record];

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
      setRecords(nextRecords);
      setSuccessMessage("Assessment saved to this browser.");
      setFields({ ...emptyFields, assessmentDate: getLocalDate() });
    } catch {
      setStorageError("Assessment could not be saved to this browser. Check local storage availability and try again.");
    }
  }

  return (
    <main className="content assessment-page">
      <div className="assessment-heading">
        <div>
          <h1>Health Assessment</h1>
          <p className="assessment-subtitle">
            Record and monitor astronaut health indicators.
          </p>
        </div>
      </div>

      <form className="panel assessment-form" onSubmit={handleSubmit} noValidate>
        <div className="assessment-form-heading">
          <div>
            <h2>Assessment Details</h2>
            <p>Enter the recorded measurements below.</p>
          </div>
          <span className="required-note">* Required fields</span>
        </div>

        <div className="assessment-fields">
          <div className="assessment-field">
            <label htmlFor="assessment-assessmentDate">
              Assessment Date
              <span className="required-mark" aria-hidden="true"> *</span>
            </label>
            <input
              id="assessment-assessmentDate"
              name="assessmentDate"
              type="date"
              required
              value={fields.assessmentDate}
              onChange={(event) => updateField("assessmentDate", event.target.value)}
              aria-invalid={Boolean(errors.assessmentDate)}
              aria-describedby={errors.assessmentDate ? "assessment-assessmentDate-error" : undefined}
            />
            {errors.assessmentDate && (
              <span className="field-error" id="assessment-assessmentDate-error">
                {errors.assessmentDate}
              </span>
            )}
          </div>

          {numericFields.map((field) => {
            const error = errors[field.name];
            const id = `assessment-${field.name}`;
            return (
              <div className="assessment-field" key={field.name}>
                <label htmlFor={id}>
                  {field.label} <span>({field.unit})</span>
                  <span className="required-mark" aria-hidden="true"> *</span>
                </label>
                <input
                  id={id}
                  name={field.name}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={fields[field.name]}
                  onChange={(event) => updateField(field.name, event.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  placeholder="Enter a value"
                />
                {error && (
                  <span className="field-error" id={`${id}-error`}>
                    {error}
                  </span>
                )}
              </div>
            );
          })}

          <div className="assessment-field assessment-observations">
            <label htmlFor="assessment-observations">Additional Observations</label>
            <textarea
              id="assessment-observations"
              name="observations"
              rows={4}
              value={fields.observations}
              onChange={(event) => updateField("observations", event.target.value)}
              placeholder="Add any notes for this demonstration assessment"
            />
          </div>
        </div>

        {successMessage && (
          <p className="form-message success-message" role="status">
            {successMessage}
          </p>
        )}
        {storageError && (
          <p className="form-message error-message" role="alert">
            {storageError}
          </p>
        )}

        <div className="assessment-actions">
          <button className="submit-button" type="submit">
            Submit Assessment
          </button>
          <button className="reset-button" type="button" onClick={handleReset}>
            Reset Form
          </button>
        </div>
        <p className="demo-disclaimer">
          Demonstration interface only. Submitted information is stored locally
          in this browser and is not sent to a server.
        </p>
      </form>

    </main>
  );
}
