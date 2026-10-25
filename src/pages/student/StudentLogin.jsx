
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentAuth.css";

const API_BASE_URL = "http://localhost:8000/api/students";


const SCHOOL_CLASSES = [
  { label: "Primary 1", value: "P1" },
  { label: "Primary 2", value: "P2" },
  { label: "Primary 3", value: "P3" },
  { label: "Primary 4", value: "P4" },
  { label: "Primary 5", value: "P5" },
  { label: "Primary 6", value: "P6" },
  { label: "Primary 7", value: "P7" },
];


async function readResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The server returned an unexpected response.");
  }
}

export default function StudentLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    school_class: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Obtain the CSRF token for Django session authentication.
      const csrfResponse = await fetch(`${API_BASE_URL}/csrf/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const csrfData = await readResponse(csrfResponse);

      if (!csrfResponse.ok || !csrfData.csrfToken) {
        throw new Error(
          csrfData.detail ||
            "Unable to obtain a security token. Please refresh and try again."
        );
      }

      // Submit the school-created student's name and selected class.
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfData.csrfToken,
          Accept: "application/json",
        },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          school_class: form.school_class,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            "Student login failed. Please check your details."
        );
      }

      if (!data.student) {
        throw new Error(
          "Login succeeded, but student information was not returned."
        );
      }

      // Preserve the existing dashboard's expected student information.
      const student = data.student.student || data.student;

const normalizedStudent = {
  ...student,
  full_name: String(
    student.full_name ||
    student.name ||
    student.student_name ||
    form.full_name.trim()
  ).trim(),
};

sessionStorage.setItem(
  "pcisStudent",
  JSON.stringify(normalizedStudent)
);

      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the school server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="student-auth-page">
      <section className="student-auth-card">
        <div className="student-auth-brand">
          <div className="student-auth-logo">P</div>
          <p>PARACLETE CLASSICAL</p>
          <h1>Student Login</h1>
          <span>International School</span>
        </div>

        <p className="student-auth-intro">
          Enter the full name and class assigned to you by the school.
        </p>

        {error && (
          <div
            className="student-auth-message error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="full_name">Student Full Name</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={form.full_name}
            onChange={handleChange}
            autoComplete="name"
            placeholder="Enter your full name"
            maxLength={200}
            required
          />

          
<label htmlFor="school_class">Select Your Class</label>

<select
  id="school_class"
  name="school_class"
  value={form.school_class}
  onChange={handleChange}
  required
>
  <option value="">Choose your class</option>

  {SCHOOL_CLASSES.map((schoolClass) => (
    <option
      key={schoolClass.value}
      value={schoolClass.value}
    >
      {schoolClass.label}
    </option>
  ))}
</select>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Enter Classroom"}
          </button>
        </form>

        <p className="student-auth-footer">
          Having trouble signing in? Please contact the school administrator.
        </p>
      </section>
    </main>
  );
}
