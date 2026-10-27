
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentManagement from "./StudentManagement";
import SchoolFeesManagement from "./SchoolFeesManagement";
import TeacherManagement from "./TeacherManagement";
import ClassManagement from "./ClassManagement";
import LessonManagement from "./LessonManagement";
import AttendanceManagement from "./AttendanceManagement";
import RecordedLessonsManagement from "./RecordedLessonsManagement";
import "./AdminDashboard.css";

const API_BASE_URL = "http://localhost:8000/api/administration";

const menuItems = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "students", label: "Students", icon: "♙" },
  { id: "fees", label: "School Fees", icon: "▤" },
  { id: "teachers", label: "Teachers", icon: "♧" },
  { id: "classes", label: "Classes", icon: "▦" },
  { id: "lessons", label: "Lessons", icon: "▣" },
  { id: "attendance", label: "Attendance", icon: "✓" },
  { id: "recordings", label: "Recorded Lessons", icon: "▷" },
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

function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const loadAdministrator = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`${API_BASE_URL}/me/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.user) {
        navigate("/administration/login", { replace: true });
        return;
      }

      setUser(data.user);
    } catch {
      setError(
        "We could not connect to the school server. Please check that your Django backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAdministrator();
  }, [loadAdministrator]);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API_BASE_URL}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
      });

      await readResponse(response);
      navigate("/administration/login", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-dashboard-loading">
        <div className="admin-loading-spinner" />
        <p>Loading your administration workspace...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-dashboard-loading">
        <p>{error || "Checking your administrator account..."}</p>

        {error && (
          <button onClick={loadAdministrator} type="button">
            Try again
          </button>
        )}
      </main>
    );
  }

  const isOwner = Boolean(user.is_owner);

  const visibleMenuItems = isOwner
    ? [
        ...menuItems,
        {
          id: "administrators",
          label: "Administrator Accounts",
          icon: "♙",
        },
      ]
    : menuItems;

  const activeItem = visibleMenuItems.find(
    (item) => item.id === activeSection
  );

  function selectSection(section) {
    setActiveSection(section);
    setError("");
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">P</div>

          <div>
            <h2>PCIS</h2>
            <p>School Administration</p>
          </div>
        </div>

        <div className="admin-sidebar-label">MAIN MENU</div>

        <nav
          className="admin-sidebar-nav"
          aria-label="Administration menu"
        >
          {visibleMenuItems.map((item) => (
            <button
              className={`admin-nav-item ${
                activeSection === item.id ? "active" : ""
              }`}
              key={item.id}
              type="button"
              onClick={() => selectSection(item.id)}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {item.icon}
              </span>

              <span>{item.label}</span>

              {activeSection === item.id && (
                <span className="admin-nav-active-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-account">
            <div className="admin-account-avatar">
              {(user.username || "A").charAt(0).toUpperCase()}
            </div>

            <div className="admin-account-details">
              <strong>{user.username}</strong>
              <span>
                {isOwner ? "System Owner" : "School Administrator"}
              </span>
            </div>
          </div>

          <button
            className="admin-logout-button"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span aria-hidden="true">↪</span>
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <main className="admin-dashboard-main">
        <header className="admin-dashboard-topbar">
          <div className="admin-topbar-heading">
            <p className="admin-breadcrumb">
              PCIS <span>/</span> Administration
            </p>

            <h1>{activeItem?.label || "Overview"}</h1>
          </div>

          <div className="admin-topbar-user">
            <div className="admin-status-indicator" />
            <span>
              {isOwner ? "Owner access" : "Administrator access"}
            </span>
          </div>
        </header>

        <div className="admin-dashboard-content">
          {error && (
            <div className="admin-dashboard-error" role="alert">
              {error}
            </div>
          )}

          {activeSection === "overview" ? (
            <>
              <section className="admin-welcome-panel">
                <div>
                  <span className="admin-welcome-eyebrow">
                    SCHOOL MANAGEMENT WORKSPACE
                  </span>

                  <h2>Welcome back, {user.username}!</h2>

                  <p>
                    Manage school operations from one place. Choose a
                    section below to get started.
                  </p>
                </div>

                <div
                  className="admin-welcome-mark"
                  aria-hidden="true"
                >
                  P
                </div>
              </section>

              <section className="admin-section-heading">
                <div>
                  <h2>School operations</h2>
                  <p>Choose the area you want to manage.</p>
                </div>
              </section>

              <section className="admin-module-grid">
                {menuItems.map((item) => (
                  <button
                    className="admin-module-card"
                    key={item.id}
                    type="button"
                    onClick={() => selectSection(item.id)}
                  >
                    <span className="admin-module-icon">
                      {item.icon}
                    </span>

                    <span className="admin-module-title">
                      {item.label}
                    </span>

                    <span className="admin-module-description">
                      Open {item.label.toLowerCase()} workspace
                    </span>

                    <span
                      className="admin-module-arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </button>
                ))}
              </section>

              {isOwner && (
                <section className="admin-owner-panel">
                  <div className="admin-owner-panel-icon">♙</div>

                  <div>
                    <h3>Owner controls</h3>
                    <p>
                      Create school administrator accounts and manage
                      their assigned permissions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => selectSection("administrators")}
                  >
                    Manage accounts →
                  </button>
                </section>
              )}
            </>
         
) : activeSection === "students" ? (
  <StudentManagement />
) : activeSection === "teachers" ? (
  <TeacherManagement />
) : activeSection === "fees" ? (
  <SchoolFeesManagement />
) : activeSection === "classes" ? (
  <ClassManagement />
) : activeSection === "lessons" ? (
  <LessonManagement />
) : activeSection === "attendance" ? (
  <AttendanceManagement />
) : activeSection === "recordings" ? (
  <RecordedLessonsManagement />
) : (

            <section className="admin-workspace-placeholder">
              <div className="admin-placeholder-icon">
                {activeItem?.icon || "▣"}
              </div>

              <h2>{activeItem?.label || "Administration"}</h2>

              <p>
                This workspace has not been connected yet. The Students
                workspace is connected to its separate component and
                uses the existing Django data API.
              </p>

              <button
                type="button"
                onClick={() => selectSection("overview")}
              >
                ← Back to overview
              </button>
            </section>
          )}

          <footer className="admin-dashboard-footer">
            <span>
              © {new Date().getFullYear()} Paraclete Classical
              International School
            </span>

            <span>School Administration Portal</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
