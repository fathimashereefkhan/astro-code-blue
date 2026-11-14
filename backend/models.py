
from sqlalchemy import Column, String, DateTime, JSON
from database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True, index=True)
    assessmentDate = Column(DateTime, nullable=False)
    submittedAt = Column(DateTime, nullable=False)
    groups = Column(JSON, nullable=False)
    assessmentNotes = Column(String, nullable=True)

    # Store automatic analysis results
    analysis = Column(JSON, nullable=True)