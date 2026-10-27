
import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";
const DATA_URL = `${API_BASE_URL}/data`;

const emptyStudent = {
  admission_number: "",
  full_name: "",
  email: "",
  phone_number: "",
  school_class_id: "",
  fee_status: "not_paid",
  registration_status: "not_registered",
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
      `The request failed with status ${response.status}.`;

    if (data.errors && typeof data.errors === "object") {
      const details = Object.entries(data.errors)
        .map(([field, messages]) => {
          const text = Array.isArray(messages)
            ? messages.join(", ")
            : String(messages);

          return `${field}: ${text}`;
        })
        .join(" | ");

      if (details) message += ` ${details}`;
    }

    if (response.status === 401) {
      message = "Your administrator session has expired. Please sign in again.";
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

function StatusLabel({ value }) {
  const labels = {
    not_paid: "Not paid",
    pending: "Pending",
    paid: "Paid",
    suspended: "Suspended",
    registered: "Registered",
    not_registered: "Not registered",
  };

  const positive = value === "paid" || value === "registered";
  const warning = value === "pending" || value === "not_registered";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: positive ? "#e4f5e9" : warning ? "#fff4df" : "#fdeaea",
        color: positive ? "#17683d" : warning ? "#946000" : "#a83232",
      }}
    >
      {labels[value] || value || "Unknown"}
    </span>
  );
}

function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [classError, setClassError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${DATA_URL}/students/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await readResponse(response);
      setStudents(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      setError(err.message || "Could not load student records.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const response = await fetch(`${DATA_URL}/classes/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await readResponse(response);
      setClasses(Array.isArray(data.results) ? data.results : []);
      setClassError("");
    } catch (err) {
      setClasses([]);
      setClassError(
        err.message ||
          "Could not load school classes. Check your class-view permission."
      );
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [loadStudents, loadClasses]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyStudent });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function startEdit(student) {
    setEditingId(student.id);
    setForm({
      admission_number: student.admission_number || "",
      full_name: student.full_name || "",
      email: student.email || "",
      phone_number: student.phone_number || "",
      school_class_id:
        student.school_class_id == null
          ? ""
          : String(student.school_class_id),
      fee_status: student.fee_status || "not_paid",
      registration_status:
        student.registration_status || "not_registered",
    });
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm({ ...emptyStudent });
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      admission_number: form.admission_number.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone_number: form.phone_number.trim(),
      school_class_id: form.school_class_id
        ? Number(form.school_class_id)
        : null,
      fee_status: form.fee_status,
      registration_status: form.registration_status,
    };

    if (!payload.admission_number || !payload.full_name) {
      setError("Admission number and full name are required.");
      setSaving(false);
      return;
    }

    if (
      payload.school_class_id !== null &&
      !Number.isInteger(payload.school_class_id)
    ) {
      setError("Please select a valid school class.");
      setSaving(false);
      return;
    }

    try {
      const url = editingId
        ? `${DATA_URL}/students/${editingId}/`
        : `${DATA_URL}/students/`;

      const data = await sendDataRequest(
        url,
        editingId ? "PATCH" : "POST",
        payload
      );

      setNotice(
        data.message ||
          (editingId
            ? "Student record updated successfully."
            : "Student record created successfully.")
      );

      cancelForm();
      await loadStudents();
    } catch (err) {
      setError(err.message || "Could not save the student record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student) {
    const confirmed = window.confirm(
      `Delete the student record for "${student.full_name}" (${student.admission_number})?\n\nThis cannot be undone. The server may refuse deletion if other records depend on this student.`
    );

    if (!confirmed) return;

    setDeletingId(student.id);
    setError("");
    setNotice("");

    try {
      const data = await sendDataRequest(
        `${DATA_URL}/students/${student.id}/`,
        "DELETE"
      );

      setNotice(data.message || "Student record deleted successfully.");

      if (editingId === student.id) cancelForm();
      await loadStudents();
    } catch (err) {
      setError(err.message || "Could not delete this student.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      [
        student.admission_number,
        student.full_name,
        student.email,
        student.phone_number,
        student.school_class_name,
      ].some((value) => String(value || "").toLowerCase().includes(query));

    const matchesClass =
      classFilter === "all" ||
      String(student.school_class_id ?? "") === classFilter;

    return matchesSearch && matchesClass;
  });

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
            Student records
          </h2>
          <p style={{ margin: 0, color: "#6b7c71", fontSize: "14px" }}>
            Manage student details, classes, fees, and registration status.
          </p>
        </div>

        <button type="button" style={primaryButtonStyle} onClick={startCreate}>
          + Add student
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
            {editingId ? "Edit student" : "Add a new student"}
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
              Admission number *
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="admission_number"
                value={form.admission_number}
                onChange={updateField}
                placeholder="e.g. PCIS-2026-001"
                required
                maxLength={50}
              />
            </label>

            <label style={labelStyle}>
              Full name *
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="full_name"
                value={form.full_name}
                onChange={updateField}
                placeholder="Enter student's full name"
                required
                maxLength={200}
              />
            </label>

            <label style={labelStyle}>
              Email address
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="student@example.com"
              />
            </label>

            <label style={labelStyle}>
              Phone number
              <input
                style={{ ...inputStyle, marginTop: "6px" }}
                name="phone_number"
                value={form.phone_number}
                onChange={updateField}
                placeholder="Enter phone number"
                maxLength={30}
              />
            </label>

            <label style={labelStyle}>
              School class
              <select
                style={{ ...inputStyle, marginTop: "6px" }}
                name="school_class_id"
                value={form.school_class_id}
                onChange={updateField}
              >
                <option value="">No class assigned</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>

              {classError && (
                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#a83232",
                    fontSize: "12px",
                    fontWeight: 400,
                  }}
                >
                  {classError}
                </span>
              )}
            </label>

            <label style={labelStyle}>
              Fee status
              <select
                style={{ ...inputStyle, marginTop: "6px" }}
                name="fee_status"
                value={form.fee_status}
                onChange={updateField}
              >
                <option value="not_paid">Not paid</option>
                <option value="pending">Pending verification</option>
                <option value="paid">Paid</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>

            <label style={labelStyle}>
              Registration status
              <select
                style={{ ...inputStyle, marginTop: "6px" }}
                name="registration_status"
                value={form.registration_status}
                onChange={updateField}
              >
                <option value="not_registered">Not registered</option>
                <option value="registered">Registered</option>
              </select>
            </label>
          </div>

          <p style={{ color: "#78867d", fontSize: "12px", lineHeight: 1.6 }}>
            Student lesson access also depends on the backend's account
            eligibility checks. Setting fees to paid alone does not guarantee
            access.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <button type="submit" style={primaryButtonStyle} disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create student"}
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
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            label: "Total loaded students",
            value: students.length,
          },
          {
            label: "Fees marked paid",
            value: students.filter((student) => student.fee_status === "paid")
              .length,
          },
          {
            label: "Registered students",
            value: students.filter(
              (student) => student.registration_status === "registered"
            ).length,
          },
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
          placeholder="Search name, admission number, email, or phone..."
          aria-label="Search students"
        />

        <select
          style={{ ...inputStyle, flex: "0 1 190px" }}
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          aria-label="Filter students by class"
        >
          <option value="all">All classes</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            loadStudents();
            loadClasses();
          }}
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
            Loading student records...
          </p>
        ) : error && students.length === 0 ? (
          <p style={{ padding: "28px", color: "#a83232" }}>
            Student records could not be loaded. Check your access permissions
            and try refreshing.
          </p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ padding: "28px", color: "#718076" }}>
            {students.length === 0
              ? "No student records were returned by the server."
              : "No students match your search or class filter."}
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              minWidth: "850px",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#edf6f0", color: "#34483b" }}>
                {[
                  "Admission No.",
                  "Student",
                  "Class",
                  "Fees",
                  "Registration",
                  "Actions",
                ].map((heading) => (
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
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td style={cellStyle}>
                    {student.admission_number || "—"}
                  </td>

                  <td style={cellStyle}>
                    <strong style={{ color: "#25372d" }}>
                      {student.full_name || "—"}
                    </strong>
                    {student.email && (
                      <div
                        style={{
                          color: "#78867d",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        {student.email}
                      </div>
                    )}
                    {student.phone_number && (
                      <div
                        style={{
                          color: "#78867d",
                          fontSize: "12px",
                          marginTop: "3px",
                        }}
                      >
                        {student.phone_number}
                      </div>
                    )}
                  </td>

                  <td style={cellStyle}>
                    {student.school_class_name || "Unassigned"}
                  </td>

                  <td style={cellStyle}>
                    <StatusLabel value={student.fee_status} />
                  </td>

                  <td style={cellStyle}>
                    <StatusLabel value={student.registration_status} />
                  </td>

                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        style={{
                          ...secondaryButtonStyle,
                          padding: "7px 10px",
                        }}
                        onClick={() => startEdit(student)}
                      >
                        Edit
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
                        disabled={deletingId === student.id}
                        onClick={() => handleDelete(student)}
                      >
                        {deletingId === student.id ? "Deleting..." : "Delete"}
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
        Showing {filteredStudents.length} of {students.length} loaded records.
        Actions are subject to permissions enforced by Django.
      </p>
    </section>
  );
}

export default StudentManagement;
