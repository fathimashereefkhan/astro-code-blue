export type AssessmentRecord = {
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

export type HealthReading = {
  id:
    | "heartRate"
    | "bloodPressure"
    | "oxygenSaturation"
    | "bodyTemperature"
    | "hydration"
    | "sleep";
  label: string;
  value: string;
  unit: string;
  glyph: string;
};

export function MissionBackground() {
  return <div className="space-backdrop" aria-hidden="true" />;
}

export function HealthLevel({ readings }: { readings: HealthReading[] }) {
  return (
    <div className="health-readings">
      {readings.map((reading, index) => (
        <div className="health-reading" key={reading.id}>
          <span className="health-reading-index">0{index + 1}</span>
          <span className="health-reading-glyph" aria-hidden="true">{reading.glyph}</span>
          <span className="health-reading-copy">
            <span className="health-reading-name">{reading.label}</span>
            <strong>{reading.value}<small> {reading.unit}</small></strong>
          </span>
        </div>
      ))}
    </div>
  );
}

const DEMO_SLEEP = [
  { day: "MON", hours: 6.4 },
  { day: "TUE", hours: 7.1 },
  { day: "WED", hours: 5.8 },
  { day: "THU", hours: 7.4 },
  { day: "FRI", hours: 6.9 },
  { day: "SAT", hours: 8.0 },
  { day: "SUN", hours: 7.2 },
];

export function SleepChart({ records }: { records: AssessmentRecord[] }) {
  const actualSleep = records
    .filter((record) => record.sleepDuration.trim() && Number.isFinite(Number(record.sleepDuration)))
    .slice(-7)
    .map((record) => ({
      day: new Intl.DateTimeFormat(undefined, { weekday: "short" })
        .format(new Date(record.submittedAt))
        .toUpperCase(),
      hours: Number(record.sleepDuration),
    }));
  const chartData = actualSleep.length > 0 ? actualSleep : DEMO_SLEEP;
  const maxHours = Math.max(...chartData.map((item) => item.hours), 1);
  const chartDescription = actualSleep.length > 0
    ? `Sleep duration values from ${actualSleep.length} saved assessments`
    : "Demonstration sleep duration values for a sample week";

  return (
    <div className="sleep-chart" role="img" aria-label={chartDescription}>
      <div className="chart-y-labels" aria-hidden="true">
        <span>8h</span><span>6h</span><span>4h</span><span>2h</span><span>0</span>
      </div>
      <div className="chart-plot">
        <div className="chart-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="sleep-bars">
          {chartData.map((item, index) => (
            <div className="sleep-bar-column" key={`${item.day}-${index}`}>
              <span className="sleep-bar-value">{item.hours.toFixed(1)}</span>
              <span
                className="sleep-bar"
                style={{ height: `${Math.max((item.hours / maxHours) * 100, 4)}%` }}
              />
              <span className="sleep-bar-day">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DEMO_HEALTH_TRENDS = {
  heartRate: [68, 72, 70, 75, 71, 74, 72],
  oxygenSaturation: [97, 98, 97, 99, 98, 97, 98],
  bodyTemperature: [36.7, 36.8, 36.6, 36.9, 36.8, 36.7, 36.8],
  waterIntake: [1.8, 2.1, 1.6, 2.3, 2.0, 2.2, 1.9],
  bloodPressure: [
    { primary: 118, secondary: 78 },
    { primary: 121, secondary: 80 },
    { primary: 119, secondary: 79 },
    { primary: 123, secondary: 82 },
    { primary: 120, secondary: 80 },
    { primary: 122, secondary: 81 },
    { primary: 120, secondary: 80 },
  ],
};

type HealthTrendField = keyof typeof DEMO_HEALTH_TRENDS;
type HealthTrendPoint = {
  value: number;
  secondaryValue?: number;
  date: string;
};

export function HealthTrendCard({
  records,
  field,
  label,
  unit,
  color,
}: {
  records: AssessmentRecord[];
  field: HealthTrendField;
  label: string;
  unit: string;
  color: string;
}) {
  const savedPoints = records.flatMap<HealthTrendPoint>((record) => {
    if (field === "bloodPressure") {
      const systolic = record.systolic.trim();
      const diastolic = record.diastolic.trim();
      if (!systolic || !diastolic) return [];
      const primary = Number(systolic);
      const secondary = Number(diastolic);
      if (!Number.isFinite(primary) || !Number.isFinite(secondary)) return [];
      return [{ value: primary, secondaryValue: secondary, date: record.submittedAt }];
    }

    const rawValue = record[field].trim();
    if (!rawValue) return [];
    const value = Number(rawValue);
    return Number.isFinite(value) ? [{ value, date: record.submittedAt }] : [];
  });

  if (field === "oxygenSaturation") {
    const latestSavedPoint = savedPoints[savedPoints.length - 1];
    const oxygenValue = latestSavedPoint?.value ?? DEMO_HEALTH_TRENDS.oxygenSaturation[
      DEMO_HEALTH_TRENDS.oxygenSaturation.length - 1
    ];
    const chartable = oxygenValue >= 0 && oxygenValue <= 100;
    const endAngle = (oxygenValue / 100) * Math.PI * 2 - Math.PI / 2;
    const endX = 50 + 42 * Math.cos(endAngle);
    const endY = 50 + 42 * Math.sin(endAngle);
    const largeArc = oxygenValue > 50 ? 1 : 0;
    const slicePath = `M 50 50 L 50 8 A 42 42 0 ${largeArc} 1 ${endX} ${endY} Z`;

    return (
      <article className="glass-panel health-trend-card">
        <div className="health-trend-heading">
          <div>
            <h3>{label}</h3>
            <span>{latestSavedPoint ? "LATEST ASSESSMENT" : "DEMO VALUE"}</span>
          </div>
          <strong>{oxygenValue}<small> {unit}</small></strong>
        </div>
        <div className="oxygen-pie-wrap">
          <svg
            className="oxygen-pie-chart"
            viewBox="0 0 100 100"
            role="img"
            aria-label={`${latestSavedPoint ? "Saved" : "Demonstration"} oxygen saturation value: ${oxygenValue} percent`}
          >
            <circle cx="50" cy="50" r="42" fill="#263544" />
            {chartable && oxygenValue >= 100 ? (
              <circle cx="50" cy="50" r="42" fill={color} />
            ) : chartable && oxygenValue > 0 ? (
              <path d={slicePath} fill={color} />
            ) : null}
          </svg>
        </div>
        <div className="health-trend-axis">
          <span>{latestSavedPoint ? new Date(latestSavedPoint.date).toLocaleDateString() : "DEMO SAMPLE"}</span>
          <span>{chartable ? "VALUE SHARE" : "OUTSIDE PIE SCALE"}</span>
        </div>
      </article>
    );
  }

  if (field === "waterIntake") {
    const latestSavedPoint = savedPoints[savedPoints.length - 1];
    const waterValue = latestSavedPoint?.value ?? DEMO_HEALTH_TRENDS.waterIntake[
      DEMO_HEALTH_TRENDS.waterIntake.length - 1
    ];

    return (
      <article className="glass-panel health-trend-card">
        <div className="health-trend-heading">
          <div>
            <h3>{label}</h3>
            <span>{latestSavedPoint ? "LATEST ASSESSMENT" : "DEMO VALUE"}</span>
          </div>
          <strong>{waterValue}<small> {unit}</small></strong>
        </div>
        <div className="hydration-drop-wrap">
          <svg
            className="hydration-drop"
            viewBox="0 0 100 120"
            role="img"
            aria-label={`${latestSavedPoint ? "Saved" : "Demonstration"} water intake: ${waterValue} ${unit}`}
          >
            <defs>
              <linearGradient id="hydration-drop-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#168bff" />
              </linearGradient>
            </defs>
            <path
              className="hydration-drop-shadow"
              d="M50 5C39 24 15 48 15 72a35 35 0 0 0 70 0C85 48 61 24 50 5Z"
            />
            <path
              className="hydration-drop-shape"
              d="M50 5C39 24 15 48 15 72a35 35 0 0 0 70 0C85 48 61 24 50 5Z"
              fill="url(#hydration-drop-fill)"
            />
            <path
              className="hydration-drop-highlight"
              d="M39 42c-8 11-12 21-12 30"
            />
          </svg>
          <span className="hydration-drop-value" aria-hidden="true">
            {waterValue}<small> {unit}</small>
          </span>
        </div>
        <div className="health-trend-axis">
          <span>{latestSavedPoint ? new Date(latestSavedPoint.date).toLocaleDateString() : "DEMO SAMPLE"}</span>
          <span>WATER INTAKE</span>
        </div>
      </article>
    );
  }

  const hasSavedTrend = savedPoints.length >= 2;
  const points: HealthTrendPoint[] = hasSavedTrend
    ? savedPoints.slice(-8)
    : field === "bloodPressure"
      ? DEMO_HEALTH_TRENDS.bloodPressure.map((value, index) => ({
          value: value.primary,
          secondaryValue: value.secondary,
          date: `demo-${index}`,
        }))
      : (field === "heartRate"
          ? DEMO_HEALTH_TRENDS.heartRate
          : field === "bodyTemperature"
            ? DEMO_HEALTH_TRENDS.bodyTemperature
            : DEMO_HEALTH_TRENDS.oxygenSaturation
        ).map((value, index) => ({
            value,
            date: `demo-${index}`,
          }));
  const values = points.map((point) => point.value);
  const secondaryValues = points.flatMap((point) =>
    point.secondaryValue === undefined ? [] : [point.secondaryValue],
  );
  const allValues = [...values, ...secondaryValues];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => ({
    x: points.length === 1 ? 50 : 8 + (index / (points.length - 1)) * 84,
    y: 58 - ((point.value - min) / range) * 38,
    secondaryY: point.secondaryValue === undefined
      ? undefined
      : 58 - ((point.secondaryValue - min) / range) * 38,
    ...point,
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const secondaryPath = coordinates
    .filter((point) => point.secondaryY !== undefined)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.secondaryY}`)
    .join(" ");
  const latestPoint = points[points.length - 1];

  return (
    <article className="glass-panel health-trend-card">
      <div className="health-trend-heading">
        <div>
          <h3>{label}</h3>
          <span>{hasSavedTrend ? "ASSESSMENT HISTORY" : "DEMO TREND"}</span>
        </div>
        <strong>
          {field === "bloodPressure" && "secondaryValue" in latestPoint
            ? `${latestPoint.value}/${latestPoint.secondaryValue}`
            : latestPoint.value}
          <small> {unit}</small>
        </strong>
      </div>
      <svg
        className="health-trend-chart"
        viewBox="0 0 100 72"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${hasSavedTrend ? "Saved assessment" : "Demonstration"} ${label.toLowerCase()} trend`}
      >
        {[20, 39, 58].map((y) => (
          <line
            key={y}
            className="health-trend-gridline"
            x1="5"
            x2="95"
            y1={y}
            y2={y}
          />
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke="#8ba9ff"
            strokeWidth="1.3"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {coordinates.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="1.7" fill={color} />
            {point.secondaryY !== undefined && (
              <circle cx={point.x} cy={point.secondaryY} r="1.5" fill="#8ba9ff" />
            )}
          </g>
        ))}
      </svg>
      <div className="health-trend-axis">
        <span>{hasSavedTrend ? new Date(points[0].date).toLocaleDateString() : "EARLIER"}</span>
        <span>{hasSavedTrend ? new Date(points[points.length - 1].date).toLocaleDateString() : "LATEST"}</span>
      </div>
      {field === "bloodPressure" && (
        <div className="blood-pressure-legend">
          <span><i /> SYSTOLIC</span><span><i /> DIASTOLIC</span>
        </div>
      )}
    </article>
  );
}
