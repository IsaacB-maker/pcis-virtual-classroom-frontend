
import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000/api/administration";
const DATA_URL = `${API_BASE_URL}/data`;

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

const primaryButtonStyle = {
  padding: "10px 14px",
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

const feeStatuses = [
  { value: "not_paid", label: "Not paid" },
  { value: "pending", label: "Pending verification" },
  { value: "paid", label: "Paid" },
  { value: "suspended", label: "Suspended" },
];

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
      message =
        "Your administrator session has expired. Please sign in again.";
    } else if (response.status === 403) {
      message =
        "Your account does not have permission to view or update fee records.";
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

async function updateStudentFeeStatus(studentId, feeStatus) {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${DATA_URL}/students/${studentId}/`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ fee_status: feeStatus }),
  });

  return readResponse(response);
}

function StatusLabel({ value }) {
  const labels = {
    not_paid: "Not paid",
    pending: "Pending verification",
    paid: "Paid",
    suspended: "Suspended",
  };

  const colors = {
    paid: { background: "#e4f5e9", color: "#17683d" },
    pending: { background: "#fff4df", color: "#946000" },
    not_paid: { background: "#fdeaea", color: "#a83232" },
    suspended: { background: "#fdeaea", color: "#a83232" },
  };

  const style = colors[value] || {
    background: "#edf1ee",
    color: "#48594e",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: style.background,
        color: style.color,
      }}
    >
      {labels[value] || value || "Unknown"}
    </span>
  );
}

function SchoolFeesManagement() {
  const [students, setStudents] = useState([]);
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${DATA_URL}/students/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await readResponse(response);
      const records = Array.isArray(data.results) ? data.results : [];

      setStudents(records);
      setPendingStatuses(
        Object.fromEntries(
          records.map((student) => [
            student.id,
            student.fee_status || "not_paid",
          ])
        )
      );
    } catch (err) {
      setError(err.message || "Could not load student fee records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const classes = [
    ...new Set(
      students
        .map((student) => student.school_class_name)
        .filter(Boolean)
    ),
  ].sort();

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      [student.full_name, student.admission_number].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

    const matchesClass =
      classFilter === "all" ||
      student.school_class_name === classFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (student.fee_status || "not_paid") === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  function countStatus(status) {
    return students.filter(
      (student) => (student.fee_status || "not_paid") === status
    ).length;
  }

  async function saveFeeStatus(student) {
    const newStatus = pendingStatuses[student.id];

    if (!newStatus || newStatus === (student.fee_status || "not_paid")) {
      setError("");
      setNotice("There are no fee-status changes to save.");
      return;
    }

    setSavingId(student.id);
    setError("");
    setNotice("");

    try {
      const data = await updateStudentFeeStatus(student.id, newStatus);

      setNotice(
        data.message || `Fee status updated for ${student.full_name}.`
      );

      await loadStudents();
    } catch (err) {
      setError(
        err.message ||
          "Could not update the fee status. Please try again."
      );
    } finally {
      setSavingId(null);
    }
  }

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
            School Fees Management
          </h2>
          <p style={{ margin: 0, color: "#6b7c71", fontSize: "14px" }}>
            Review student fee records and update verified payment statuses.
          </p>
        </div>

        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={loadStudents}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh records"}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            label: "Total students",
            value: students.length,
            color: "#198754",
          },
          {
            label: "Fees paid",
            value: countStatus("paid"),
            color: "#198754",
          },
          {
            label: "Pending verification",
            value: countStatus("pending"),
            color: "#946000",
          },
          {
            label: "Not paid",
            value: countStatus("not_paid"),
            color: "#a83232",
          },
          {
            label: "Suspended",
            value: countStatus("suspended"),
            color: "#a83232",
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
            <div style={{ color: "#718076", fontSize: "13px" }}>
              {item.label}
            </div>
            <div
              style={{
                marginTop: "6px",
                fontSize: "26px",
                fontWeight: 700,
                color: item.color,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <input
          style={{ ...inputStyle, flex: "1 1 240px" }}
          type="search"
          placeholder="Search name or admission number..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search student fee records"
        />

        <select
          style={{ ...inputStyle, flex: "0 1 160px" }}
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          aria-label="Filter fee records by class"
        >
          <option value="all">All classes</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass} value={schoolClass}>
              {schoolClass}
            </option>
          ))}
        </select>

        <select
          style={{ ...inputStyle, flex: "0 1 210px" }}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter fee records by status"
        >
          <option value="all">All fee statuses</option>
          {feeStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
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
          <p style={{ padding: "24px", color: "#718076" }}>
            Loading school fee records...
          </p>
        ) : students.length === 0 ? (
          <p style={{ padding: "24px", color: "#718076" }}>
            No student records were returned by the server.
          </p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ padding: "24px", color: "#718076" }}>
            No students match your search or filters.
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
                {[
                  "Admission No.",
                  "Student",
                  "Class",
                  "Current status",
                  "Update status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "13px 12px",
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
              {filteredStudents.map((student) => {
                const currentStatus = student.fee_status || "not_paid";
                const selectedStatus =
                  pendingStatuses[student.id] || currentStatus;
                const changed = selectedStatus !== currentStatus;

                return (
                  <tr key={student.id}>
                    <td style={cellStyle}>
                      {student.admission_number || "—"}
                    </td>

                    <td style={cellStyle}>
                      <strong style={{ color: "#25372d" }}>
                        {student.full_name || "—"}
                      </strong>
                    </td>

                    <td style={cellStyle}>
                      {student.school_class_name || "Unassigned"}
                    </td>

                    <td style={cellStyle}>
                      <StatusLabel value={currentStatus} />
                    </td>

                    <td style={{ ...cellStyle, minWidth: "190px" }}>
                      <select
                        style={inputStyle}
                        value={selectedStatus}
                        onChange={(event) =>
                          setPendingStatuses((current) => ({
                            ...current,
                            [student.id]: event.target.value,
                          }))
                        }
                        aria-label={`New fee status for ${student.full_name}`}
                      >
                        {feeStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={cellStyle}>
                      <button
                        type="button"
                        style={{
                          ...primaryButtonStyle,
                          opacity:
                            !changed || savingId === student.id ? 0.6 : 1,
                        }}
                        disabled={!changed || savingId === student.id}
                        onClick={() => saveFeeStatus(student)}
                      >
                        {savingId === student.id
                          ? "Saving..."
                          : "Save status"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ margin: 0, color: "#78867d", fontSize: "12px" }}>
        Showing {filteredStudents.length} of {students.length} students.
        Verify a payment before marking a student as paid. This section
        updates the existing fee-status field; it does not process payments
        or generate receipts.
      </p>
    </section>
  );
}

export default SchoolFeesManagement;
