import type { AssessmentRecord } from "./health-data";

export type GuidanceMeasurementId =
  | "heartRate"
  | "bloodPressure"
  | "oxygenSaturation"
  | "bodyTemperature"
  | "sleepDuration"
  | "waterIntake";

export type GuidanceBackendResult = {
  measurementId: GuidanceMeasurementId;
  observation?: string;
  priority?: "high" | "moderate" | "routine";
  measured: {
    value: string;
    unit: string;
    recordedAt?: string;
  };
  modelPrediction?: {
    value: string;
    unit?: string;
    horizon?: string;
    generatedAt?: string;
    modelName?: string;
  };
  explanation: string;
  preventiveAction: string;
  medicalReview: {
    status: "recommended" | "not-recommended" | "not-assessed";
    detail?: string;
  };
};

export type PersonalizedGuidanceTemplate = {
  id: GuidanceMeasurementId;
  label: string;
  unit: string;
  explanation: string;
  preventiveAction: string;
};

export const personalizedGuidanceTemplates: PersonalizedGuidanceTemplate[] = [
  {
    id: "heartRate",
    label: "Heart rate",
    unit: "BPM",
    explanation:
      "This illustrative value is displayed as recorded. No model interpretation or universal alert threshold is available here.",
    preventiveAction:
      "Continue measurements using the mission-approved monitoring plan and report concerning changes through the approved medical process.",
  },
  {
    id: "bloodPressure",
    label: "Blood pressure",
    unit: "mmHg",
    explanation:
      "This illustrative value is displayed as recorded; this page does not classify it or infer a health outcome.",
    preventiveAction:
      "Follow the approved assessment protocol and raise concerning changes with the crew medical officer or flight surgeon.",
  },
  {
    id: "oxygenSaturation",
    label: "Oxygen saturation",
    unit: "%",
    explanation:
      "This illustrative value is displayed as recorded. No model interpretation or general alert threshold is supplied.",
    preventiveAction:
      "Use the mission-approved measurement procedure and escalation process for concerning changes.",
  },
  {
    id: "bodyTemperature",
    label: "Body temperature",
    unit: "°C",
    explanation:
      "This illustrative value is displayed as recorded and is not a diagnosis or safety assessment.",
    preventiveAction:
      "Follow crew medical guidance if symptoms or concerning measurement changes occur.",
  },
  {
    id: "sleepDuration",
    label: "Sleep duration",
    unit: "hours",
    explanation:
      "The supplied research cites approximately 8 hours as a sleep recommendation, reports average in-flight sleep of about 6 hours, and describes performance impairment after restriction to 5–6 hours within a week. This sample alone does not determine individual risk.",
    preventiveAction:
      "Log sleep and bedtime, protect scheduled rest, and follow mission sleep guidance. Raise persistent sleep concerns with the appropriate medical or behavioral-health support.",
  },
  {
    id: "waterIntake",
    label: "Daily water intake",
    unit: "L",
    explanation:
      "This is a simulated daily intake entry. It is not a hydration target or a personalized assessment.",
    preventiveAction:
      "Record intake according to the mission plan and follow approved hydration and nutrition instructions.",
  },
];

export type SpaceflightHazard = {
  id: string;
  title: string;
  icon: string;
  summary: string;
  affectedSystems: string[];
  indicators: string[];
  preventiveMeasures: string[];
  detailedExplanation: string;
};

export const spaceflightHazards: SpaceflightHazard[] = [
  {
    id: "radiation",
    title: "Space Radiation",
    icon: "☢",
    summary:
      "Space radiation exposure is a mission hazard associated with possible cancer risk and effects on the central nervous system.",
    affectedSystems: ["Central nervous system", "Multiple tissues"],
    indicators: [
      "Radiation dosimeter readings",
      "Space-weather and radiation alerts",
      "Cognitive or neurological symptoms",
    ],
    preventiveMeasures: [
      "Monitor assigned radiation dosimeters.",
      "Follow space-weather alerts and mission communications.",
      "Use the designated storm shelter according to mission procedures.",
    ],
    detailedExplanation:
      "Exposure and operational response depend on the mission environment and current procedures. The project does not estimate an individual's radiation risk or provide an independent dose limit; use the assigned dosimeter, mission alerts and approved shelter instructions.",
  },
  {
    id: "isolation",
    title: "Isolation and Confinement",
    icon: "◉",
    summary:
      "Confinement, workload and altered schedules can affect sleep, circadian timing, mood and psychological well-being.",
    affectedSystems: ["Sleep and circadian rhythms", "Cognition", "Psychological well-being"],
    indicators: [
      "Sleep log and scheduled rest",
      "Workload and fatigue observations",
      "Mood and well-being check-ins",
    ],
    preventiveMeasures: [
      "Maintain scheduled rest and sleep routines.",
      "Continue mission-planned exercise.",
      "Use available psychological support when appropriate.",
    ],
    detailedExplanation:
      "Monitor changes over time and raise concerns through mission support. The listed practices are educational reminders, not a substitute for crew-specific behavioral-health plans.",
  },
  {
    id: "distance",
    title: "Distance from Earth",
    icon: "↗",
    summary:
      "Communication delays and limited immediate ground support make onboard health monitoring and accessible instructions important.",
    affectedSystems: ["All onboard monitored systems", "Crew decision-making"],
    indicators: [
      "Locally recorded health measurements",
      "Symptoms and observations",
      "Availability of onboard procedures and medical resources",
    ],
    preventiveMeasures: [
      "Keep approved health instructions accessible offline.",
      "Record measurements and symptoms using the mission process.",
      "Follow onboard decision and escalation procedures while awaiting ground support.",
    ],
    detailedExplanation:
      "Communication timing and available support vary by mission. This project provides education only and does not replace onboard medical resources or mission-specific autonomous-care procedures.",
  },
  {
    id: "gravity",
    title: "Gravity Fields",
    icon: "◎",
    summary:
      "Microgravity and gravity transitions are associated with fluid shifts, bone-density loss, vision changes, balance difficulties and kidney-stone risk.",
    affectedSystems: ["Cardiovascular system", "Eyes", "Bones", "Balance", "Kidneys"],
    indicators: [
      "Cardiovascular symptoms and assigned assessments",
      "Visual checks and clinician-directed eye assessments",
      "Bone-density and relevant blood or urine markers",
      "Hydration records, balance and motion-sickness symptoms",
    ],
    preventiveMeasures: [
      "Follow mission-planned resistive and aerobic exercise.",
      "Follow approved nutrition and hydration plans.",
      "Report concerning visual, cardiovascular or balance symptoms.",
    ],
    detailedExplanation:
      "Effects differ between people and mission phases. Monitoring methods and responses should follow the flight surgeon's instructions and the current mission protocol; this page does not set universal thresholds.",
  },
  {
    id: "environment",
    title: "Hostile and Closed Environments",
    icon: "▤",
    summary:
      "Spacecraft environmental factors include temperature, pressure, lighting, noise, microbes, cabin CO₂ and immune changes.",
    affectedSystems: ["Respiratory system", "Sleep and cognition", "Immune system"],
    indicators: [
      "Cabin environmental sensors, including CO₂",
      "Headache, sleep, vision, fatigue or nausea symptoms",
      "Environmental-control system status",
    ],
    preventiveMeasures: [
      "Monitor environmental sensors and equipment status.",
      "Follow spacecraft environmental-control procedures.",
      "Alert crew and ground support when required by mission procedures.",
    ],
    detailedExplanation:
      "The supplied NASA CO₂ brief gives 1-hour and 24-hour average reference values at or below 3 mmHg. This reference applies to cabin CO₂ only; use the brief and current environmental-control procedures rather than applying it to other measurements.",
  },
];

export type BodySystemGuidance = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  whatCanHappen: string;
  monitoring: string[];
  preventiveMeasures: string[];
  report: string[];
  researchNote?: string;
};

export const bodySystemGuidance: BodySystemGuidance[] = [
  {
    id: "brain",
    name: "Brain and cognition",
    shortName: "Brain",
    icon: "⌘",
    whatCanHappen:
      "Radiation may affect the central nervous system, cognition and motor function. Sleep loss can reduce attention and reaction speed.",
    monitoring: [
      "Reaction time and sustained attention",
      "Visual and verbal working memory",
      "Mood and sleep observations",
    ],
    preventiveMeasures: [
      "Maintain scheduled sleep and rest.",
      "Continue mission-planned exercise.",
      "Use available psychological well-being support.",
    ],
    report: [
      "Report concerning cognitive, neurological or mood changes through the approved crew medical process.",
    ],
    researchNote:
      "WinSCAT takes approximately 11–15 minutes and is scheduled every 30 days during flight in the supplied research.",
  },
  {
    id: "eyes",
    name: "Eyes and vision",
    shortName: "Eyes",
    icon: "◉",
    whatCanHappen:
      "Fluid shifts toward the head may change vision and are associated with optic-disc swelling in spaceflight-associated neuro-ocular syndrome (SANS).",
    monitoring: ["Visual acuity", "Amsler grid", "OCT", "Ocular ultrasound"],
    preventiveMeasures: [
      "Complete vision monitoring according to mission and clinician instructions.",
      "Record and report changes rather than self-diagnosing.",
    ],
    report: ["Report blurred or distorted vision to the flight surgeon."],
    researchNote:
      "Optic-disc edema was reported in 66% of ISS crew in the cited research supplied for this project.",
  },
  {
    id: "heart",
    name: "Heart and neck veins",
    shortName: "Heart",
    icon: "♡",
    whatCanHappen:
      "Gravity changes and fluid shifts affect cardiovascular adaptation. Transitions in gravity can be associated with lightheadedness or fainting.",
    monitoring: [
      "Cardiovascular assessment",
      "Internal jugular vein ultrasound when directed",
      "Symptoms during gravity transitions",
    ],
    preventiveMeasures: [
      "Follow the mission's cardiovascular and exercise plans.",
      "Monitor symptoms and use the approved reporting process.",
    ],
    report: ["Report concerning changes to the flight surgeon, especially fainting or concerning dizziness during gravity transitions."],
    researchNote:
      "Stagnant or reverse neck-vein flow was observed in 6 of 11 crew members in one supplied study. The research provides no universal cardiovascular alert threshold.",
  },
  {
    id: "lungs",
    name: "Lungs and cabin environment",
    shortName: "Lungs",
    icon: "≋",
    whatCanHappen:
      "Cabin CO₂ accumulation can contribute to headache, poor sleep, blurred vision, fatigue and nausea.",
    monitoring: [
      "Cabin CO₂ sensor readings and the specified averaging periods",
      "Headache, sleep, vision, fatigue and nausea symptoms",
      "Environmental-control and scrubber status",
    ],
    preventiveMeasures: [
      "Follow cabin environmental monitoring and scrubber procedures.",
      "Alert crew and ground support when mission procedures call for it.",
    ],
    report: [
      "Report symptoms and follow crew/ground alert procedures for elevated cabin CO₂ readings.",
    ],
    researchNote:
      "The supplied NASA brief gives CO₂ reference values of 1-hour and 24-hour averages at or below 3 mmHg. This is a CO₂-specific reference, not a threshold for other health measurements.",
  },
  {
    id: "bones",
    name: "Bones",
    shortName: "Bones",
    icon: "⌁",
    whatCanHappen:
      "Weight-bearing bones can lose mineral density in microgravity.",
    monitoring: [
      "DXA bone-density measurements and T-score",
      "Blood and urine markers as assigned",
    ],
    preventiveMeasures: [
      "Follow the mission-planned resistive exercise program.",
      "Follow approved nutrition and vitamin D monitoring guidance.",
    ],
    report: [
      "Discuss concerning results with the flight surgeon; use mission-specific assessment criteria.",
    ],
    researchNote:
      "The supplied research reports that weight-bearing bones can lose approximately 1–1.5% of mineral density per month. This research figure is not an individual prediction.",
  },
  {
    id: "muscles",
    name: "Muscles",
    shortName: "Muscles",
    icon: "⌂",
    whatCanHappen:
      "Reduced gravity can affect musculoskeletal fitness.",
    monitoring: ["Exercise activity", "Musculoskeletal fitness assessments as assigned"],
    preventiveMeasures: [
      "Continue mission-planned resistive and aerobic exercise.",
      "Report difficulty completing planned activity to the appropriate crew medical support.",
    ],
    report: [
      "Follow mission criteria for review; the supplied research does not provide a specific muscle measurement or alert threshold.",
    ],
    researchNote:
      "Reduced musculoskeletal fitness is identified as a Human Research Program risk in the supplied material.",
  },
  {
    id: "kidneys",
    name: "Kidneys",
    shortName: "Kidneys",
    icon: "◒",
    whatCanHappen:
      "Dehydration and calcium loss can increase kidney-stone risk.",
    monitoring: [
      "Hydration records",
      "Relevant blood and urine markers as assigned",
    ],
    preventiveMeasures: [
      "Follow mission-approved fluid and nutrient intake guidance.",
      "Use the assigned monitoring and reporting procedures.",
    ],
    report: [
      "Report concerning symptoms or changes through the approved medical process; no numerical in-flight alert threshold is provided in the supplied research.",
    ],
  },
  {
    id: "inner-ear",
    name: "Inner ear and balance",
    shortName: "Inner ear",
    icon: "◌",
    whatCanHappen:
      "Gravity transitions can be associated with space motion sickness, dizziness, lightheadedness and fainting.",
    monitoring: [
      "Balance and motion-sickness assessment",
      "Recorded dizziness or fainting symptoms",
    ],
    preventiveMeasures: [
      "Use mission-approved countermeasures and transition procedures.",
      "Record symptoms and follow crew medical instructions.",
    ],
    report: ["Report concerning dizziness or fainting, particularly during gravity transitions."],
    researchNote:
      "The supplied research does not provide detailed test procedures or numerical alert thresholds.",
  },
];

export type DailyHealthRoutine = {
  id: string;
  icon: string;
  title: string;
  routine: string;
  frequency: string;
  source: "NASA research" | "Project suggestion" | "Mission protocol";
  systemId: string;
};

export const dailyHealthRoutines: DailyHealthRoutine[] = [
  {
    id: "sleep",
    icon: "◷",
    title: "Sleep",
    routine: "Log rest and bedtime",
    frequency: "Each sleep period",
    source: "Project suggestion",
    systemId: "brain",
  },
  {
    id: "exercise",
    icon: "⌁",
    title: "Exercise",
    routine: "Follow assigned training",
    frequency: "≈2 h/workday · 6–7 sessions/week in supplied research*",
    source: "NASA research",
    systemId: "bones",
  },
  {
    id: "hydration",
    icon: "◌",
    title: "Hydration",
    routine: "Follow assigned fluid plan",
    frequency: "Mission protocol",
    source: "Mission protocol",
    systemId: "kidneys",
  },
  {
    id: "nutrition",
    icon: "⊙",
    title: "Nutrition",
    routine: "Review nutrition plan",
    frequency: "Daily reminder",
    source: "Project suggestion",
    systemId: "bones",
  },
  {
    id: "mood",
    icon: "◎",
    title: "Mood",
    routine: "Record a well-being check-in",
    frequency: "Daily reminder",
    source: "Project suggestion",
    systemId: "brain",
  },
];

export type GuidanceResearchItem = {
  id: string;
  title: string;
  source: string;
  finding: string;
};

export const guidanceResearchItems: GuidanceResearchItem[] = [
  {
    id: "sleep",
    title: "Sleep & performance",
    source: "Supplied NASA HRP research",
    finding:
      "The material cites approximately 8 hours of sleep, reports average in-flight sleep of about 6 hours, and describes performance impairment after restriction to 5–6 hours within a week.",
  },
  {
    id: "brain",
    title: "WinSCAT cognitive assessment",
    source: "Supplied NASA HRP research",
    finding:
      "WinSCAT takes approximately 11–15 minutes and is scheduled every 30 days during flight.",
  },
  {
    id: "eyes",
    title: "Vision changes",
    source: "Supplied NASA HRP research",
    finding:
      "Optic-disc edema was reported in 66% of ISS crew in the cited research. Report blurred or distorted vision to the flight surgeon.",
  },
  {
    id: "bones",
    title: "Bone mineral density",
    source: "Supplied NASA HRP research",
    finding:
      "Weight-bearing bones can lose approximately 1–1.5% of mineral density per month. This research finding is not an individual prediction.",
  },
  {
    id: "co2",
    title: "Cabin CO₂ reference",
    source: "Supplied NASA technical brief",
    finding:
      "The brief gives 1-hour and 24-hour average reference values at or below 3 mmHg. This reference applies to cabin CO₂ only, not other health measurements.",
  },
];

export type MissionRoutineItem = {
  id: string;
  title: string;
  instruction: string;
  frequencyLabel: string;
  frequencyType: "nasa-research" | "project-suggestion";
};

export const missionRoutine: MissionRoutineItem[] = [
  {
    id: "exercise",
    title: "Exercise sessions",
    instruction: "Complete and log sessions scheduled in the approved mission exercise plan.",
    frequencyLabel: "Project reminder · each scheduled session; follow mission plan",
    frequencyType: "project-suggestion",
  },
  {
    id: "sleep",
    title: "Sleep log and bedtime",
    instruction: "Record sleep and bedtime for each rest period; protect scheduled sleep opportunities.",
    frequencyLabel: "Project reminder · each sleep period",
    frequencyType: "project-suggestion",
  },
  {
    id: "nutrition",
    title: "Nutrition and vitamin D",
    instruction: "Review nutrition and vitamin D plans; follow the assigned intake and monitoring instructions.",
    frequencyLabel: "Project reminder · daily check-in (suggested)",
    frequencyType: "project-suggestion",
  },
  {
    id: "mood",
    title: "Mood journal",
    instruction: "Record mood or well-being observations and use support resources when appropriate.",
    frequencyLabel: "Project reminder · daily check-in (suggested)",
    frequencyType: "project-suggestion",
  },
  {
    id: "vision",
    title: "Vision check",
    instruction: "Complete checks on the schedule set by the mission or clinician; report blurred or distorted vision.",
    frequencyLabel: "Project reminder · follow mission schedule; report changes",
    frequencyType: "project-suggestion",
  },
  {
    id: "cognition",
    title: "Cognitive assessment",
    instruction: "Use the mission-specified assessment and record results through the approved process.",
    frequencyLabel: "NASA research example · WinSCAT every 30 days; about 11–15 minutes",
    frequencyType: "nasa-research",
  },
  {
    id: "co2",
    title: "Cabin CO₂ and symptoms",
    instruction: "Review current sensor readings at mission-defined intervals and note relevant symptoms.",
    frequencyLabel: "Project reminder · follow environmental-control procedures; no interval invented",
    frequencyType: "project-suggestion",
  },
  {
    id: "radiation",
    title: "Radiation dose review",
    instruction: "Review dosimeter information and space-weather alerts; use shelter procedures when directed.",
    frequencyLabel: "Project reminder · follow mission-defined review and alert cadence",
    frequencyType: "project-suggestion",
  },
];

export type HelpGuidance = {
  id: string;
  title: string;
  instruction: string;
  action: string;
};

export const whenToSeekHelp: HelpGuidance[] = [
  {
    id: "vision",
    title: "Blurred or distorted vision",
    instruction: "A new or concerning change in vision should not be self-assessed on this page.",
    action: "Report it to the flight surgeon.",
  },
  {
    id: "dizziness",
    title: "Fainting or concerning dizziness",
    instruction: "Especially during or after a gravity transition.",
    action: "Report promptly and follow crew medical instructions.",
  },
  {
    id: "radiation",
    title: "Radiation alert",
    instruction: "Use mission alerts and assigned dosimeter information.",
    action: "Follow designated storm-shelter procedures.",
  },
  {
    id: "co2",
    title: "Elevated cabin CO₂ reading",
    instruction:
      "The supplied CO₂ brief references 1-hour and 24-hour averages at or below 3 mmHg; this value applies only to cabin CO₂.",
    action: "Follow crew and ground alert procedures and environmental-control instructions.",
  },
  {
    id: "measurements",
    title: "Concerning health-measurement change",
    instruction: "This page does not define universal alert thresholds or diagnose conditions.",
    action: "Use the approved medical escalation process and current crew medical guidance.",
  },
];

export function getSampleMeasurement(
  record: AssessmentRecord,
  measurementId: GuidanceMeasurementId,
) {
  if (measurementId === "bloodPressure") {
    return `${record.systolic}/${record.diastolic}`;
  }
  return record[measurementId];
}
