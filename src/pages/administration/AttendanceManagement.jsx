
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";

const styles = `
  .am-page {
    --am-green: #198754;
    --am-dark-green: #146c43;
    --am-light-green: #e8f4ed;
    --am-red: #c94c4c;
    --am-light-red: #f9e8e8;
    --am-grey: #f4f6f5;
    --am-border: #e3e9e5;
    --am-text: #34443b;
    width: 100%;
    min-width: 0;
    color: var(--am-text);
  }

  .am-page *, .am-page *::before, .am-page *::after {
    box-sizing: border-box;
  }

  .am-page button, .am-page input, .am-page select {
    font: inherit;
  }

  .am-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
  }

  .am-eyebrow {
    color: var(--am-green);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.4px;
  }

  .am-header h1 {
    margin: 7px 0;
    color: var(--am-dark-green);
    font-size: clamp(23px, 3vw, 30px);
    line-height: 1.25;
  }

  .am-subtitle {
    margin: 0;
    color: #78857c;
    font-size: 13px;
    line-height: 1.7;
  }

  .am-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 10px 16px;
    border: 1px solid var(--am-green);
    border-radius: 8px;
    background: var(--am-green);
    color: white;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background .2s ease, transform .2s ease;
  }

  .am-btn:hover:not(:disabled) {
    background: var(--am-dark-green);
  }

  .am-btn:disabled {
    cursor: wait;
    opacity: .7;
  }

  .am-refresh-symbol {
    display: inline-block;
    font-size: 19px;
    line-height: 1;
  }

  .am-spinning {
    animation: am-spin .8s linear infinite;
  }

  @keyframes am-spin {
    to { transform: rotate(360deg); }
  }

  .am-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 23px;
  }

  .am-stat {
    display: flex;
    align-items: center;
    gap: 13px;
    min-width: 0;
    padding: 19px 16px;
    border: 1px solid var(--am-border);
    border-radius: 12px;
    background: white;
    box-shadow: 0 3px 12px rgba(25, 60, 40, .035);
  }

  .am-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border-radius: 11px;
    font-size: 20px;
    font-weight: 800;
  }

  .am-icon-total, .am-icon-present {
    background: var(--am-light-green);
    color: var(--am-green);
  }

  .am-icon-absent {
    background: var(--am-light-red);
    color: var(--am-red);
  }

  .am-icon-other {
    background: #eff1ef;
    color: #657168;
  }

  .am-stat-label {
    color: #77847b;
    font-size: 11px;
    font-weight: 700;
  }

  .am-stat-value {
    display: block;
    margin: 5px 0 3px;
    color: var(--am-dark-green);
    font-size: 25px;
    line-height: 1.15;
  }

  .am-stat-note {
    color: #8a948d;
    font-size: 10px;
  }

  .am-panel {
    overflow: hidden;
    border: 1px solid var(--am-border);
    border-radius: 12px;
    background: white;
    box-shadow: 0 3px 14px rgba(25, 60, 40, .035);
  }

  .am-panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 21px 21px 18px;
  }

  .am-panel-heading h2 {
    margin: 0 0 7px;
    color: var(--am-dark-green);
    font-size: 18px;
  }

  .am-count {
    flex-shrink: 0;
    padding: 7px 11px;
    border-radius: 20px;
    background: var(--am-light-green);
    color: var(--am-dark-green);
    font-size: 11px;
    font-weight: 800;
  }

  .am-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 21px 20px;
  }

  .am-search {
    display: flex;
    align-items: center;
    flex: 1 1 240px;
    gap: 9px;
    min-width: 0;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #dfe6e1;
    border-radius: 8px;
    background: white;
  }

  .am-search:focus-within {
    border-color: var(--am-green);
    box-shadow: 0 0 0 3px rgba(25, 135, 84, .08);
  }

  .am-search-icon {
    color: #7c8980;
    font-size: 20px;
  }

  .am-search input {
    width: 100%;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--am-text);
    font-size: 12px;
  }

  .am-search input::placeholder {
    color: #9aa39d;
  }

  .am-select {
    min-width: 135px;
    height: 42px;
    padding: 0 11px;
    border: 1px solid #dfe6e1;
    border-radius: 8px;
    outline-color: var(--am-green);
    background: white;
    color: #45554b;
    font-size: 12px;
    cursor: pointer;
  }

  .am-clear {
    min-height: 42px;
    padding: 0 13px;
    border: 1px solid #efd3d3;
    border-radius: 8px;
    background: #fff8f8;
    color: #a83232;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .am-clear:hover {
    background: var(--am-light-red);
  }

  .am-table-wrap {
    width: 100%;
    overflow-x: auto;
    border-top: 1px solid var(--am-border);
  }

  .am-table {
    width: 100%;
    min-width: 740px;
    border-collapse: collapse;
    text-align: left;
  }

  .am-table thead {
    background: #f6f8f6;
  }

  .am-table th {
    padding: 14px 16px;
    color: #69786e;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .35px;
    white-space: nowrap;
  }

  .am-table td {
    padding: 14px 16px;
    border-top: 1px solid #edf0ee;
    color: #526057;
    font-size: 12px;
    vertical-align: middle;
  }

  .am-table tbody tr:hover {
    background: #fbfdfb;
  }

  .am-student {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 175px;
  }

  .am-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--am-light-green);
    color: var(--am-dark-green);
    font-size: 13px;
    font-weight: 800;
  }

  .am-student-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .am-student-name {
    color: #34483a;
    font-size: 12px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .am-student-id {
    color: #929b95;
    font-size: 10px;
  }

  .am-class-tag {
    display: inline-block;
    padding: 5px 9px;
    border: 1px solid #dceee2;
    border-radius: 6px;
    background: #f0f8f2;
    color: var(--am-dark-green);
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .am-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 9px;
    border-radius: 20px;
    background: #eff1ef;
    color: #657168;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .am-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .am-status-present {
    background: #e5f5e9;
    color: #187744;
  }

  .am-status-absent {
    background: #fbe9e9;
    color: #b23939;
  }

  .am-status-late {
    background: #fff2d9;
    color: #95630b;
  }

  .am-status-left {
    background: #eaf0f7;
    color: #526d89;
  }

  .am-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 225px;
    padding: 32px 20px;
    border-top: 1px solid var(--am-border);
    text-align: center;
  }

  .am-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    margin-bottom: 13px;
    border-radius: 14px;
    background: var(--am-light-green);
    color: var(--am-green);
    font-size: 24px;
  }

  .am-empty h3 {
    margin: 0 0 8px;
    color: var(--am-dark-green);
    font-size: 16px;
  }

  .am-empty p {
    max-width: 370px;
    margin: 0;
    color: #7c8980;
    font-size: 12px;
    line-height: 1.7;
  }

  .am-spinner {
    width: 30px;
    height: 30px;
    margin-bottom: 16px;
    border: 3px solid #e2eee6;
    border-top-color: var(--am-green);
    border-radius: 50%;
    animation: am-spin .8s linear infinite;
  }

  .am-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    padding: 13px 19px;
    border-top: 1px solid var(--am-border);
    background: #fcfdfc;
    color: #849087;
    font-size: 10px;
  }

  .am-note {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 17px;
    padding: 13px 15px;
    border: 1px solid #dcebe0;
    border-radius: 9px;
    background: #f5faf6;
    color: #557160;
    font-size: 12px;
    line-height: 1.6;
  }

  .am-note-symbol {
    color: var(--am-green);
    font-weight: 800;
  }

  .am-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #f0cccc;
    border-radius: 9px;
    background: #fff6f6;
    color: #913535;
  }

  .am-error strong {
    font-size: 13px;
  }

  .am-error p {
    margin: 5px 0 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .am-error button {
    flex-shrink: 0;
    padding: 8px 12px;
    border: 1px solid #e9bcbc;
    border-radius: 7px;
    background: white;
    color: #a83232;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  @media (max-width: 1050px) {
    .am-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 650px) {
    .am-header {
      align-items: stretch;
      flex-direction: column;
    }

    .am-header .am-btn {
      width: 100%;
    }

    .am-stats {
      gap: 10px;
    }

    .am-stat {
      align-items: flex-start;
      flex-direction: column;
      gap: 9px;
      padding: 13px;
    }

    .am-stat-value {
      font-size: 22px;
    }

    .am-panel-heading {
      align-items: flex-start;
      flex-direction: column;
      padding: 17px;
    }

    .am-filters {
      flex-direction: column;
      padding: 0 17px 17px;
    }

    .am-search, .am-select, .am-clear {
      width: 100%;
      flex: auto;
    }

    .am-footer {
      flex-direction: column;
      padding: 13px 16px;
    }

    .am-error {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 360px) {
    .am-stats {
      grid-template-columns: 1fr;
    }
  }
`;

function getRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getStudentName(record) {
  return (
    record.student_name ||
    record.full_name ||
    record.student?.full_name ||
    record.student?.name ||
    "Unknown student"
  );
}

function getClassName(record) {
  return (
    record.class_name ||
    record.school_class_name ||
    record.student_class ||
    record.student?.class_name ||
    record.student?.school_class?.name ||
    record.school_class?.name ||
    "—"
  );
}

function getLessonName(record) {
  return (
    record.lesson_title ||
    record.lesson_name ||
    record.lesson?.title ||
    record.lesson?.subject ||
    record.subject ||
    "—"
  );
}

function getStatus(record) {
  return String(
    record.status ||
      record.attendance_status ||
      record.state ||
      "Unknown"
  );
}

function normalizeStatus(status) {
  const value = String(status).toLowerCase().replace(/[_-]+/g, " ");

  if (value.includes("present") || value.includes("attend") ||
      value.includes("joined")) return "present";

  if (value.includes("absent") || value.includes("missed")) {
    return "absent";
  }

  if (value.includes("late")) return "late";

  if (value.includes("leave") || value.includes("left")) {
    return "left";
  }

  return "other";
}

function getRecordDate(record) {
  return (
    record.date ||
    record.attendance_date ||
    record.joined_at ||
    record.created_at ||
    record.timestamp ||
    null
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString();
}

export default function AttendanceManagement() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/data/attendance/`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load attendance records (HTTP ${response.status}).`
        );
      }

      const data = await response.json();
      setRecords(getRecords(data));
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message || "Could not load attendance records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const classes = useMemo(() => {
    const names = records
      .map(getClassName)
      .filter((name) => name && name !== "—");

    return [...new Set(names)].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const student = getStudentName(record);
      const className = getClassName(record);
      const lesson = getLessonName(record);
      const status = getStatus(record);
      const date = formatDate(getRecordDate(record));

      const matchesSearch = [
        student,
        className,
        lesson,
        status,
        date,
        record.id,
      ].filter(Boolean).some((value) =>
        String(value).toLowerCase().includes(query)
      );

      const matchesClass =
        classFilter === "all" || className === classFilter;

      const matchesStatus =
        statusFilter === "all" ||
        normalizeStatus(status) === statusFilter;

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [records, search, classFilter, statusFilter]);

  const presentCount = records.filter((record) =>
    ["present", "late"].includes(normalizeStatus(getStatus(record)))
  ).length;

  const absentCount = records.filter(
    (record) => normalizeStatus(getStatus(record)) === "absent"
  ).length;

  const otherCount = records.length - presentCount - absentCount;

  return (
    <div className="am-page">
      <style>{styles}</style>

      <header className="am-header">
        <div>
          <span className="am-eyebrow">PCIS ADMINISTRATION</span>
          <h1>Attendance Management</h1>
          <p className="am-subtitle">
            Monitor student attendance across classes and lessons.
          </p>
        </div>

        <button
          type="button"
          className="am-btn"
          onClick={loadAttendance}
          disabled={loading}
        >
          <span className={`am-refresh-symbol ${loading ? "am-spinning" : ""}`}>
            ↻
          </span>
          {loading ? "Loading..." : "Refresh Records"}
        </button>
      </header>

      {error && (
        <div className="am-error" role="alert">
          <div>
            <strong>Unable to load attendance</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={loadAttendance}>
            Try again
          </button>
        </div>
      )}

      <section className="am-stats">
        <div className="am-stat">
          <div className="am-stat-icon am-icon-total">▤</div>
          <div>
            <span className="am-stat-label">Total Records</span>
            <strong className="am-stat-value">{records.length}</strong>
            <small className="am-stat-note">Attendance entries</small>
          </div>
        </div>

        <div className="am-stat">
          <div className="am-stat-icon am-icon-present">✓</div>
          <div>
            <span className="am-stat-label">Present / Late</span>
            <strong className="am-stat-value">{presentCount}</strong>
            <small className="am-stat-note">Recorded attendance</small>
          </div>
        </div>

        <div className="am-stat">
          <div className="am-stat-icon am-icon-absent">!</div>
          <div>
            <span className="am-stat-label">Absent</span>
            <strong className="am-stat-value">{absentCount}</strong>
            <small className="am-stat-note">Recorded absences</small>
          </div>
        </div>

        <div className="am-stat">
          <div className="am-stat-icon am-icon-other">◷</div>
          <div>
            <span className="am-stat-label">Other Statuses</span>
            <strong className="am-stat-value">{otherCount}</strong>
            <small className="am-stat-note">Other or unclassified</small>
          </div>
        </div>
      </section>

      <section className="am-panel">
        <div className="am-panel-heading">
          <div>
            <h2>Student Attendance Records</h2>
            <p className="am-subtitle">
              Search and filter the records received from the classroom system.
            </p>
          </div>
          <span className="am-count">{filteredRecords.length} records</span>
        </div>

        <div className="am-filters">
          <label className="am-search">
            <span className="am-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search student, lesson, or status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search attendance records"
            />
          </label>

          <select
            className="am-select"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            aria-label="Filter by class"
          >
            <option value="all">All Classes</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>

          <select
            className="am-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="left">Left</option>
            <option value="other">Other</option>
          </select>

          <button
            type="button"
            className="am-clear"
            onClick={() => {
              setSearch("");
              setClassFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </button>
        </div>

        {loading && records.length === 0 ? (
          <div className="am-empty">
            <div className="am-spinner" />
            <h3>Loading attendance records</h3>
            <p>Please wait while we retrieve the records.</p>
          </div>
        ) : !error && filteredRecords.length === 0 ? (
          <div className="am-empty">
            <div className="am-empty-icon">▤</div>
            <h3>
              {records.length === 0
                ? "No attendance records yet"
                : "No matching records"}
            </h3>
            <p>
              {records.length === 0
                ? "Attendance entries will appear here when the backend has records."
                : "Try changing your search or filters."}
            </p>
          </div>
        ) : (
          <div className="am-table-wrap">
            <table className="am-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>CLASS</th>
                  <th>LESSON / SUBJECT</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => {
                  const studentName = getStudentName(record);
                  const status = getStatus(record);
                  const normalized = normalizeStatus(status);

                  return (
                    <tr key={record.id ?? `attendance-${index}`}>
                      <td>
                        <div className="am-student">
                          <div className="am-avatar">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="am-student-info">
                            <span className="am-student-name">
                              {studentName}
                            </span>
                            <small className="am-student-id">
                              {record.admission_number ||
                                record.student?.admission_number ||
                                (record.id != null
                                  ? `Record #${record.id}`
                                  : "Attendance record")}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="am-class-tag">
                          {getClassName(record)}
                        </span>
                      </td>

                      <td>{getLessonName(record)}</td>

                      <td>{formatDate(getRecordDate(record))}</td>

                      <td>
                        <span className={`am-status am-status-${normalized}`}>
                          <span className="am-status-dot" />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="am-footer">
          <span>
            Showing {filteredRecords.length} of {records.length} records
          </span>
          <span>
            {lastUpdated
              ? `Last refreshed: ${lastUpdated.toLocaleTimeString()}`
              : "Not refreshed yet"}
          </span>
        </footer>
      </section>

      <div className="am-note">
        <span className="am-note-symbol">ⓘ</span>
        <span>
          This page is read-only. Attendance records are not changed from
          the administration dashboard.
        </span>
      </div>
    </div>
  );
}
