
import { useState } from "react";
import "./StudentAuth.css";

const API_BASE_URL = "http://localhost:8000/api/students";

export default function StudentRegister() {
  const [form, setForm] = useState({
    admission_number: "",
    registration_code: "",
    password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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

    setMessage("");
    setError("");

    if (form.password !== form.confirm_password) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        const errors = data.errors || data;
        const details = Object.entries(errors)
          .map(([field, value]) => {
            const text = Array.isArray(value)
              ? value.join(" ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${field}: ${text}`;
          })
          .join(" ");

        throw new Error(details || "Registration failed.");
      }

      setMessage(
        `${data.message} You can now proceed to student login.`
      );

      setForm({
        admission_number: "",
        registration_code: "",
        password: "",
        confirm_password: "",
      });
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
          <h1>Student Registration</h1>
          <span>International School</span>
        </div>

        <p className="student-auth-intro">
          Register your student account using the admission
          details and one-time code provided by the school.
        </p>

        {message && (
          <div className="student-auth-message success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="student-auth-message error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="admission_number">
            Admission Number
          </label>
          <input
            id="admission_number"
            name="admission_number"
            value={form.admission_number}
            onChange={handleChange}
            autoComplete="username"
            placeholder="Enter your admission number"
            required
          />

          <label htmlFor="registration_code">
            One-Time Registration Code
          </label>
          <input
            id="registration_code"
            name="registration_code"
            value={form.registration_code}
            onChange={handleChange}
            autoComplete="off"
            placeholder="Enter the code from the school"
            required
          />

          <label htmlFor="password">Create Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            required
          />

          <label htmlFor="confirm_password">
            Confirm Password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            value={form.confirm_password}
            onChange={handleChange}
            autoComplete="new-password"
            minLength={8}
            placeholder="Enter your password again"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Create Student Account"}
          </button>
        </form>

        <p className="student-auth-footer">
          Already registered?{" "}
          <a href="/student/login">Student Login</a>
        </p>
      </section>
    </main>
  );
}
