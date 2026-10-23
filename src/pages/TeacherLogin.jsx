import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/TeacherLogin.css";

function TeacherLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/teacher-login/",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Invalid email or password."
        );

        return;
      }

      /*
        Django has successfully authenticated the teacher.

        We save only the teacher's ID, name and email.
        The password is NOT saved in localStorage.
      */

      const teacher = {
        id: data.id,
        name: data.name,
        email: data.email,
      };

      localStorage.setItem(
        "pcisTeacher",
        JSON.stringify(teacher)
      );

      navigate("/teacher");

    } catch (error) {
      console.error("Teacher login error:", error);

      setError(
        "Could not connect to the Django backend. Please make sure the backend server is running."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teacher-login-page">

      {/* HEADER */}
      <header className="teacher-login-header">

        <div className="teacher-login-brand">

          <div className="teacher-login-logo">
            PCIS
          </div>

          <div>
            <h1>
              Paraclete Classical International School
            </h1>

            <p>
              Virtual Classroom
            </p>
          </div>

        </div>

      </header>


      {/* MAIN */}
      <main className="teacher-login-main">

        <Link
          to="/"
          className="teacher-login-back"
        >
          ← Back to Virtual Classroom
        </Link>


        <section className="teacher-login-card">

          <div className="teacher-login-heading">

            <div className="teacher-login-icon">
              👨‍🏫
            </div>

            <span className="teacher-login-label">
              TEACHER PORTAL
            </span>

            <h2>
              Teacher Login
            </h2>

            <p>
              Sign in to access your teacher dashboard
              and manage your lessons.
            </p>

          </div>


          <form
            className="teacher-login-form"
            onSubmit={handleLogin}
          >

            <div className="teacher-login-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email address"
                autoComplete="email"
              />

            </div>


            <div className="teacher-login-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
              />

            </div>


            {error && (
              <div className="teacher-login-error">
                {error}
              </div>
            )}


            <button
              type="submit"
              className="teacher-login-button"
              disabled={loading}
            >
              {loading
                ? "Checking..."
                : "Login to Teacher Portal"}
            </button>

          </form>


          <div className="teacher-login-note">

            <span>
              ℹ
            </span>

            <p>
              Your teacher account is securely checked
              through the Django classroom backend.
            </p>

          </div>


          <Link
            to="/"
            className="teacher-login-home"
          >
            Return to Home
          </Link>

        </section>

      </main>


      {/* FOOTER */}
      <footer className="teacher-login-footer">

        <p>
          © {new Date().getFullYear()} Paraclete Classical International School
        </p>

        <span>
          Teacher Portal
        </span>

      </footer>

    </div>
  );
}

export default TeacherLogin;