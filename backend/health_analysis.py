
import numpy as np
import pandas as pd


def extract_measurements(assessment):
    """
    Extract all measurements from an astronaut assessment.
    """

    groups = assessment.get("groups", {})

    measurements = []

    for group_name, group_data in groups.items():

        # Vision measurements are nested inside 'measurements'
        if group_name == "visionAndSymptoms":
            group_measurements = group_data.get("measurements", {})
        else:
            group_measurements = group_data

        for measurement_name, measurement_data in group_measurements.items():

            value = measurement_data.get("value")

            measurements.append({
                "category": group_name,
                "measurement": measurement_name,
                "value": value,
                "unit": measurement_data.get("unit"),
                "source": measurement_data.get("source")
            })

    return measurements


def validate_measurements(assessment):
    """
    Check measurement values and units before analysis.
    Returns a list of validation issues.
    """

    measurements = extract_measurements(assessment)

    numeric_measurements = {
        "heartRate",
        "oxygenSaturation",
        "sleepDuration",
        "fatigueLevel",
        "systolic",
        "diastolic",
        "bodyTemperature",
        "waterIntake"
    }

    issues = []

    for item in measurements:

        name = item["measurement"]
        value = item["value"]
        unit = item.get("unit")

        # Check for missing values
        if value is None or str(value).strip() == "":
            issues.append(
                f"{name}: Measurement value is missing."
            )
            continue

        # Check for missing units
        if unit is None or str(unit).strip() == "":
            issues.append(
                f"{name}: Measurement unit is missing."
            )

        # Validate known numerical measurements
        if name in numeric_measurements:

            try:
                numeric_value = float(value)

                if not np.isfinite(numeric_value):
                    raise ValueError

            except (ValueError, TypeError):
                issues.append(
                    f"{name}: Measurement must contain a valid finite number."
                )

    return issues


def compare_with_previous(current_assessment, previous_assessment):

    current_measurements = extract_measurements(current_assessment)
    previous_measurements = extract_measurements(previous_assessment)

    # Friendly names for measurements
    measurement_labels = {
        "sleepDuration": "Sleep duration",
        "heartRate": "Heart rate",
        "oxygenSaturation": "Oxygen saturation",
        "waterIntake": "Water intake",
        "systolic": "Systolic blood pressure",
        "diastolic": "Diastolic blood pressure",
        "bodyTemperature": "Body temperature"
    }

    previous_lookup = {}

    # Store previous numerical measurements
    for item in previous_measurements:

        name = item["measurement"]
        unit = str(item.get("unit") or "").strip().lower()

        value = pd.to_numeric(item["value"], errors="coerce")

        if pd.isna(value) or not np.isfinite(float(value)):
            continue

        previous_lookup[(name, unit)] = float(value)

    changes = []

    # Compare current measurements with previous measurements
    for item in current_measurements:

        name = item["measurement"]
        unit = str(item.get("unit") or "").strip().lower()

        current_value = pd.to_numeric(item["value"], errors="coerce")

        if pd.isna(current_value) or not np.isfinite(float(current_value)):
            continue

        key = (name, unit)

        if key not in previous_lookup:
            continue

        previous_value = previous_lookup[key]
        current_value = float(current_value)

        if np.isclose(current_value, previous_value):
            continue

        display_unit = item.get("unit") or ""
        display_name = measurement_labels.get(name, name)

        if current_value > previous_value:
            direction = "increased"
        else:
            direction = "decreased"

        changes.append(
            f"{display_name} {direction} from "
            f"{previous_value:g} {display_unit} to "
            f"{current_value:g} {display_unit} "
            f"compared with the previous assessment."
        )

    return changes

def analyze_assessment(assessment):
    validation_issues = validate_measurements(assessment)

    measurements = extract_measurements(assessment)

    df = pd.DataFrame(measurements)

    insights = []

    # Analyse numerical measurements
    for _, row in df.iterrows():

        value = pd.to_numeric(row["value"], errors="coerce")

        if pd.isna(value):
            continue

        name = row["measurement"]
        unit = str(row["unit"]).strip().lower()

        if name == "heartRate" and unit == "bpm":
            if value < 50 or value > 100:
                insights.append(
                    "Heart rate reading requires verification."
                )

        elif name == "oxygenSaturation" and unit == "%":
            if value < 95:
                insights.append(
                    "Low oxygen saturation reading. "
                    "Verify immediately and seek medical-team review."
                )

        elif name == "sleepDuration" and unit == "hours":
            if value < 7:
                insights.append(
                    "Sleep duration is below the configured review threshold."
                )

        elif name == "fatigueLevel":
            if value >= 4:
                insights.append(
                    "High fatigue score reported. "
                    "Review workload and recovery."
                )


    
    # Analyse reported symptoms
    groups = assessment.get("groups", {})
    vision_data = groups.get("visionAndSymptoms", {})
    symptoms = vision_data.get("symptoms", [])

    for symptom in symptoms:
        symptom_name = symptom.get("symptom", "Unspecified symptom")
        severity = str(
            symptom.get("severity", "unspecified")
        ).lower()

        if severity == "mild":
            insights.append(
                f"Mild symptom reported: {symptom_name}. "
                "Record and monitor for changes."
            )

        elif severity == "moderate":
            insights.append(
                f"Moderate symptom reported: {symptom_name}. "
                "Review and monitor for changes."
            )

        elif severity == "severe":
            insights.append(
                f"Severe symptom reported: {symptom_name}. "
                "Flag for prompt medical-team review."
            )

        else:
            insights.append(
                f"Symptom reported: {symptom_name}. "
                "Severity is unspecified; review the report."
            )
            

    return {
        "assessment_id": assessment.get("id"),
        "measurements_analyzed": len(measurements),
        "validation_issues": validation_issues,
        "insights": insights
    }
