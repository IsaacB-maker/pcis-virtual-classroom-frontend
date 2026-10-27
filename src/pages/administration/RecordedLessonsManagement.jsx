
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";

const styles = `
.recordings-page {
  color: #26352d;
  width: 100%;
  min-width: 0;
}
.recordings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 22px;
}
.recordings-title {
  color: #146c43;
  font-size: clamp(22px, 3vw, 29px);
  font-weight: 750;
  margin: 0 0 7px;
}
.recordings-subtitle {
  color: #68756d;
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
}
.recordings-refresh,
.recordings-delete {
  border: 0;
  border-radius: 8px;
  padding: 10px 15px;
  font-weight: 650;
  cursor: pointer;
  transition: opacity .2s ease, transform .2s ease;
}
.recordings-refresh {
  background: #198754;
  color: white;
}
.recordings-refresh:hover,
.recordings-delete:hover {
  opacity: .88;
}
.recordings-refresh:disabled,
.recordings-delete:disabled {
  opacity: .55;
  cursor: not-allowed;
}
.recordings-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.recordings-stat {
  background: #fff;
  border: 1px solid #e2eae4;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 3px 12px rgba(20, 70, 40, .04);
}
.recordings-stat-label {
  color: #68756d;
  font-size: 13px;
  margin-bottom: 9px;
}
.recordings-stat-value {
  color: #146c43;
  font-size: 25px;
  font-weight: 750;
  overflow-wrap: anywhere;
}
.recordings-filters {
  display: grid;
  grid-template-columns: minmax(180px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}
.recordings-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid #d5e1d8;
  background: #fff;
  color: #26352d;
  border-radius: 9px;
  padding: 12px 13px;
  font: inherit;
  font-size: 14px;
  outline: none;
}
.recordings-input:focus {
  border-color: #198754;
  box-shadow: 0 0 0 3px rgba(25, 135, 84, .12);
}
.recordings-message {
  padding: 13px 15px;
  margin-bottom: 16px;
  border-radius: 9px;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.recordings-error {
  background: #fff0f0;
  border: 1px solid #f0caca;
  color: #982f2f;
}
.recordings-info {
  background: #eaf6ee;
  border: 1px solid #cce6d5;
  color: #146c43;
}
.recordings-table-wrap {
  width: 100%;
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e2eae4;
  border-radius: 12px;
}
.recordings-table {
  width: 100%;
  min-width: 790px;
  border-collapse: collapse;
}
.recordings-table th {
  background: #e8f4ed;
  color: #146c43;
  text-align: left;
  padding: 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}
.recordings-table td {
  border-top: 1px solid #edf1ee;
  padding: 14px;
  font-size: 13px;
  vertical-align: middle;
}
.recordings-table tbody tr:hover {
  background: #fbfdfb;
}
.recordings-record-title {
  color: #26352d;
  font-weight: 700;
  margin-bottom: 5px;
  overflow-wrap: anywhere;
}
.recordings-muted {
  color: #748078;
  font-size: 12px;
  line-height: 1.5;
}
.recordings-status {
  display: inline-block;
  border-radius: 20px;
  padding: 5px 9px;
  background: #edf1ee;
  color: #4e5b52;
  font-size: 11px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.recordings-status-ready {
  background: #e4f5e9;
  color: #146c43;
}
.recordings-status-failed {
  background: #fdeaea;
  color: #a83232;
}
.recordings-delete {
  background: #c94c4c;
  color: #fff;
  padding: 8px 11px;
  font-size: 12px;
}
.recordings-empty {
  text-align: center;
  padding: 38px 18px;
  color: #68756d;
  line-height: 1.7;
}
.recordings-player {
  width: min(100%, 520px);
  max-height: 300px;
  margin-top: 10px;
  border-radius: 8px;
  background: #17221b;
}
.recordings-player-link {
  display: inline-block;
  margin-top: 9px;
  color: #146c43;
  font-size: 12px;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.recordings-mobile-list {
  display: none;
}
.recordings-mobile-card {
  background: #fff;
  border: 1px solid #e2eae4;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  overflow-wrap: anywhere;
}
.recordings-mobile-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #edf1ee;
  font-size: 13px;
}
.recordings-mobile-row:last-of-type {
  border-bottom: 0;
}
.recordings-mobile-label {
  color: #748078;
  flex-shrink: 0;
}
@media (max-width: 760px) {
  .recordings-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .recordings-filters {
    grid-template-columns: 1fr;
  }
  .recordings-table-wrap {
    display: none;
  }
  .recordings-mobile-list {
    display: block;
  }
}
@media (max-width: 420px) {
  .recordings-summary {
    grid-template-columns: 1fr;
  }
  .recordings-stat {
    padding: 14px;
  }
}
`;

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString();
}

function formatDuration(value) {
  const totalSeconds = Number(value);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "Not available";
  }

  const seconds = Math.floor(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (
    ["ready", "completed", "available", "saved", "success"].includes(
      normalized
    )
  ) {
    return "recordings-status-ready";
  }

  if (["failed", "error", "deleted"].includes(normalized)) {
    return "recordings-status-failed";
  }

  return "";
}

function getErrorMessage(data, fallback) {
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  return fallback;
}

function extractRecordings(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.recordings)) return data.recordings;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.results)) return data.data.results;

  return [];
}

export default function RecordedLessonsManagement() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_BASE_URL}/data/recordings/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(
          getErrorMessage(
            data,
            response.status === 401 || response.status === 403
              ? "Your administrator session is not authorized to view recordings. Please sign in again."
              : "Could not load recorded lessons."
          )
        );
      }

      setRecordings(extractRecordings(data));
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that Django is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const classes = useMemo(() => {
    return [
      ...new Set(
        recordings
          .map((recording) => recording.class_name)
          .filter(Boolean)
      ),
    ].sort((a, b) => String(a).localeCompare(String(b)));
  }, [recordings]);

  const statuses = useMemo(() => {
    return [
      ...new Set(
        recordings
          .map((recording) => recording.status)
          .filter(Boolean)
          .map(String)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return recordings.filter((recording) => {
      const searchableText = [
        recording.title,
        recording.subject,
        recording.teacher_name,
        recording.class_name,
        recording.status,
        recording.lesson_id,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);
      const matchesClass =
        classFilter === "all" || recording.class_name === classFilter;
      const matchesStatus =
        statusFilter === "all" ||
        String(recording.status || "") === statusFilter;

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [recordings, search, classFilter, statusFilter]);

  const deleteRecording = async (recording) => {
    const recordingId = recording.id;

    if (recordingId === undefined || recordingId === null) {
      setError("This recording has no ID, so it cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the recording "${recording.title || `Recording ${recordingId}`}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(recordingId);
    setError("");
    setNotice("");

    try {
      // Obtain a fresh CSRF token before making the DELETE request.
      const csrfResponse = await fetch(`${API_BASE_URL}/csrf/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const csrfData = await csrfResponse.json().catch(() => ({}));

      if (!csrfResponse.ok || !csrfData?.csrfToken) {
        throw new Error(
          getErrorMessage(
            csrfData,
            "Could not obtain a security token. Please refresh the page and try again."
          )
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/data/recordings/${encodeURIComponent(recordingId)}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-CSRFToken": csrfData.csrfToken,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success === false) {
        throw new Error(
          getErrorMessage(
            data,
            response.status === 401 || response.status === 403
              ? "Your session or permissions do not allow this deletion. Please sign in again."
              : "The recording could not be deleted."
          )
        );
      }

      setRecordings((current) =>
        current.filter((item) => String(item.id) !== String(recordingId))
      );
      setNotice("The recording was deleted successfully.");
    } catch (err) {
      setError(
        err.message ||
          "Could not delete the recording. Please check your connection and try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const renderRecordingDetails = (recording) => (
    <>
      <div className="recordings-record-title">
        {recording.title || `Recording ${recording.id}`}
      </div>
      <div className="recordings-muted">
        {recording.subject || "Subject not provided"}
      </div>
    </>
  );

  const renderPlayer = (recording) => {
    if (!recording.video_url) {
      return (
        <span className="recordings-muted">
          No video URL available
        </span>
      );
    }

    return (
      <details>
        <summary
          style={{
            color: "#146c43",
            fontWeight: 650,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Play recording
        </summary>
        <video
          className="recordings-player"
          controls
          preload="metadata"
          src={recording.video_url}
        >
          Your browser does not support video playback.
        </video>
        <a
          className="recordings-player-link"
          href={recording.video_url}
          target="_blank"
          rel="noreferrer"
        >
          Open video in a new tab
        </a>
      </details>
    );
  };

  const renderDeleteButton = (recording) => (
    <button
      type="button"
      className="recordings-delete"
      disabled={deletingId !== null}
      onClick={() => deleteRecording(recording)}
    >
      {String(deletingId) === String(recording.id)
        ? "Deleting..."
        : "Delete"}
    </button>
  );

  return (
    <section className="recordings-page">
      <style>{styles}</style>

      <div className="recordings-header">
        <div>
          <h1 className="recordings-title">Recorded Lessons</h1>
          <p className="recordings-subtitle">
            View, search, play, and manage saved PCIS classroom recordings.
          </p>
        </div>

        <button
          type="button"
          className="recordings-refresh"
          onClick={loadRecordings}
          disabled={loading || deletingId !== null}
        >
          {loading ? "Loading..." : "Refresh recordings"}
        </button>
      </div>

      {error && (
        <div className="recordings-message recordings-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="recordings-message recordings-info" role="status">
          {notice}
        </div>
      )}

      <div className="recordings-summary">
        <div className="recordings-stat">
          <div className="recordings-stat-label">Total recordings</div>
          <div className="recordings-stat-value">
            {loading ? "—" : recordings.length}
          </div>
        </div>

        <div className="recordings-stat">
          <div className="recordings-stat-label">Matching results</div>
          <div className="recordings-stat-value">
            {loading ? "—" : filteredRecordings.length}
          </div>
        </div>

        <div className="recordings-stat">
          <div className="recordings-stat-label">Classes represented</div>
          <div className="recordings-stat-value">
            {loading ? "—" : classes.length}
          </div>
        </div>
      </div>

      <div className="recordings-filters">
        <input
          className="recordings-input"
          type="search"
          placeholder="Search title, subject, teacher, or class..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search recorded lessons"
        />

        <select
          className="recordings-input"
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          aria-label="Filter recordings by class"
        >
          <option value="all">All classes</option>
          {classes.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>

        <select
          className="recordings-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter recordings by status"
        >
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="recordings-empty">
          Loading recorded lessons from the PCIS backend...
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="recordings-empty">
          {recordings.length === 0
            ? "No recorded lessons were returned by the backend."
            : "No recordings match your search or selected filters."}
        </div>
      ) : (
        <>
          <div className="recordings-table-wrap">
            <table className="recordings-table">
              <thead>
                <tr>
                  <th>Lesson</th>
                  <th>Class</th>
                  <th>Teacher</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Recorded</th>
                  <th>Video</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecordings.map((recording) => (
                  <tr key={recording.id}>
                    <td>{renderRecordingDetails(recording)}</td>
                    <td>{recording.class_name || "Not available"}</td>
                    <td>{recording.teacher_name || "Not available"}</td>
                    <td>{formatDuration(recording.duration_seconds)}</td>
                    <td>
                      <span
                        className={`recordings-status ${getStatusClass(
                          recording.status
                        )}`}
                      >
                        {recording.status || "Unknown"}
                      </span>
                    </td>
                    <td>{formatDate(recording.recorded_at)}</td>
                    <td>{renderPlayer(recording)}</td>
                    <td>{renderDeleteButton(recording)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="recordings-mobile-list">
            {filteredRecordings.map((recording) => (
              <article className="recordings-mobile-card" key={recording.id}>
                {renderRecordingDetails(recording)}

                <div className="recordings-mobile-row">
                  <span className="recordings-mobile-label">Class</span>
                  <strong>{recording.class_name || "Not available"}</strong>
                </div>

                <div className="recordings-mobile-row">
                  <span className="recordings-mobile-label">Teacher</span>
                  <strong>{recording.teacher_name || "Not available"}</strong>
                </div>

                <div className="recordings-mobile-row">
                  <span className="recordings-mobile-label">Duration</span>
                  <strong>
                    {formatDuration(recording.duration_seconds)}
                  </strong>
                </div>

                <div className="recordings-mobile-row">
                  <span className="recordings-mobile-label">Status</span>
                  <span
                    className={`recordings-status ${getStatusClass(
                      recording.status
                    )}`}
                  >
                    {recording.status || "Unknown"}
                  </span>
                </div>

                <div className="recordings-mobile-row">
                  <span className="recordings-mobile-label">Recorded</span>
                  <span>{formatDate(recording.recorded_at)}</span>
                </div>

                <div style={{ marginTop: 12 }}>
                  {renderPlayer(recording)}
                </div>

                <div style={{ marginTop: 14 }}>
                  {renderDeleteButton(recording)}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
