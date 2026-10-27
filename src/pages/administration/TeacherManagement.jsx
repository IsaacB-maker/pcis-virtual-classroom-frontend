import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";
const DATA_URL = `${API_BASE_URL}/data`;

const emptyTeacher = {
  name: "",
  email: "",
  password: "",
  is_active: true,
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
  padding: "11px 12px",
  border: "1px solid #d8e2dc",
  borderRadius: "8px",
  background: "#fff",
  color: "#25372d",
  fontSize: "14px",
  boxSizing: "border-box",
  outlineColor: "#198754",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#34483b",
  fontSize: "13px",
  fontWeight: 600,
};

const primaryButtonStyle = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  background: "#198754",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "9px 13px",
  border: "1px solid #d5e1d9",
  borderRadius: "8px",
  background: "#fff",
  color: "#34483b",
  fontWeight: 600,
  cursor: "pointer",
};

const cellStyle = {
  padding: "13px 12px",
  borderBottom: "1px solid #edf1ee",
  color: "#48594e",
  fontSize: "13px",
  verticalAlign: "middle",
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message =
      data.message ||
      data.detail ||
      data.error ||
      `The request failed with status ${response.status}.`;

    if (data.errors && typeof data.errors === "object") {
      const details = Object.entries(data.errors)
        .map(([field, messages]) => {
          const value = Array.isArray(messages)
            ? messages.join(", ")
            : String(messages);

          return `${field}: ${value}`;
        })
        .join(" | ");

      if (details) message += ` ${details}`;
    }

    if (response.status === 401) {
      message =
        "Your administrator session has expired. Please sign in again.";
    } else if (response.status === 403) {
      message =
        "Your account does not have permission for this action, or the security check failed.";
    }

    throw new Error(message);
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
    throw new Error("The security token was not provided by the server.");
  }

  return data.csrfToken;
}

async function sendDataRequest(url, method, body) {
  const csrfToken = await getCsrfToken();

  const options = {
    method,
    credentials: "include",
    headers: {
      "X-CSRFToken": csrfToken,
    },
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return readResponse(response);
}

function StatusLabel({ active }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: active ? "#e4f5e9" : "#fdeaea",
        color: active ? "#17683d" : "#a83232",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(emptyTeacher);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${DATA_URL}/teachers/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await readResponse(response);
      setTeachers(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      setError(err.message || "Could not load teacher records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyTeacher });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function startEdit(teacher) {
    setEditingId(teacher.id);
    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      password: "",
      is_active: Boolean(teacher.is_active),
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm({ ...emptyTeacher });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      is_active: Boolean(form.is_active),
    };

    if (!payload.name || !payload.email) {
      setError("Teacher name and email address are required.");
      setSaving(false);
      return;
    }

    if (!editingId && !form.password.trim()) {
      setError("A password is required when creating a teacher.");
      setSaving(false);
      return;
    }

    // The existing backend login compares the stored password directly.
    // Only include a password when creating or explicitly changing it.
    if (!editingId || form.password.length > 0) {
      payload.password = form.password;
    }

    try {
      const url = editingId
        ? `${DATA_URL}/teachers/${editingId}/`
        : `${DATA_URL}/teachers/`;

      const data = await sendDataRequest(
        url,
        editingId ? "PATCH" : "POST",
        payload
      );

      setNotice(
        data.message ||
          (editingId
            ? "Teacher record updated successfully."
            : "Teacher record created successfully.")
      );

      cancelForm();
      await loadTeachers();
    } catch (err) {
      setError(err.message || "Could not save the teacher record.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTeacherStatus(teacher) {
    const nextStatus = !teacher.is_active;

    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} the account for "${teacher.name}"?`
    );

    if (!confirmed) return;

    setUpdatingId(teacher.id);
    setError("");
    setNotice("");

    try {
      const data = await sendDataRequest(
        `${DATA_URL}/teachers/${teacher.id}/`,
        "PATCH",
        { is_active: nextStatus }
      );

      setNotice(
        data.message ||
          `Teacher account ${nextStatus ? "activated" : "deactivated"} successfully.`
      );

      await loadTeachers();
    } catch (err) {
      setError(err.message || "Could not update the teacher's status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(teacher) {
    const confirmed = window.confirm(
      `Delete the teacher "${teacher.name}" (${teacher.email})?\n\nYour Django model uses CASCADE for related lessons, so deleting this teacher may also delete lessons linked to this account. This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(teacher.id);
    setError("");
    setNotice("");

    try {
      const data = await sendDataRequest(
        `${DATA_URL}/teachers/${teacher.id}/`,
        "DELETE"
      );

      setNotice(data.message || "Teacher record deleted successfully.");

      if (editingId === teacher.id) {
        cancelForm();
      }

      await loadTeachers();
    } catch (err) {
      setError(err.message || "Could not delete this teacher.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredTeachers = teachers.filter((teacher) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      [teacher.name, teacher.email].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && teacher.is_active) ||
      (statusFilter === "inactive" && !teacher.is_active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = teachers.filter(
    (teacher) => teacher.is_active
  ).length;

  const inactiveCount = teachers.length - activeCount;

  return (
    <section style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px", color: "#25372d" }}>
            Teacher management
          </h2>
          <p style={{ margin: 0, color: "#6b7c71", fontSize: "14px" }}>
            Manage teacher profiles, login credentials, and account access.
          </p>
        </div>

        <button
          type="button"
          style={primaryButtonStyle}
          onClick={startCreate}
        >
          + Add teacher
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: "8px",
            border: "1px solid #efc4c4",
            background: "#fff1f1",
            color: "#9d3030",
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            padding: "12px 14px",
            borderRadius: "8px",
            border: "1px solid #c8e5d2",
            background: "#edf8f0",
            color: "#17683d",
          }}
        >
          {notice}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={handleSave}
          style={{
            padding: "22px",
            background: "#fff",
            border: "1px solid #e0e9e3",
            borderRadius: "12px",
            boxShadow: "0 3px 12px rgba(20, 60, 35, 0.04)",
          }}
        >
          <h3 style={{ margin: "0 0 20px", color: "#198754" }}>
            {editingId ? "Edit teacher" : "Add a new teacher"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
              gap: "16px",
            }}
          >
            <label style={labelStyle}>
              Full name *
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Enter teacher's full name"
                required
                maxLength={150}
                autoComplete="name"
              />
            </label>

            <label style={labelStyle}>
              Email address *
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="teacher@example.com"
                required
                autoComplete="email"
              />
            </label>

            <label style={labelStyle}>
              {editingId ? "New password (optional)" : "Initial password *"}
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder={
                  editingId
                    ? "Leave blank to keep the current password"
                    : "Create a teacher login password"
                }
                required={!editingId}
                autoComplete={
                  editingId ? "new-password" : "new-password"
                }
              />
              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  color: "#78867d",
                  fontSize: "12px",
                  fontWeight: 400,
                  lineHeight: 1.5,
                }}
              >
                {editingId
                  ? "The existing password is not displayed or changed unless you enter a new one."
                  : "Give the teacher their login email and password securely."}
              </span>
            </label>

            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                alignSelf: "center",
                marginTop: "12px",
              }}
            >
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={updateField}
                style={{
                  width: "17px",
                  height: "17px",
                  accentColor: "#198754",
                }}
              />
              Account active
            </label>
          </div>

          <p
            style={{
              color: "#78867d",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            Inactive teacher accounts cannot log in. Password storage currently
            follows the existing backend implementation; it should be upgraded
            to secure password hashing together with the login endpoint.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <button
              type="submit"
              style={primaryButtonStyle}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create teacher"}
            </button>

            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={cancelForm}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "12px",
        }}
      >
        {[
          { label: "Total teachers", value: teachers.length },
          { label: "Active accounts", value: activeCount },
          { label: "Inactive accounts", value: inactiveCount },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "#fff",
              padding: "17px",
              borderRadius: "10px",
              border: "1px solid #e0e9e3",
            }}
          >
            <span style={{ color: "#718076", fontSize: "13px" }}>
              {item.label}
            </span>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#198754",
                marginTop: "5px",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <input
          style={{ ...inputStyle, flex: "1 1 260px" }}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teacher name or email..."
          aria-label="Search teachers"
        />

        <select
          style={{ ...inputStyle, flex: "0 1 190px" }}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter teachers by account status"
        >
          <option value="all">All accounts</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={loadTeachers}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e0e9e3",
          borderRadius: "12px",
          overflowX: "auto",
        }}
      >
        {loading ? (
          <p style={{ padding: "28px", color: "#718076" }}>
            Loading teacher records...
          </p>
        ) : error && teachers.length === 0 ? (
          <p style={{ padding: "28px", color: "#a83232" }}>
            Teacher records could not be loaded. Check your permissions and
            try refreshing.
          </p>
        ) : filteredTeachers.length === 0 ? (
          <p style={{ padding: "28px", color: "#718076" }}>
            {teachers.length === 0
              ? "No teacher records were returned by the server."
              : "No teachers match your search or status filter."}
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              minWidth: "760px",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#edf6f0", color: "#34483b" }}>
                {["Teacher", "Email address", "Status", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "14px 12px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        borderBottom: "1px solid #dce9df",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td style={cellStyle}>
                    <strong style={{ color: "#25372d" }}>
                      {teacher.name || "—"}
                    </strong>
                    {teacher.created_at && (
                      <div
                        style={{
                          color: "#78867d",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        Added{" "}
                        {Number.isNaN(Date.parse(teacher.created_at))
                          ? teacher.created_at
                          : new Date(teacher.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>

                  <td style={cellStyle}>{teacher.email || "—"}</td>

                  <td style={cellStyle}>
                    <StatusLabel active={Boolean(teacher.is_active)} />
                  </td>

                  <td style={cellStyle}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          ...secondaryButtonStyle,
                          padding: "7px 10px",
                        }}
                        onClick={() => startEdit(teacher)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #d5e1d9",
                          borderRadius: "8px",
                          background: "#edf6f0",
                          color: "#17683d",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        disabled={
                          updatingId === teacher.id ||
                          deletingId === teacher.id
                        }
                        onClick={() => toggleTeacherStatus(teacher)}
                      >
                        {updatingId === teacher.id
                          ? "Updating..."
                          : teacher.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </button>

                      <button
                        type="button"
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #efcccc",
                          borderRadius: "8px",
                          background: "#fff2f2",
                          color: "#a83232",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        disabled={
                          deletingId === teacher.id ||
                          updatingId === teacher.id
                        }
                        onClick={() => handleDelete(teacher)}
                      >
                        {deletingId === teacher.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ margin: 0, color: "#78867d", fontSize: "12px" }}>
        Showing {filteredTeachers.length} of {teachers.length} loaded teacher
        records. Django permissions are enforced by the backend.
      </p>
    </section>
  );
}

export default TeacherManagement;