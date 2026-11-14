
from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
import database
import models

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from health_analysis import (
    analyze_assessment,
    compare_with_previous,
    validate_measurements
)

app = FastAPI(
    title="ASTRO CODE BLUE API",
    description="Astronaut Health Monitoring Backend",
    version="1.0.0"
)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Allowed measurement sources
MeasurementSource = Literal[
    "manual_entry",
    "self_reported",
    "device",
    "medical_test",
    "imported"
]


# 2. Individual measurement
class AssessmentMeasurement(BaseModel):
    value: str | int | float
    unit: str
    recordedAt: datetime
    source: MeasurementSource
    notes: str | None = None


# 3. Symptom information
class SymptomReport(BaseModel):
    symptom: str
    severity: Literal[
        "mild", "moderate", "severe", "unspecified"
    ]
    recordedAt: datetime
    source: Literal["self_reported"]
    notes: str | None = None


# 4. Vision and symptoms group
class VisionAndSymptoms(BaseModel):
    measurements: dict[str, AssessmentMeasurement]
    symptoms: list[SymptomReport]


# 5. All six assessment groups
class AssessmentGroups(BaseModel):
    sleepAndWellness: dict[str, AssessmentMeasurement]
    cognitiveHealth: dict[str, AssessmentMeasurement]
    visionAndSymptoms: VisionAndSymptoms
    vitalSigns: dict[str, AssessmentMeasurement]
    spaceEnvironment: dict[str, AssessmentMeasurement]
    specializedMedical: dict[str, AssessmentMeasurement]


# 6. Complete assessment record
class StructuredAssessmentRecord(BaseModel):
    schemaVersion: Literal[2]
    id: str
    assessmentDate: datetime
    submittedAt: datetime
    groups: AssessmentGroups
    assessmentNotes: str | None = None

# 7. Home endpoint
@app.get("/")
def home():
    return {
        "message": "Welcome to ASTRO CODE BLUE Backend!",
        "status": "Running successfully"
    }


@app.post("/assessments")
def create_assessment(
    record: StructuredAssessmentRecord,
    db: Session = Depends(database.get_db)
):
    # Convert the submitted assessment into a dictionary
    assessment_data = record.model_dump(mode="json")

    # Validate measurements BEFORE saving
    validation_issues = validate_measurements(assessment_data)

    if validation_issues:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Assessment contains invalid measurements.",
                "validation_issues": validation_issues
            }
        )

    # Get the most recently submitted previous assessment
    previous_assessment = (
        db.query(models.Assessment)
        .filter(models.Assessment.id != record.id)
        .order_by(
            models.Assessment.submittedAt.desc(),
            models.Assessment.id.desc()
        )
        .first()
    )

    db_assessment = models.Assessment(
        id=record.id,
        assessmentDate=record.assessmentDate,
        submittedAt=record.submittedAt,
        groups=record.groups.model_dump(mode="json"),
        assessmentNotes=record.assessmentNotes
    )

    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)

    # Analyse the newly submitted assessment
    analysis = analyze_assessment(assessment_data)

    # Compare with the previous assessment
    historical_changes = []

    if previous_assessment:
        previous_data = {
            "id": previous_assessment.id,
            "groups": previous_assessment.groups
        }

        historical_changes = compare_with_previous(
            assessment_data,
            previous_data
        )

    analysis["historical_changes"] = historical_changes

    # Save analysis results in the database
    db_assessment.analysis = analysis
    db.commit()
    db.refresh(db_assessment)

    return {
        "message": "Assessment saved successfully!",
        "assessment_id": db_assessment.id,
        "status": "success",
        "analysis": analysis
    }


@app.get("/assessments")
def get_assessments(db: Session = Depends(database.get_db)):
    assessments = db.query(models.Assessment).all()

    return [
        {
            "schemaVersion": 2,
            "id": assessment.id,
            "assessmentDate": assessment.assessmentDate,
            "submittedAt": assessment.submittedAt,
            "groups": assessment.groups,
            "assessmentNotes": assessment.assessmentNotes,
            "analysis": assessment.analysis
        }
        for assessment in assessments
    ]
