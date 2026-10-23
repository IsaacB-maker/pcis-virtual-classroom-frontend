
import { Link } from "react-router-dom";
import "./StudentAuth.css";

export default function StudentPortal() {
  return (
    <main className="student-auth-page">
      <section className="student-auth-card student-portal-card">
        <div className="student-auth-brand">
          <div className="student-auth-logo">P</div>
          <p>PARACLETE CLASSICAL</p>
          <span>International School</span>
          <h1>Student Portal</h1>
        </div>

        <p className="student-auth-intro">
          Welcome to the PCIS Virtual Classroom. Sign in to
          continue learning, or register if this is your first time.
        </p>

        <div className="student-portal-actions">
          <Link
            to="/student/login"
            className="student-portal-button"
          >
            Student Login
          </Link>

          <Link
            to="/student/register"
            className="student-portal-button secondary"
          >
            New Student? Register
          </Link>
        </div>

        <p className="student-auth-footer">
          Your admission number and registration code must be
          provided or confirmed by the school.
        </p>

        <Link to="/" className="student-portal-home-link">
          ← Back to Home
        </Link>
      </section>
    </main>
  );
}
