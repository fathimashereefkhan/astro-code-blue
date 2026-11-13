export type AssessmentRecord = {
  assessmentDate?: string;
  heartRate: string;
  systolic: string;
  diastolic: string;
  oxygenSaturation: string;
  bodyTemperature: string;
  sleepDuration: string;
  waterIntake: string;
  observations: string;
  submittedAt: string;
};

export type SimulatedHealthRecord = AssessmentRecord & {
  day: string;
};

export const SIMULATED_HEALTH_DATA = [
  {
    day: "MON",
    heartRate: "68",
    systolic: "116",
    diastolic: "76",
    oxygenSaturation: "97",
    bodyTemperature: "36.7",
    sleepDuration: "6.4",
    waterIntake: "1.8",
    observations: "",
    submittedAt: "",
  },
  {
    day: "TUE",
    heartRate: "70",
    systolic: "118",
    diastolic: "77",
    oxygenSaturation: "98",
    bodyTemperature: "36.8",
    sleepDuration: "7.1",
    waterIntake: "2.1",
    observations: "",
    submittedAt: "",
  },
  {
    day: "WED",
    heartRate: "69",
    systolic: "117",
    diastolic: "75",
    oxygenSaturation: "97",
    bodyTemperature: "36.6",
    sleepDuration: "5.8",
    waterIntake: "1.9",
    observations: "",
    submittedAt: "",
  },
  {
    day: "THU",
    heartRate: "73",
    systolic: "121",
    diastolic: "79",
    oxygenSaturation: "99",
    bodyTemperature: "36.9",
    sleepDuration: "7.4",
    waterIntake: "2.3",
    observations: "",
    submittedAt: "",
  },
  {
    day: "FRI",
    heartRate: "71",
    systolic: "119",
    diastolic: "78",
    oxygenSaturation: "98",
    bodyTemperature: "36.8",
    sleepDuration: "6.9",
    waterIntake: "2.0",
    observations: "",
    submittedAt: "",
  },
  {
    day: "SAT",
    heartRate: "74",
    systolic: "120",
    diastolic: "80",
    oxygenSaturation: "97",
    bodyTemperature: "36.7",
    sleepDuration: "8.0",
    waterIntake: "2.2",
    observations: "",
    submittedAt: "",
  },
  {
    day: "SUN",
    heartRate: "72",
    systolic: "118",
    diastolic: "76",
    oxygenSaturation: "98",
    bodyTemperature: "36.8",
    sleepDuration: "6",
    waterIntake: "2",
    observations: "",
    submittedAt: "",
  },
] satisfies readonly SimulatedHealthRecord[];

export const SIMULATED_LATEST_HEALTH =
  SIMULATED_HEALTH_DATA[SIMULATED_HEALTH_DATA.length - 1];
