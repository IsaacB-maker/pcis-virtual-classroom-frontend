
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentAuth.css";

const API_BASE_URL = "http://localhost:8000/api/students";


function getClassRoute(className) {
  const normalized = String(className || "")
    .trim()
    .toUpperCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

  const match = normalized.match(
    /^(?:P|PRIMARY\s*)?([1-7])$/
  );

  if (!match) {
    return null;
  }

  return `/primary/p${match[1]}`;
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudentProfile() {
      try {
        const response = await fetch(`${API_BASE_URL}/me/`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem("pcisStudent");

            if (!cancelled) {
              navigate("/student/login", { replace: true });
            }

            return;
          }

          throw new Error(
            data.error ||
              data.detail ||
              "Could not load your student profile."
          );
        }

        if (cancelled) return;

        // Support either a nested student object or a direct profile response.
        const profile = data.student || data;

        // The backend remains the authority for lesson access.
        const allowed =
          data.access_allowed === true ||
          profile.access_allowed === true;
          console.log("Student profile response:", data);
console.log("Lesson access allowed:", allowed);

        const message =
          data.access_message ||
          profile.access_message ||
          "";

        setStudent(profile);
        setAccessAllowed(allowed);
        setAccessMessage(message);

        // Refresh the cached display information from the server.
        sessionStorage.setItem("pcisStudent", JSON.stringify(profile));
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Unable to connect to the school server. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudentProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <main className="student-auth-page">
        <section className="student-auth-card">
          <p className="student-auth-intro">
            Loading your student account...
          </p>
        </section>
      </main>
    );
  }

  const className = student?.school_class;
  const classRoute = getClassRoute(className);
  console.log("Assigned class:", className);
  console.log("Classroom route:", classRoute);

  return (
    <main className="student-auth-page">
      <section className="student-auth-card">
        <div className="student-auth-brand">
          <div className="student-auth-logo">P</div>
          <p>PARACLETE CLASSICAL</p>
          <h1>Student Dashboard</h1>
          <span>International School</span>
        </div>

        {error ? (
          <>
            <div className="student-auth-message error" role="alert">
              {error}
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <p className="student-auth-intro">
              Welcome to your PCIS student learning area.
            </p>

            <div className="student-auth-message success">
              <strong>Student:</strong>{" "}
              {student?.full_name || "Student"}
              <br />
              <strong>Admission number:</strong>{" "}
              {student?.admission_number || "Not available"}
              <br />
              <strong>Assigned class:</strong>{" "}
              {className || "Not assigned"}
            </div>

            {accessAllowed && classRoute ? (
              <>
                <p className="student-auth-intro">
                  Your account is eligible to access your assigned classroom.
                </p>

                <button
                  type="button"
                  onClick={() => navigate(classRoute)}
                >
                  Enter My Classroom
                </button>
              </>
            ) : (
              <div className="student-auth-message error" role="status">
                {accessMessage ||
                  (className
                    ? "Your account is not currently eligible to enter lessons."
                    : "Your class has not been assigned. Please contact the school administration.")}
              </div>
            )}

            {!classRoute && className && (
              <p className="student-auth-intro">
                The assigned class could not be matched to a primary classroom.
                Please contact the school administration.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
