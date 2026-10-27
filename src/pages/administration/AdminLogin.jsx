
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

const API_BASE_URL = "http://localhost:8000/api/administration";

async function getCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/csrf/`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok || !data.csrfToken) {
    throw new Error("Unable to establish a secure login session.");
  }

  return data.csrfToken;
}

function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Login failed. Please check your details."
        );
      }

      navigate("/administration/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">
          <div className="admin-login-logo" aria-hidden="true">
            P
          </div>

          <p className="admin-login-school">
            Paraclete Classical International School
          </p>

          <span className="admin-login-label">
            SCHOOL ADMINISTRATION
          </span>
        </div>

        <div className="admin-login-heading">
          <h1>Welcome back</h1>
          <p>Sign in to manage school operations securely.</p>
        </div>

        {error && (
          <div className="admin-login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-login-field">
            <label htmlFor="admin-username">Username</label>

            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password">Password</label>

            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            className="admin-login-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in securely"}
          </button>
        </form>

        <p className="admin-login-security">
          <span aria-hidden="true">●</span>
          Authorized school personnel only
        </p>

        <button
          className="admin-login-back"
          type="button"
          onClick={() => navigate("/")}
        >
          Return to school homepage
        </button>
      </section>

      <footer className="admin-login-footer">
        © {new Date().getFullYear()} Paraclete Classical International
        School
      </footer>
    </main>
  );
}

export default AdminLogin;
