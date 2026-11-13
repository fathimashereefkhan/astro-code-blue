export type MissionTaskCadence = "daily" | "weekly" | "periodic" | "alert-triggered";
export type MissionTaskPriority = "high" | "routine";
export type MissionTaskSource =
  | "NASA HRP research context"
  | "Project suggestion"
  | "Mission procedure";

export type MissionTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  cadence: MissionTaskCadence;
  repeatEveryDays?: number;
  priority: MissionTaskPriority;
  scheduledTime?: string;
  deadlineAt?: string;
  frequency: string;
  frequencySource: MissionTaskSource;
  whyItMatters: string;
  instructions: string[];
  bodySystems: string[];
  hazards: string[];
  reference: string;
};

export type MissionTaskFeed = {
  source: "simulated" | "backend";
  tasks: MissionTask[];
  completionTimestamps?: Record<string, string>;
};

export const missionTaskDefinitions: MissionTask[] = [
  {
    id: "exercise-session",
    title: "Complete exercise session",
    description: "Complete and record the exercise session assigned in the mission plan.",
    category: "Exercise",
    cadence: "daily",
    repeatEveryDays: 1,
    priority: "routine",
    frequency:
      "Research describes approximately two hours per workday and 6–7 sessions per week; follow the assigned mission schedule.",
    frequencySource: "NASA HRP research context",
    whyItMatters:
      "Exercise supports musculoskeletal fitness and is part of crew health routines during spaceflight.",
    instructions: [
      "Follow the approved exercise plan and equipment procedures.",
      "Record the completed session using the mission process.",
      "Do not change the assigned plan based on this checklist.",
    ],
    bodySystems: ["Muscles", "Bones", "Cardiovascular system"],
    hazards: ["Gravity fields", "Isolation and confinement"],
    reference:
      "The supplied NASA HRP research describes approximately two hours of exercise per workday and 6–7 sessions per week. This is research context, not a universal schedule.",
  },
  {
    id: "sleep-log",
    title: "Record sleep duration and bedtime",
    description: "Log sleep duration and bedtime for the latest rest period.",
    category: "Sleep",
    cadence: "daily",
    repeatEveryDays: 1,
    priority: "routine",
    frequency: "Project reminder · record each sleep period.",
    frequencySource: "Project suggestion",
    whyItMatters:
      "The supplied research links sleep restriction with reduced attention and performance; a log helps document patterns for the crew health team.",
    instructions: [
      "Record sleep duration and bedtime in the approved mission record.",
      "Protect scheduled rest according to mission sleep guidance.",
      "Report persistent sleep concerns through the approved support process.",
    ],
    bodySystems: ["Brain and cognition", "Sleep and circadian rhythms"],
    hazards: ["Isolation and confinement"],
    reference:
      "Supplied research cites approximately 8 hours as a sleep recommendation, reports average in-flight sleep of about 6 hours, and describes performance impairment after restriction to 5–6 hours within a week.",
  },
  {
    id: "nutrition-vitamin-d",
    title: "Review nutrition and vitamin D plan",
    description: "Review the assigned nutrition plan and any scheduled vitamin D monitoring.",
    category: "Nutrition",
    cadence: "daily",
    repeatEveryDays: 1,
    priority: "routine",
    frequency: "Project reminder · daily plan review; follow mission protocol.",
    frequencySource: "Project suggestion",
    whyItMatters:
      "Nutrition is part of bone-health and kidney-stone risk management during spaceflight.",
    instructions: [
      "Review the approved nutrition and monitoring plan.",
      "Record observations as required by the mission process.",
      "Do not start, stop or change supplements based on this reminder.",
    ],
    bodySystems: ["Bones", "Kidneys"],
    hazards: ["Gravity fields"],
    reference:
      "Project reminder based on supplied guidance about adequate nutrition and vitamin D monitoring; use the approved mission plan for individual instructions.",
  },
  {
    id: "mood-journal",
    title: "Complete mood journal",
    description: "Record a brief mood and well-being check-in.",
    category: "Behavioral health",
    cadence: "daily",
    repeatEveryDays: 1,
    priority: "routine",
    frequency: "Project reminder · daily check-in.",
    frequencySource: "Project suggestion",
    whyItMatters:
      "Isolation, confinement, workload and schedule disruption can affect psychological well-being.",
    instructions: [
      "Use the mission-approved journal or check-in format.",
      "Record concerns honestly and privately according to mission procedures.",
      "Reach out to appropriate psychological support when needed.",
    ],
    bodySystems: ["Brain and cognition", "Psychological well-being"],
    hazards: ["Isolation and confinement", "Distance from Earth"],
    reference:
      "Daily journaling is a suggested project routine, not a stated NASA-required frequency.",
  },
  {
    id: "cabin-co2-symptoms",
    title: "Review cabin CO₂ readings and symptoms",
    description: "Review environmental sensor information and note relevant symptoms.",
    category: "Environmental monitoring",
    cadence: "daily",
    repeatEveryDays: 1,
    priority: "high",
    frequency:
      "Cabin CO₂ monitoring is continuous per environmental procedures; daily symptom review is a project reminder.",
    frequencySource: "Mission procedure",
    whyItMatters:
      "Cabin CO₂ accumulation can contribute to headache, poor sleep, blurred vision, fatigue and nausea.",
    instructions: [
      "Use current sensor readings and the specified averaging periods.",
      "Follow environmental-control procedures and check scrubber status as directed.",
      "Use crew and ground alert procedures when required.",
    ],
    bodySystems: ["Respiratory system", "Brain and cognition", "Eyes and vision"],
    hazards: ["Hostile and closed environments"],
    reference:
      "The supplied NASA CO₂ brief gives 1-hour and 24-hour average reference values at or below 3 mmHg. This reference applies only to cabin CO₂; follow the current mission procedures.",
  },
  {
    id: "weekly-vision-check",
    title: "Vision acuity and Amsler grid check",
    description: "Complete the suggested vision check and record changes.",
    category: "Vision",
    cadence: "weekly",
    repeatEveryDays: 7,
    priority: "routine",
    frequency:
      "Weekly project reminder; use any different cadence specified by the mission or clinician.",
    frequencySource: "Project suggestion",
    whyItMatters:
      "Fluid shifts toward the head may affect vision and are associated with spaceflight-associated neuro-ocular syndrome (SANS).",
    instructions: [
      "Use the mission-approved visual acuity and Amsler grid procedures.",
      "Record results as directed; do not self-diagnose from a check.",
      "Report blurred or distorted vision to the flight surgeon.",
    ],
    bodySystems: ["Eyes and vision"],
    hazards: ["Gravity fields"],
    reference:
      "Weekly vision checks are a suggested project reminder, not a NASA-required schedule.",
  },
  {
    id: "psychological-conference",
    title: "Psychological conference",
    description: "Attend the scheduled private psychological conference when due.",
    category: "Behavioral health",
    cadence: "periodic",
    repeatEveryDays: 14,
    priority: "routine",
    frequency:
      "Approximately every two weeks, as described in the supplied research; follow the mission schedule.",
    frequencySource: "NASA HRP research context",
    whyItMatters:
      "Regular psychological support can help address well-being needs during isolation and confinement.",
    instructions: [
      "Use the confidential communication method and appointment assigned by the mission.",
      "Follow current crew behavioral-health procedures if additional support is needed.",
    ],
    bodySystems: ["Psychological well-being", "Brain and cognition"],
    hazards: ["Isolation and confinement", "Distance from Earth"],
    reference:
      "The supplied research describes private psychological conferences at approximately two-week intervals; mission-specific scheduling takes precedence.",
  },
  {
    id: "winscat-assessment",
    title: "WinSCAT cognitive assessment",
    description: "Complete the scheduled cognitive assessment and record it through the mission process.",
    category: "Cognitive monitoring",
    cadence: "periodic",
    repeatEveryDays: 30,
    priority: "routine",
    frequency: "Every 30 days in flight; approximately 11–15 minutes.",
    frequencySource: "NASA HRP research context",
    whyItMatters:
      "The assessment monitors cognitive performance domains such as reaction time, attention and working memory.",
    instructions: [
      "Complete the assessment using the approved procedure when scheduled.",
      "Record completion and follow instructions for review of results.",
    ],
    bodySystems: ["Brain and cognition"],
    hazards: ["Space radiation", "Isolation and confinement"],
    reference:
      "The supplied research describes WinSCAT as approximately 11–15 minutes and scheduled every 30 days during flight.",
  },
  {
    id: "radiation-shelter",
    title: "Follow radiation shelter procedure",
    description: "Use the designated shelter when a radiation alert and mission procedure call for it.",
    category: "Radiation response",
    cadence: "alert-triggered",
    priority: "high",
    frequency: "When a radiation alert occurs; follow mission procedures.",
    frequencySource: "Mission procedure",
    whyItMatters:
      "Space radiation exposure is associated with possible cancer risk and central nervous system effects.",
    instructions: [
      "Follow current mission alerts and crew instructions.",
      "Proceed to the designated storm shelter according to mission procedures.",
      "Do not use this checklist in place of operational commands.",
    ],
    bodySystems: ["Brain and cognition", "Multiple tissues"],
    hazards: ["Space radiation"],
    reference:
      "Alert-triggered action from supplied spaceflight hazard guidance. Mission procedures and crew instructions take precedence.",
  },
  {
    id: "radiation-dose-review",
    title: "Review radiation dose information",
    description: "Review assigned dosimeter information and relevant space-weather alerts.",
    category: "Radiation monitoring",
    cadence: "alert-triggered",
    priority: "routine",
    frequency:
      "At mission-defined review intervals and when alerts or procedures direct.",
    frequencySource: "Mission procedure",
    whyItMatters:
      "Dosimeter and alert information support mission radiation monitoring and operational decisions.",
    instructions: [
      "Use the assigned dosimeter and approved reporting process.",
      "Review space-weather alerts through mission channels.",
      "Follow the designated shelter procedure when instructed.",
    ],
    bodySystems: ["Brain and cognition", "Multiple tissues"],
    hazards: ["Space radiation"],
    reference:
      "The supplied research material supports monitoring dosimeter readings and space-weather alerts; it does not establish a universal dose threshold for this checklist.",
  },
];

export const simulatedMissionTaskFeed: MissionTaskFeed = {
  source: "simulated",
  tasks: missionTaskDefinitions,
};
