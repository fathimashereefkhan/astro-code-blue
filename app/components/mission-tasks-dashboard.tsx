"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  simulatedMissionTaskFeed,
  type MissionTask,
  type MissionTaskCadence,
  type MissionTaskFeed,
} from "../data/mission-tasks";

const STORAGE_KEY = "astro-code-blue-mission-task-state";
const STORAGE_VERSION = 2;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const HISTORY_LIMIT = 8;

type CompletionTimestamps = Record<string, string>;
type CompletionHistoryEntry = {
  taskId: string;
  completedAt: string;
};

function isValidTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function parseSavedCompletionHistory(value: unknown): CompletionHistoryEntry[] | null {
  if (typeof value !== "object" || value === null) return null;
  const state = value as Record<string, unknown>;

  if (state.version === STORAGE_VERSION) {
    if (
      !Array.isArray(state.history) ||
      !state.history.every((entry) => {
        if (typeof entry !== "object" || entry === null) return false;
        const completion = entry as Record<string, unknown>;
        return (
          typeof completion.taskId === "string" &&
          isValidTimestamp(completion.completedAt)
        );
      })
    ) {
      return null;
    }

    return state.history as CompletionHistoryEntry[];
  }

  if (
    state.version === 1 &&
    typeof state.completions === "object" &&
    state.completions !== null &&
    !Array.isArray(state.completions)
  ) {
    const entries = Object.entries(state.completions);
    if (!entries.every(([taskId, timestamp]) => taskId && isValidTimestamp(timestamp))) {
      return null;
    }
    return entries.map(([taskId, completedAt]) => ({
      taskId,
      completedAt: completedAt as string,
    }));
  }

  return null;
}

function getScheduledMinutes(value: string | undefined) {
  if (!value) return null;
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sortByScheduledTime(tasks: MissionTask[]) {
  return [...tasks].sort((a, b) => {
    const aTime = getScheduledMinutes(a.scheduledTime);
    const bTime = getScheduledMinutes(b.scheduledTime);
    if (aTime === null || bTime === null) return 0;
    return aTime - bTime;
  });
}

function isTaskOverdue(task: MissionTask, completedAt: string | undefined, now: number) {
  if (completedAt || !now) return false;
  if (task.deadlineAt) {
    const deadline = Date.parse(task.deadlineAt);
    if (!Number.isNaN(deadline)) return deadline < now;
  }

  const scheduledMinutes = getScheduledMinutes(task.scheduledTime);
  if (task.cadence !== "daily" || scheduledMinutes === null) return false;
  const scheduledToday = new Date(now);
  scheduledToday.setHours(
    Math.floor(scheduledMinutes / 60),
    scheduledMinutes % 60,
    0,
    0,
  );
  return scheduledToday.getTime() < now;
}

function isCompletionCurrent(
  task: MissionTask,
  completedAt: string | undefined,
  now: number,
) {
  if (!completedAt || !now) return false;
  const completedTime = Date.parse(completedAt);
  if (Number.isNaN(completedTime)) return false;

  if (task.cadence === "daily") {
    const completedDate = new Date(completedTime);
    const currentDate = new Date(now);
    return (
      completedDate.getFullYear() === currentDate.getFullYear() &&
      completedDate.getMonth() === currentDate.getMonth() &&
      completedDate.getDate() === currentDate.getDate()
    );
  }

  if (task.cadence === "alert-triggered" || !task.repeatEveryDays) return true;
  return now - completedTime < task.repeatEveryDays * DAY_IN_MILLISECONDS;
}

function formatLocalDate(now: number) {
  if (!now) return "DATE SYNCING";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date and time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function categoryIcon(category: string) {
  switch (category) {
    case "Exercise":
      return "⌁";
    case "Sleep":
      return "◷";
    case "Nutrition":
      return "◈";
    case "Behavioral health":
      return "◎";
    case "Environmental monitoring":
      return "CO₂";
    case "Vision":
      return "◉";
    case "Cognitive monitoring":
      return "⌘";
    case "Radiation response":
      return "☢";
    case "Radiation monitoring":
      return "◉";
    default:
      return "＋";
  }
}

function cadenceLabel(cadence: MissionTaskCadence) {
  switch (cadence) {
    case "daily":
      return "DAILY ROUTINE";
    case "weekly":
      return "WEEKLY CHECK";
    case "periodic":
      return "PERIODIC ASSESSMENT";
    case "alert-triggered":
      return "ALERT-TRIGGERED";
  }
}

function sourceLabel(task: MissionTask) {
  if (task.frequencySource === "NASA HRP research context") return "NASA HRP RESEARCH";
  if (task.frequencySource === "Mission procedure") return "MISSION PROCEDURE";
  return "PROJECT SUGGESTION";
}

function historyFromTimestampMap(timestamps: CompletionTimestamps) {
  return Object.entries(timestamps).flatMap(([taskId, completedAt]) =>
    isValidTimestamp(completedAt) ? [{ taskId, completedAt }] : [],
  );
}

export default function MissionTasksDashboard({
  feed = simulatedMissionTaskFeed,
  onTaskCompletionChange,
}: {
  feed?: MissionTaskFeed;
  onTaskCompletionChange?: (taskId: string, completedAt: string | null) => void;
}) {
  const tasks = useMemo(() => {
    const seen = new Set<string>();
    return feed.tasks.filter((task) => {
      if (!task.id || seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }, [feed.tasks]);
  const taskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  const hasDuplicateTasks = tasks.length !== feed.tasks.length;
  const [completionHistory, setCompletionHistory] = useState<CompletionHistoryEntry[]>(
    () => historyFromTimestampMap(feed.completionTimestamps ?? {}),
  );
  const [isLoaded, setIsLoaded] = useState(feed.source === "backend");
  const [storageNotice, setStorageNotice] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  const loadSavedCompletions = useCallback(() => {
    if (feed.source !== "simulated") {
      setCompletionHistory(historyFromTimestampMap(feed.completionTimestamps ?? {}));
      setStorageNotice("");
      setIsLoaded(true);
      return;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setCompletionHistory([]);
        setStorageNotice("");
        setIsLoaded(true);
        return;
      }

      const parsed: unknown = JSON.parse(saved);
      const history = parseSavedCompletionHistory(parsed);
      if (!history) {
        throw new Error("Saved task state has an unsupported format.");
      }

      setCompletionHistory(history.filter((entry) => taskIds.has(entry.taskId)));
      setStorageNotice("");
    } catch {
      setCompletionHistory([]);
      setStorageNotice(
        "Saved demo completion data could not be read. Activities are shown as pending.",
      );
    } finally {
      setIsLoaded(true);
    }
  }, [feed.completionTimestamps, feed.source, taskIds]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadSavedCompletions, 0);
    const handleStorage = (event: StorageEvent) => {
      if (
        feed.source === "simulated" &&
        (event.key === STORAGE_KEY || event.key === null)
      ) {
        loadSavedCompletions();
      }
    };
    const handleFocus = () => {
      if (feed.source === "simulated") loadSavedCompletions();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [feed.source, loadSavedCompletions]);

  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now());
    const initialUpdate = window.setTimeout(updateTime, 0);
    const interval = window.setInterval(updateTime, 60_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const latestCompletionByTask = useMemo(() => {
    const latest: CompletionTimestamps = {};
    for (const entry of completionHistory) {
      const previous = latest[entry.taskId];
      if (!previous || Date.parse(entry.completedAt) > Date.parse(previous)) {
        latest[entry.taskId] = entry.completedAt;
      }
    }
    return latest;
  }, [completionHistory]);

  const activeCompletionTimestamps = useMemo(() => {
    const active: CompletionTimestamps = {};
    for (const task of tasks) {
      const completedAt = latestCompletionByTask[task.id];
      if (isCompletionCurrent(task, completedAt, currentTime)) {
        active[task.id] = completedAt;
      }
    }
    return active;
  }, [currentTime, latestCompletionByTask, tasks]);

  const scheduledTasks = useMemo(
    () => tasks.filter((task) => task.cadence !== "alert-triggered"),
    [tasks],
  );
  const dailyTasks = useMemo(
    () => sortByScheduledTime(tasks.filter((task) => task.cadence === "daily")),
    [tasks],
  );
  const hasDailySchedule = dailyTasks.some((task) => task.scheduledTime);
  const upcomingAssessments = useMemo(
    () => tasks.filter((task) => task.cadence === "weekly" || task.cadence === "periodic"),
    [tasks],
  );
  const alertTasks = useMemo(
    () => tasks.filter((task) => task.cadence === "alert-triggered"),
    [tasks],
  );

  const completedCount = scheduledTasks.filter(
    (task) => activeCompletionTimestamps[task.id],
  ).length;
  const progress = scheduledTasks.length
    ? Math.round((completedCount / scheduledTasks.length) * 100)
    : 0;
  const nextOperation = scheduledTasks
    .filter((task) => !activeCompletionTimestamps[task.id])
    .sort((a, b) => {
      const priorityDifference = Number(b.priority === "high") - Number(a.priority === "high");
      if (priorityDifference) return priorityDifference;
      const cadenceOrder: Record<MissionTaskCadence, number> = {
        daily: 0,
        weekly: 1,
        periodic: 2,
        "alert-triggered": 3,
      };
      return cadenceOrder[a.cadence] - cadenceOrder[b.cadence];
    })[0] ?? null;

  const overdueCount = dailyTasks.filter((task) =>
    isTaskOverdue(task, activeCompletionTimestamps[task.id], currentTime),
  ).length;
  const recentHistory = useMemo(
    () =>
      completionHistory
        .filter((entry) => taskIds.has(entry.taskId))
        .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)),
    [completionHistory, taskIds],
  );
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  function saveCompletionHistory(history: CompletionHistoryEntry[]) {
    setCompletionHistory(history);
    setStorageNotice("");

    if (feed.source === "simulated") {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: STORAGE_VERSION, history }),
        );
      } catch {
        setStorageNotice(
          "Completion changed for this session, but demo history could not be saved in this browser.",
        );
      }
    }
  }

  function toggleTaskCompletion(taskId: string) {
    if (!isLoaded || !tasksById.has(taskId)) return;
    const completedAt = activeCompletionTimestamps[taskId];
    const nextHistory = completedAt
      ? completionHistory.filter(
          (entry) => !(entry.taskId === taskId && entry.completedAt === completedAt),
        )
      : [...completionHistory, { taskId, completedAt: new Date().toISOString() }];

    saveCompletionHistory(nextHistory);
    if (feed.source === "backend") {
      onTaskCompletionChange?.(taskId, completedAt ? null : nextHistory.at(-1)?.completedAt ?? null);
    }
  }

  const progressStyle = {
    "--mission-progress": `${progress * 3.6}deg`,
  } as CSSProperties;

  return (
    <main className="content mission-operations-page">
      <div className="mission-operations-shell">
        <header className="operations-header">
          <div className="operations-title-group">
            <div className="operations-emblem" aria-hidden="true">
              <span>✦</span>
              <i />
            </div>
            <div>
              <p className="operations-eyebrow">ASTRO CODE BLUE / FLIGHT OPERATIONS</p>
              <h1>MISSION CONTROL</h1>
              <p className="operations-subtitle">Crew Operations &amp; Daily Protocols</p>
            </div>
          </div>
          <div className="operations-status">
            <span className={`operations-status-light${feed.source === "backend" ? " is-live" : ""}`} />
            <div>
              <span>MISSION DATE</span>
              <strong>{formatLocalDate(currentTime)}</strong>
            </div>
            <i>{feed.source === "backend" ? "LIVE MISSION FEED" : "DEMO TASK DATA"}</i>
          </div>
        </header>

        {(storageNotice || hasDuplicateTasks) && (
          <p className="operations-notice" role="status">
            {storageNotice ||
              "Duplicate task entries were ignored so mission progress counts each activity once."}
          </p>
        )}

        <section className="operations-progress-panel" aria-labelledby="operations-progress-title">
          <div className="operations-progress-intro">
            <span className="operations-section-kicker">01 / FLIGHT PLAN STATUS</span>
            <h2 id="operations-progress-title">MISSION PROGRESS</h2>
            <p>
              {isLoaded
                ? "Completion across scheduled daily, weekly and periodic activities."
                : "Syncing saved completion data for this flight plan."}
            </p>
            <span className="operations-progress-caption">
              ALERT-TRIGGERED PROCEDURES ARE NOT COUNTED UNTIL ACTIVATED
            </span>
          </div>

          <div
            className="operations-progress-ring"
            style={progressStyle}
            role="progressbar"
            aria-label="Mission scheduled activity completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isLoaded ? progress : undefined}
            aria-valuetext={isLoaded ? `${progress}% complete` : "Loading mission progress"}
            aria-busy={!isLoaded}
          >
            <div>
              <strong>{isLoaded ? `${progress}%` : "—"}</strong>
              <span>COMPLETE</span>
            </div>
          </div>

          <div className="operations-progress-stats">
            <div>
              <span>ACTIVITIES COMPLETE</span>
              <strong>{isLoaded ? completedCount : "—"}<small> / {isLoaded ? scheduledTasks.length : "—"}</small></strong>
            </div>
            <div>
              <span>UP NEXT</span>
              <strong>{isLoaded ? (nextOperation ? "READY" : "ALL CLEAR") : "SYNCING"}</strong>
            </div>
            <div>
              <span>OVERDUE TODAY</span>
              <strong>{isLoaded ? overdueCount : "—"}</strong>
            </div>
          </div>
        </section>

        <section className="next-operation-panel" aria-labelledby="next-operation-title">
          <div className="next-operation-meta">
            <span className="operations-section-kicker">02 / NEXT OPERATION</span>
            <span className="next-operation-live"><i /> {isLoaded ? "CREW QUEUE" : "SYNCING QUEUE"}</span>
          </div>
          {isLoaded && nextOperation ? (
            <div className="next-operation-content">
              <div className="next-operation-copy">
                <div className="next-operation-badges">
                  <span>{cadenceLabel(nextOperation.cadence)}</span>
                  {nextOperation.priority === "high" && <strong>PRIORITY / HIGH</strong>}
                </div>
                <h2 id="next-operation-title">{nextOperation.title}</h2>
                <p>{nextOperation.description}</p>
                <div className="next-operation-facts">
                  <span><i>{categoryIcon(nextOperation.category)}</i>{nextOperation.category}</span>
                  <span><i>◷</i>{nextOperation.frequency}</span>
                </div>
              </div>
              <button
                className="next-operation-complete"
                type="button"
                onClick={() => toggleTaskCompletion(nextOperation.id)}
              >
                MARK AS COMPLETE <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : isLoaded ? (
            <div className="next-operation-empty">
              <h2 id="next-operation-title">
                {scheduledTasks.length ? "Scheduled operations complete." : "No scheduled activities."}
              </h2>
              <p>
                {scheduledTasks.length
                  ? "Review upcoming assessments or follow active mission alerts for conditional procedures."
                  : "No scheduled task feed is currently available."}
              </p>
            </div>
          ) : (
            <div className="next-operation-empty" role="status">
              <span className="operations-spinner" />
              <p>Loading the next crew operation…</p>
            </div>
          )}
        </section>

        <div className="operations-workspace">
          <section className="operations-timeline-section" aria-labelledby="mission-timeline-title">
            <div className="operations-section-heading">
              <div>
                <span className="operations-section-kicker">03 / TODAY</span>
                <h2 id="mission-timeline-title">MISSION TIMELINE</h2>
              </div>
              <span className="operations-section-count">
                {isLoaded
                  ? `${dailyTasks.filter((task) => activeCompletionTimestamps[task.id]).length} / ${dailyTasks.length} COMPLETE`
                  : "SYNCING"}
              </span>
            </div>

            {!isLoaded ? (
              <div className="operations-empty" role="status">
                <span className="operations-spinner" /> Loading today&apos;s activities…
              </div>
            ) : dailyTasks.length === 0 ? (
              <div className="operations-empty">
                <strong>No daily activities in the current task feed.</strong>
              </div>
            ) : (
              <ol className={`mission-timeline${hasDailySchedule ? " has-schedule-times" : ""}`}>
                {dailyTasks.map((task) => {
                  const completedAt = activeCompletionTimestamps[task.id];
                  const overdue = isTaskOverdue(task, completedAt, currentTime);
                  const status = completedAt ? "completed" : overdue ? "overdue" : "upcoming";
                  return (
                    <li className={`timeline-item is-${status}`} key={task.id}>
                      <span className="timeline-rail" aria-hidden="true"><i /></span>
                      {hasDailySchedule && (
                        <span className="timeline-time">{task.scheduledTime || "—"}</span>
                      )}
                      <span className="timeline-category-icon" aria-hidden="true">
                        {categoryIcon(task.category)}
                      </span>
                      <div className="timeline-task">
                        <strong>{task.title}</strong>
                        <span>{task.category}</span>
                      </div>
                      <span className={`timeline-status status-${status}`}>
                        {status === "completed" ? "COMPLETE" : status.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        className={`timeline-toggle${completedAt ? " is-complete" : ""}`}
                        disabled={!isLoaded}
                        aria-label={
                          completedAt
                            ? `Undo completion of ${task.title}`
                            : `Mark ${task.title} complete`
                        }
                        aria-pressed={Boolean(completedAt)}
                        onClick={() => toggleTaskCompletion(task.id)}
                      >
                        {completedAt ? "UNDO" : "DONE"}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="upcoming-section" aria-labelledby="upcoming-title">
            <div className="operations-section-heading">
              <div>
                <span className="operations-section-kicker">04 / SCHEDULED HEALTH CHECKS</span>
                <h2 id="upcoming-title">UPCOMING ASSESSMENTS</h2>
              </div>
            </div>
            {!isLoaded ? (
              <div className="operations-empty" role="status">
                <span className="operations-spinner" /> Loading assessment schedule…
              </div>
            ) : upcomingAssessments.length === 0 ? (
              <div className="operations-empty">
                <strong>No periodic activities are scheduled.</strong>
              </div>
            ) : (
              <ul className="assessment-operations-list">
                {upcomingAssessments.map((task) => {
                  const completedAt = activeCompletionTimestamps[task.id];
                  return (
                    <li key={task.id} className={completedAt ? "is-complete" : ""}>
                      <span className="assessment-operation-icon" aria-hidden="true">
                        {categoryIcon(task.category)}
                      </span>
                      <div className="assessment-operation-copy">
                        <strong>{task.title}</strong>
                        <span>{task.frequency}</span>
                        <small className={`schedule-source source-${task.frequencySource === "NASA HRP research context" ? "research" : task.frequencySource === "Project suggestion" ? "project" : "protocol"}`}>
                          {sourceLabel(task)}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="assessment-operation-toggle"
                        aria-label={
                          completedAt
                            ? `Undo completion of ${task.title}`
                            : `Mark ${task.title} complete`
                        }
                        aria-pressed={Boolean(completedAt)}
                        onClick={() => toggleTaskCompletion(task.id)}
                      >
                        {completedAt ? "UNDO" : "LOG"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="alert-protocols">
              <div className="alert-protocols-heading">
                <span className="alert-protocol-indicator" />
                <strong>ALERT-TRIGGERED PROCEDURES</strong>
                <small>Only log after mission direction</small>
              </div>
              {!isLoaded ? (
                <span className="alert-protocol-loading">Loading procedures…</span>
              ) : alertTasks.length === 0 ? (
                <span className="alert-protocol-loading">No alert procedures in this feed.</span>
              ) : (
                <ul>
                  {alertTasks.map((task) => {
                    const completedAt = activeCompletionTimestamps[task.id];
                    return (
                      <li key={task.id}>
                        <span className="alert-protocol-icon" aria-hidden="true">
                          {categoryIcon(task.category)}
                        </span>
                        <span>{task.title}</span>
                        <button
                          type="button"
                          aria-label={
                            completedAt
                              ? `Undo completion of ${task.title}`
                              : `Record completion of ${task.title}`
                          }
                          aria-pressed={Boolean(completedAt)}
                          onClick={() => toggleTaskCompletion(task.id)}
                        >
                          {completedAt ? "UNDO" : "LOG"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        <details className="mission-history">
          <summary>
            <span className="history-emblem" aria-hidden="true">↗</span>
            <span className="history-summary-copy">
              <span className="operations-section-kicker">05 / FLIGHT LOG</span>
              <strong>MISSION HISTORY</strong>
              <small>
                {isLoaded
                  ? `${recentHistory.length} completion${recentHistory.length === 1 ? "" : "s"} recorded`
                  : "Loading completion history"}
              </small>
            </span>
            <i aria-hidden="true">+</i>
          </summary>
          {!isLoaded ? (
            <div className="history-empty">Syncing completion history…</div>
          ) : recentHistory.length === 0 ? (
            <div className="history-empty">
              No activities have been logged yet. Completed operations will appear here.
            </div>
          ) : (
            <>
              <ol className="mission-history-list">
                {recentHistory.slice(0, HISTORY_LIMIT).map((entry, index) => {
                  const task = tasksById.get(entry.taskId);
                  if (!task) return null;
                  return (
                    <li key={`${entry.taskId}-${entry.completedAt}-${index}`}>
                      <span className="history-entry-icon" aria-hidden="true">
                        {categoryIcon(task.category)}
                      </span>
                      <span className="history-entry-task">{task.title}</span>
                      <span className="history-entry-category">{task.category}</span>
                      <time>{formatDateTime(entry.completedAt)}</time>
                    </li>
                  );
                })}
              </ol>
              {recentHistory.length > HISTORY_LIMIT && (
                <p className="history-more">
                  Showing the latest {HISTORY_LIMIT} of {recentHistory.length} recorded completions.
                </p>
              )}
            </>
          )}
        </details>

        <p className="operations-disclaimer">
          NASA-derived frequencies and project reminders are identified separately. Follow current
          mission procedures and crew medical instructions.
        </p>
      </div>
    </main>
  );
}
