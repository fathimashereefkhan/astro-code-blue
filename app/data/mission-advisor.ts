export type AdvisorAction = {
  id: string;
  icon: string;
  title: string;
  summary: string;
  schedule: string;
  source: string;
  details: string;
};

export const advisorRecommendedActions: AdvisorAction[] = [
  {
    id: "sleep",
    icon: "◷",
    title: "Protect sleep",
    summary: "Keep a consistent rest schedule and log sleep.",
    schedule: "Each sleep period",
    source: "Project reminder",
    details:
      "The supplied NASA HRP material cites approximately 8 hours as a sleep opportunity, reports average in-flight sleep of about 6 hours, and describes performance impairment after restriction to 5–6 hours within a week. This is research context, not a personal assessment or prescription.",
  },
  {
    id: "exercise",
    icon: "⌁",
    title: "Review exercise",
    summary: "Compare activity with your assigned exercise plan.",
    schedule: "Mission plan",
    source: "Research context",
    details:
      "The supplied research describes approximately two hours of exercise per workday and 6–7 sessions per week. Follow the current mission plan; this reference is not an individualized exercise requirement.",
  },
  {
    id: "hydration",
    icon: "◌",
    title: "Record hydration",
    summary: "Log daily intake using the mission process.",
    schedule: "Mission protocol",
    source: "Mission protocol",
    details:
      "Record daily water intake as directed by the mission plan. This page does not set a hydration target or infer a medical finding from intake.",
  },
  {
    id: "vision",
    icon: "◎",
    title: "Monitor vision",
    summary: "Notice changes and report blurred or distorted vision.",
    schedule: "Report changes promptly",
    source: "Supplied research",
    details:
      "The supplied research describes vision changes associated with fluid shifts and SANS. Report blurred or distorted vision to the flight surgeon and follow the assigned vision-monitoring schedule.",
  },
  {
    id: "cognition",
    icon: "⌘",
    title: "Cognitive check",
    summary: "Complete the cognitive assessment on its assigned schedule.",
    schedule: "WinSCAT · every 30 days",
    source: "Supplied NASA HRP research",
    details:
      "The supplied research says WinSCAT takes approximately 11–15 minutes and is scheduled every 30 days during flight. Follow the current mission schedule.",
  },
];

export type MissionScenario = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  effects: string;
  monitoring: string[];
  preventiveMeasures: string[];
  reporting: string;
  researchContext: string;
  guidanceSource: string;
};

export const missionScenarios: MissionScenario[] = [
  {
    id: "high-co2",
    title: "HIGH CO₂",
    subtitle: "Cabin environmental exposure",
    icon: "CO₂",
    effects:
      "Cabin CO₂ accumulation can contribute to headache, poor sleep, blurred vision, fatigue and nausea.",
    monitoring: [
      "Cabin CO₂ readings and the specified averaging periods",
      "Headache, sleep, vision, fatigue or nausea symptoms",
      "Environmental-control and scrubber status",
    ],
    preventiveMeasures: [
      "Follow spacecraft environmental-control procedures.",
      "Alert crew and ground support when mission procedures call for it.",
      "Repair or switch cabin scrubbers according to mission procedures.",
    ],
    reporting:
      "Follow crew and ground alert procedures for elevated readings or concerning symptoms. The supplied reference applies only to cabin CO₂.",
    researchContext:
      "The supplied NASA technical brief gives 1-hour and 24-hour average reference values at or below 3 mmHg. Do not apply this CO₂ reference to other health measurements.",
    guidanceSource: "Supplied NASA technical brief + mission procedures",
  },
  {
    id: "radiation-alert",
    title: "RADIATION ALERT",
    subtitle: "Space radiation exposure",
    icon: "☢",
    effects:
      "Space radiation is associated with possible cancer risk and may affect the central nervous system, cognition and motor function.",
    monitoring: [
      "Assigned radiation dosimeter readings",
      "Space-weather and radiation alerts",
      "Cognitive or neurological symptoms",
    ],
    preventiveMeasures: [
      "Monitor assigned radiation dosimeters and mission alerts.",
      "Use the designated storm shelter according to mission procedures.",
    ],
    reporting:
      "Follow mission radiation-alert and shelter procedures, and notify crew or ground support as directed.",
    researchContext:
      "The supplied material identifies possible cancer risk and central nervous system effects. It does not provide an individual risk estimate or a universal dose threshold.",
    guidanceSource: "Supplied NASA HRP research + mission procedures",
  },
  {
    id: "sleep-disruption",
    title: "SLEEP DISRUPTION",
    subtitle: "Circadian rhythm and rest",
    icon: "◷",
    effects:
      "Sleep loss can reduce attention and reaction speed. Confinement, workload and altered schedules may affect sleep and circadian timing.",
    monitoring: [
      "Sleep duration and bedtime log",
      "Scheduled rest and workload",
      "Attention, reaction time and mood observations",
    ],
    preventiveMeasures: [
      "Maintain scheduled sleep and rest routines.",
      "Continue mission-planned exercise and use available support resources.",
    ],
    reporting:
      "Raise persistent sleep, fatigue or well-being concerns through the approved crew medical or behavioral-health process.",
    researchContext:
      "The supplied NASA HRP research cites approximately 8 hours of sleep, reports average in-flight sleep of about 6 hours, and describes performance impairment after restriction to 5–6 hours within a week.",
    guidanceSource: "Supplied NASA HRP research + project reminders",
  },
  {
    id: "microgravity",
    title: "MICROGRAVITY",
    subtitle: "Effects of reduced gravity",
    icon: "◎",
    effects:
      "Reduced gravity and gravity transitions are associated with fluid shifts, bone mineral density loss, vision changes, balance difficulties and kidney-stone risk.",
    monitoring: [
      "Cardiovascular symptoms and assigned assessments",
      "Vision checks and bone-density monitoring as assigned",
      "Hydration records, balance and motion-sickness symptoms",
    ],
    preventiveMeasures: [
      "Follow mission-planned resistive exercise and approved nutrition and hydration plans.",
      "Use mission-approved procedures during gravity transitions.",
    ],
    reporting:
      "Report blurred or distorted vision, fainting or concerning dizziness to the flight surgeon or through the approved crew medical process.",
    researchContext:
      "The supplied research reports weight-bearing bone mineral density loss of approximately 1–1.5% per month; this is a population research finding, not an individual prediction.",
    guidanceSource: "Supplied NASA HRP research + mission procedures",
  },
];
