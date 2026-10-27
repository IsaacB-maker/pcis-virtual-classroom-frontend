
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";
const CLASSES_URL = `${API_BASE_URL}/data/classes/`;

const CLASS_OPTIONS = [
  { value: "P1", label: "Primary 1 (P1)" },
  { value: "P2", label: "Primary 2 (P2)" },
  { value: "P3", label: "Primary 3 (P3)" },
  { value: "P4", label: "Primary 4 (P4)" },
  { value: "P5", label: "Primary 5 (P5)" },
  { value: "P6", label: "Primary 6 (P6)" },
  { value: "P7", label: "Primary 7 (P7)" },
];

const styles = {
  page: {
    color: "#25372d",
    width: "100%",
    minWidth: 0,
  },
  heading: {
    margin: "0 0 8px",
    fontSize: "clamp(22px, 3vw, 29px)",
    fontWeight: 750,
    color: "#146c43",
  },
  description: {
    margin: "0 0 24px",
    color: "#65736a",
    lineHeight: 1.6,
    fontSize: 14,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 22,
  },
  stat: {
    padding: 20,
    borderRadius: 13,
    border: "1px solid #dce9df",
    background: "#ffffff",
    boxShadow: "0 3px 12px rgba(20, 108, 67, 0.045)",
  },
  statLabel: {
    color: "#68776d",
    fontSize: 13,
    marginBottom: 9,
  },
  statValue: {
    fontSize: 29,
    fontWeight: 750,
    color: "#198754",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #dce7df",
    borderRadius: 13,
    padding: "20px",
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
    padding: "12px 13px",
    border: "1px solid #d8e2dc",
    borderRadius: 8,
    background: "#ffffff",
    color: "#25372d",
    fontSize: 14,
    outlineColor: "#198754",
  },
  field: {
    flex: "1 1 220px",
    minWidth: 0,
  },
  formRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "end",
  },
  primaryButton: {
    border: "1px solid #198754",
    borderRadius: 8,
    padding: "12px 17px",
    background: "#198754",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d5e1d9",
    borderRadius: 8,
    padding: "11px 15px",
    background: "#ffffff",
    color: "#34483a",
    fontWeight: 650,
    fontSize: 13,
    cursor: "pointer",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 14,
  },
  th: {
    background: "#edf6f0",
    color: "#365643",
    fontSize: 12,
    fontWeight: 750,
    padding: "13px 14px",
    borderBottom: "1px solid #dce7df",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "15px 14px",
    borderBottom: "1px solid #edf1ed",
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 20,
    background: "#e8f4ed",
    color: "#146c43",
    fontSize: 12,
    fontWeight: 750,
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
        "Permission denied. Please check your administrator session and permissions."
      );
    }

    const errors = data.errors
      ? Object.entries(data.errors)
          .map(([key, value]) => {
            const detail = Array.isArray(value) ? value.join(", ") : String(value);
            return `${key}: ${detail}`;
          })
          .join(" | ")
      : "";

    throw new Error(
      errors ||
        data.message ||
        data.detail ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

async function getCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/csrf/`, {
    method: "GET",
    credentials: "include",
  });

  const data = await readResponse(response);

  if (!data.csrfToken) {
    throw new Error("Could not obtain a security token. Please refresh and try again.");
  }

  return data.csrfToken;
}

async function sendDataRequest(url, method, body) {
  const csrfToken = await getCsrfToken();

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(body),
  });

  return readResponse(response);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(CLASSES_URL, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await readResponse(response);
      const results = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setClasses(
        [...results].sort((a, b) =>
          String(a.name).localeCompare(String(b.name), undefined, {
            numeric: true,
          })
        )
      );
    } catch (err) {
      setError(err.message || "Could not load classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const existingNames = useMemo(
    () => new Set(classes.map((item) => item.name)),
    [classes]
  );

  const availableClasses = useMemo(
    () => CLASS_OPTIONS.filter((option) => !existingNames.has(option.value)),
    [existingNames]
  );

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return classes;

    return classes.filter(
      (item) =>
        String(item.name).toLowerCase().includes(query) ||
        String(item.id).includes(query)
    );
  }, [classes, search]);

  async function handleAddClass(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!newClassName) {
      setError("Please select a class to add.");
      return;
    }

    if (existingNames.has(newClassName)) {
      setError(`${newClassName} already exists.`);
      return;
    }

    setSaving(true);

    try {
      await sendDataRequest(CLASSES_URL, "POST", {
        name: newClassName,
      });

      setNewClassName("");
      setSuccess(`${newClassName} was added successfully.`);
      await loadClasses();
    } catch (err) {
      setError(err.message || "Could not add the class.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(classItem) {
    setError("");
    setSuccess("");
    setEditingClass(classItem);
    setEditClassName(classItem.name);
  }

  function cancelEditing() {
    setEditingClass(null);
    setEditClassName("");
  }

  async function handleEditClass(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!editingClass || !editClassName) {
      setError("Please select a class name.");
      return;
    }

    if (
      editClassName !== editingClass.name &&
      existingNames.has(editClassName)
    ) {
      setError(`${editClassName} is already assigned to another class.`);
      return;
    }

    if (editClassName === editingClass.name) {
      setSuccess("No changes were needed.");
      cancelEditing();
      return;
    }

    setSaving(true);

    try {
      await sendDataRequest(
        `${CLASSES_URL}${editingClass.id}/`,
        "PATCH",
        { name: editClassName }
      );

      setSuccess(
        `Class ${editingClass.name} was renamed to ${editClassName}.`
      );
      cancelEditing();
      await loadClasses();
    } catch (err) {
      setError(err.message || "Could not update the class.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Classes Management</h1>
      <p style={styles.description}>
        Manage the school's Primary 1 to Primary 7 classes. Changes are saved
        through the existing administration API.
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
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            ...styles.message,
            background: "#edf8f0",
            color: "#17683d",
            border: "1px solid #d2ead9",
          }}
        >
          {success}
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Classes currently registered</div>
          <div style={styles.statValue}>{classes.length}</div>
        </div>

        <div style={styles.stat}>
          <div style={styles.statLabel}>Available class options</div>
          <div style={styles.statValue}>{availableClasses.length}</div>
        </div>

        <div style={styles.stat}>
          <div style={styles.statLabel}>Expected classes</div>
          <div style={styles.statValue}>7</div>
        </div>
      </div>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Add a class</h2>
        <p style={styles.panelDescription}>
          Add a missing class from the school's approved P1–P7 list. Classes
          already registered cannot be added a second time.
        </p>

        {availableClasses.length === 0 ? (
          <div
            style={{
              ...styles.message,
              background: "#edf6f0",
              color: "#146c43",
              marginBottom: 0,
            }}
          >
            All seven class options are already registered.
          </div>
        ) : (
          <form onSubmit={handleAddClass}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label htmlFor="new-class-name" style={styles.label}>
                  Select class
                </label>
                <select
                  id="new-class-name"
                  value={newClassName}
                  onChange={(event) => setNewClassName(event.target.value)}
                  style={styles.input}
                  required
                  disabled={saving}
                >
                  <option value="">Choose a class</option>
                  {availableClasses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  opacity: saving ? 0.7 : 1,
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Class"}
              </button>
            </div>
          </form>
        )}
      </section>

      {editingClass && (
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Edit class</h2>
          <p style={styles.panelDescription}>
            You are editing class ID {editingClass.id}. Renaming a class may
            change how its existing students and lessons are identified, so
            only proceed if the change is intentional.
          </p>

          <form onSubmit={handleEditClass}>
            <div style={styles.formRow}>
              <div style={styles.field}>
                <label htmlFor="edit-class-name" style={styles.label}>
                  Class name
                </label>
                <select
                  id="edit-class-name"
                  value={editClassName}
                  onChange={(event) => setEditClassName(event.target.value)}
                  style={styles.input}
                  required
                  disabled={saving}
                >
                  {CLASS_OPTIONS.filter(
                    (option) =>
                      option.value === editingClass.name ||
                      !existingNames.has(option.value)
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                style={styles.primaryButton}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section style={styles.panel}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={styles.panelTitle}>Registered classes</h2>
            <p style={{ ...styles.panelDescription, marginBottom: 0 }}>
              {filteredClasses.length} class
              {filteredClasses.length === 1 ? "" : "es"} displayed
            </p>
          </div>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={loadClasses}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div style={{ marginBottom: 17 }}>
          <label htmlFor="class-search" style={styles.label}>
            Search classes
          </label>
          <input
            id="class-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by class name or ID..."
            style={styles.input}
          />
        </div>

        {loading ? (
          <p style={{ color: "#68776d", fontSize: 14 }}>
            Loading registered classes...
          </p>
        ) : classes.length === 0 ? (
          <div
            style={{
              ...styles.message,
              background: "#fff8ed",
              color: "#805b24",
              marginBottom: 0,
            }}
          >
            No classes were returned by the API. Check the backend and refresh
            this page.
          </div>
        ) : filteredClasses.length === 0 ? (
          <p style={{ color: "#68776d", fontSize: 14 }}>
            No classes match your search.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Class ID</th>
                  <th style={styles.th}>Date Created</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((classItem) => (
                  <tr key={classItem.id}>
                    <td style={styles.td}>
                      <span style={styles.badge}>{classItem.name}</span>
                    </td>
                    <td style={styles.td}>{classItem.id}</td>
                    <td style={styles.td}>
                      {formatDate(classItem.created_at)}
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => startEditing(classItem)}
                        disabled={saving}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            color: "#7b625b",
            fontSize: 12,
            lineHeight: 1.6,
            margin: "18px 0 0",
          }}
        >
          Class deletion is intentionally not provided here to help protect
          existing student assignments and lessons.
        </p>
      </section>
    </div>
  );
}
