
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";
const LESSONS_URL = `${API_BASE_URL}/data/lessons/`;

const styles = {
  page: { width: "100%", minWidth: 0, color: "#25372d" },
  heading: {
    margin: "0 0 8px",
    color: "#146c43",
    fontSize: "clamp(22px, 3vw, 29px)",
    fontWeight: 750,
  },
  description: {
    margin: "0 0 24px",
    color: "#65736a",
    lineHeight: 1.6,
    fontSize: 14,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 15,
    marginBottom: 22,
  },
  stat: {
    background: "#fff",
    border: "1px solid #dce9df",
    borderRadius: 12,
    padding: 19,
  },
  statLabel: { color: "#68776d", fontSize: 13, marginBottom: 9 },
  statValue: { color: "#198754", fontSize: 28, fontWeight: 750 },
  panel: {
    background: "#fff",
    border: "1px solid #dce7df",
    borderRadius: 13,
    padding: 20,
    marginBottom: 22,
    boxShadow: "0 3px 12px rgba(20, 108, 67, 0.04)",
  },
  panelTitle: {
    margin: "0 0 7px",
    color: "#146c43",
    fontSize: 18,
    fontWeight: 700,
  },
  panelDescription: {
    margin: "0 0 18px",
    color: "#68776d",
    fontSize: 13,
    lineHeight: 1.6,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 650,
    color: "#34483a",
    marginBottom: 7,
  },
  input: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d8e2dc",
    borderRadius: 8,
    background: "#fff",
    color: "#25372d",
    fontSize: 14,
    outlineColor: "#198754",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  button: {
    border: "1px solid #d5e1d9",
    borderRadius: 8,
    padding: "10px 15px",
    background: "#fff",
    color: "#34483a",
    fontWeight: 650,
    fontSize: 13,
    cursor: "pointer",
  },
  tableWrap: { width: "100%", overflowX: "auto" },
  table: {
    width: "100%",
    minWidth: 850,
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 13,
  },
  th: {
    background: "#edf6f0",
    color: "#365643",
    fontSize: 12,
    fontWeight: 750,
    padding: "13px 12px",
    borderBottom: "1px solid #dce7df",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf1ed",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 20,
    background: "#e8f4ed",
    color: "#146c43",
    fontSize: 11,
    fontWeight: 750,
    whiteSpace: "nowrap",
  },
  message: {
    padding: "12px 14px",
    borderRadius: 8,
    marginBottom: 17,
    fontSize: 13,
    lineHeight: 1.6,
  },
};

async function readResponse(response) {
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Your administrator session may have expired. Please sign in again."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Permission denied. Check your administrator session and permissions."
      );
    }

    const details = data.errors
      ? Object.entries(data.errors)
          .map(([field, messages]) => {
            const value = Array.isArray(messages)
              ? messages.join(", ")
              : String(messages);
            return `${field}: ${value}`;
          })
          .join(" | ")
      : "";

    throw new Error(
      details ||
        data.message ||
        data.detail ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

function displayDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayTime(value) {
  if (!value) return "—";

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    let hour = Number(match[1]);
    const minute = match[2];
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
  }

  return String(value);
}

function normaliseStatus(status) {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function statusLabel(status) {
  const value = normaliseStatus(status);

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusColors(status) {
  const value = normaliseStatus(status);

  if (value === "live" || value === "completed") {
    return { background: "#e8f4ed", color: "#146c43" };
  }

  if (value === "scheduled" || value === "pending") {
    return { background: "#fff4df", color: "#875b14" };
  }

  if (value === "cancelled" || value === "canceled" || value === "rejected") {
    return { background: "#fff0f0", color: "#a83232" };
  }

  return { background: "#f0f2f0", color: "#56635a" };
}

export default function LessonManagement() {
  const [lessons, setLessons] = useState([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(LESSONS_URL, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await readResponse(response);
      const results = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : null;

      if (!results) {
        throw new Error(
          "The server response did not contain a lesson list in the expected format."
        );
      }

      setLessons(results);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Could not load lessons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const classNames = useMemo(
    () =>
      [...new Set(lessons.map((lesson) => lesson.class_name).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [lessons]
  );

  const statusNames = useMemo(
    () =>
      [...new Set(lessons.map((lesson) => normaliseStatus(lesson.status)))]
        .filter((status) => status !== "unknown")
        .sort(),
    [lessons]
  );

  const counts = useMemo(() => {
    const countStatus = (target) =>
      lessons.filter(
        (lesson) => normaliseStatus(lesson.status) === target
      ).length;

    return {
      total: lessons.length,
      live: countStatus("live"),
      scheduled: countStatus("scheduled"),
      completed: countStatus("completed"),
    };
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return lessons
      .filter((lesson) => {
        const searchable = [
          lesson.id,
          lesson.title,
          lesson.subject,
          lesson.teacher_name,
          lesson.class_name,
          lesson.description,
          lesson.status,
        ]
          .map((value) => String(value ?? ""))
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || searchable.includes(query);
        const matchesClass =
          classFilter === "all" || lesson.class_name === classFilter;
        const matchesStatus =
          statusFilter === "all" ||
          normaliseStatus(lesson.status) === statusFilter;

        return matchesSearch && matchesClass && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = `${a.lesson_date || ""} ${a.lesson_time || ""}`;
        const dateB = `${b.lesson_date || ""} ${b.lesson_time || ""}`;
        return dateB.localeCompare(dateA);
      });
  }, [lessons, search, classFilter, statusFilter]);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Lessons Management</h1>
      <p style={styles.description}>
        Monitor lessons created by teachers across P1–P7. Search lesson
        details, filter by class or status, and refresh the list from the
        administration API.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            ...styles.message,
            background: "#fff1f1",
            color: "#9d3030",
            border: "1px solid #f1d1d1",
          }}
        >
          <strong>Unable to load lessons.</strong>
          <div>{error}</div>
          <button
            type="button"
            style={{ ...styles.button, marginTop: 10 }}
            onClick={loadLessons}
            disabled={loading}
          >
            Try again
          </button>
        </div>
      )}

      <div style={styles.stats}>
        {[
          { label: "Total lessons", value: counts.total },
          { label: "Live lessons", value: counts.live },
          { label: "Scheduled lessons", value: counts.scheduled },
          { label: "Completed lessons", value: counts.completed },
        ].map((item) => (
          <div key={item.label} style={styles.stat}>
            <div style={styles.statLabel}>{item.label}</div>
            <div style={styles.statValue}>{item.value}</div>
          </div>
        ))}
      </div>

      <section style={styles.panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={styles.panelTitle}>Lesson records</h2>
            <p style={{ ...styles.panelDescription, marginBottom: 0 }}>
              Showing {filteredLessons.length} of {lessons.length} lessons
              {lastUpdated
                ? ` · Refreshed ${lastUpdated.toLocaleTimeString()}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            style={styles.button}
            onClick={loadLessons}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh lessons"}
          </button>
        </div>

        <div style={styles.filters}>
          <div>
            <label htmlFor="lesson-search" style={styles.label}>
              Search lessons
            </label>
            <input
              id="lesson-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, subject, teacher, ID..."
              style={styles.input}
            />
          </div>

          <div>
            <label htmlFor="lesson-class-filter" style={styles.label}>
              Filter by class
            </label>
            <select
              id="lesson-class-filter"
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              style={styles.input}
            >
              <option value="all">All classes</option>
              {classNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lesson-status-filter" style={styles.label}>
              Filter by status
            </label>
            <select
              id="lesson-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={styles.input}
            >
              <option value="all">All statuses</option>
              {statusNames.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && lessons.length === 0 ? (
          <p style={{ color: "#68776d", fontSize: 14 }}>
            Loading lessons from the school server...
          </p>
        ) : !loading && filteredLessons.length === 0 ? (
          <div
            style={{
              ...styles.message,
              background: "#edf6f0",
              color: "#365643",
              marginBottom: 0,
            }}
          >
            {lessons.length === 0
              ? "No lesson records were returned by the API."
              : "No lessons match your current search and filters."}
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Lesson</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Teacher</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Session</th>
                </tr>
              </thead>

              <tbody>
                {filteredLessons.map((lesson) => {
                  const session = lesson.classroom_session;
                  const sessionStatus = session?.status;

                  return (
                    <tr key={lesson.id}>
                      <td style={styles.td}>
                        <strong style={{ color: "#25372d" }}>
                          {lesson.title || "Untitled lesson"}
                        </strong>
                        <div
                          style={{
                            color: "#7b887e",
                            fontSize: 11,
                            marginTop: 5,
                          }}
                        >
                          Lesson ID: {lesson.id}
                        </div>
                        {lesson.description && (
                          <details style={{ marginTop: 7 }}>
                            <summary
                              style={{
                                color: "#198754",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              View description
                            </summary>
                            <p
                              style={{
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                                lineHeight: 1.5,
                              }}
                            >
                              {lesson.description}
                            </p>
                          </details>
                        )}
                      </td>

                      <td style={styles.td}>{lesson.subject || "—"}</td>
                      <td style={styles.td}>
                        <span style={styles.badge}>
                          {lesson.class_name || "Unassigned"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {lesson.teacher_name || "Unassigned"}
                      </td>
                      <td style={styles.td}>
                        {displayDate(lesson.lesson_date)}
                      </td>
                      <td style={styles.td}>
                        {displayTime(lesson.lesson_time)}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            ...statusColors(lesson.status),
                          }}
                        >
                          {statusLabel(lesson.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {session ? (
                          <span
                            style={{
                              ...styles.badge,
                              ...statusColors(sessionStatus),
                            }}
                          >
                            {statusLabel(sessionStatus || "available")}
                          </span>
                        ) : (
                          <span style={{ color: "#7b887e" }}>
                            No session
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            color: "#68776d",
            fontSize: 12,
            lineHeight: 1.6,
            margin: "17px 0 0",
          }}
        >
          This page is for monitoring only. It does not create, edit, delete,
          start, or end lessons or live classroom sessions.
        </p>
      </section>
    </div>
  );
}
