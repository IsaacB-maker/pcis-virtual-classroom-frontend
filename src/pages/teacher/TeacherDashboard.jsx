import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/TeacherDashboard.css";

const API_URL = "http://127.0.0.1:8000/api";

function TeacherDashboard() {
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    schoolClass: "",
    subject: "",
    lessonTitle: "",
    lessonDate: "",
    lessonTime: "",
    description: "",
  });

  // ============================================================
  // LOAD TEACHER
  // ============================================================

  useEffect(() => {
    const savedTeacher =
      localStorage.getItem("pcisTeacher");

    if (!savedTeacher) {
      navigate("/teacher/login");
      return;
    }

    try {
      const parsedTeacher =
        JSON.parse(savedTeacher);

      if (!parsedTeacher?.id) {
        localStorage.removeItem(
          "pcisTeacher"
        );

        navigate("/teacher/login");
        return;
      }

      setTeacher(parsedTeacher);
    } catch (err) {
      console.error(
        "Could not read teacher information:",
        err
      );

      localStorage.removeItem(
        "pcisTeacher"
      );

      navigate("/teacher/login");
    }
  }, [navigate]);

  // ============================================================
  // LOAD CLASSES AND LESSONS
  // ============================================================

  useEffect(() => {
    if (!teacher?.id) {
      return;
    }

    loadDashboardData();
  }, [teacher]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        classesResponse,
        lessonsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/classes/`),
        fetch(`${API_URL}/lessons/`),
      ]);

      if (!classesResponse.ok) {
        throw new Error(
          "Could not load school classes."
        );
      }

      if (!lessonsResponse.ok) {
        throw new Error(
          "Could not load lessons."
        );
      }

      const classesData =
        await classesResponse.json();

      const lessonsData =
        await lessonsResponse.json();

      // --------------------------------------------------------
      // LOAD P1 - P7
      // --------------------------------------------------------

      if (Array.isArray(classesData)) {
        setClasses(classesData);
      } else {
        setClasses([]);
      }

      // --------------------------------------------------------
      // LOAD LESSONS
      // --------------------------------------------------------

      if (Array.isArray(lessonsData)) {
        setLessons(lessonsData);
      } else {
        setLessons([]);
      }
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // CREATE LESSON
  // ============================================================

  const handleCreateLesson = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!teacher?.id) {
      setError(
        "Your teacher session has expired. Please login again."
      );

      navigate("/teacher/login");
      return;
    }

    if (!formData.schoolClass) {
      setError(
        "Please select a school class."
      );
      return;
    }

    if (!formData.subject.trim()) {
      setError(
        "Please enter the subject."
      );
      return;
    }

    if (!formData.lessonTitle.trim()) {
      setError(
        "Please enter the lesson title."
      );
      return;
    }

    if (!formData.lessonDate) {
      setError(
        "Please select the lesson date."
      );
      return;
    }

    if (!formData.lessonTime) {
      setError(
        "Please select the lesson time."
      );
      return;
    }

    const selectedClass =
      classes.find(
        (schoolClass) =>
          String(schoolClass.id) ===
          String(formData.schoolClass)
      );

    if (!selectedClass) {
      setError(
        "The selected school class could not be found."
      );
      return;
    }

    try {
      setCreatingLesson(true);

      // ========================================================
      // STEP 1: CREATE LESSON
      // ========================================================

      const lessonResponse =
        await fetch(
          `${API_URL}/lessons/`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              teacher: teacher.id,

              school_class:
                selectedClass.id,

              subject:
                formData.subject.trim(),

              title:
                formData.lessonTitle.trim(),

              lesson_date:
                formData.lessonDate,

              lesson_time:
                formData.lessonTime,

              description:
                formData.description.trim(),

              status: "scheduled",
            }),
          }
        );

      const lessonData =
        await lessonResponse.json();

      if (!lessonResponse.ok) {
        console.error(
          "Lesson creation error:",
          lessonData
        );

        throw new Error(
          lessonData.error ||
            "The lesson could not be created."
        );
      }

      // ========================================================
      // STEP 2: GET CLASSROOM SESSION
      // ========================================================

      const classroomSession =
        lessonData.classroom_session;

      if (!classroomSession?.id) {
        console.error(
          "Backend response:",
          lessonData
        );

        throw new Error(
          "The lesson was created, but its classroom session was not returned."
        );
      }

      // ========================================================
      // STEP 3: START CLASSROOM SESSION
      // ========================================================

      const startResponse =
        await fetch(
          `${API_URL}/sessions/${classroomSession.id}/start/`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              teacher: teacher.id,
            }),
          }
        );

      const startData =
        await startResponse.json();

      if (!startResponse.ok) {
        console.error(
          "Classroom start error:",
          startData
        );

        throw new Error(
          startData.error ||
            "The classroom could not be started."
        );
      }

      // ========================================================
      // STEP 4: SAVE ACTIVE CLASSROOM
      // ========================================================

      const activeLesson =
        startData.session
          ? {
              ...lessonData.lesson,

              classroom_session:
                startData.session,
            }
          : lessonData.lesson;

      localStorage.setItem(
        "pcisActiveLesson",
        JSON.stringify(activeLesson)
      );

      /*
       * We can still save these values because
       * other parts of the application may use them.
       *
       * IMPORTANT:
       * ClassroomConference will no longer trust
       * this value to decide whether the current
       * route belongs to the teacher or student.
       */

      localStorage.setItem(
        "pcisClassroomRole",
        "teacher"
      );

      localStorage.setItem(
        "pcisActiveClass",
        selectedClass.name
      );

      if (startData.session) {
        localStorage.setItem(
          "pcisActiveSession",
          JSON.stringify(
            startData.session
          )
        );
      }

      // ========================================================
      // STEP 5: UPDATE LESSON LIST
      // ========================================================

      if (lessonData.lesson) {
        setLessons((previous) => [
          lessonData.lesson,
          ...previous,
        ]);
      }

      setSuccess(
        `The ${selectedClass.name} classroom is now live.`
      );

      // ========================================================
      // STEP 6: OPEN TEACHER CLASSROOM
      // ========================================================

      /*
       * IMPORTANT:
       *
       * The teacher MUST NOT enter the public
       * student classroom route.
       *
       * Student:
       * /primary/p4
       *
       * Teacher:
       * /teacher/classroom/p4
       *
       * This separation prevents a student's
       * browser from receiving the teacher's
       * End Class control.
       */

      navigate(
        `/teacher/classroom/${selectedClass.name.toLowerCase()}`
      );
    } catch (err) {
      console.error(
        "Create lesson process failed:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while creating the lesson."
      );
    } finally {
      setCreatingLesson(false);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "pcisTeacher"
    );

    localStorage.removeItem(
      "pcisActiveLesson"
    );

    localStorage.removeItem(
      "pcisActiveSession"
    );

    localStorage.removeItem(
      "pcisClassroomRole"
    );

    localStorage.removeItem(
      "pcisActiveClass"
    );

    navigate("/teacher/login");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="teacher-dashboard">
        <div className="teacher-dashboard-loading">
          Loading teacher dashboard...
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="teacher-dashboard">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="teacher-dashboard-header">

        <div>

          <h1>
            Teacher Dashboard
          </h1>

          <p>
            Welcome{" "}
            <strong>
              {teacher?.name}
            </strong>
          </p>

        </div>

        <button
          type="button"
          className="teacher-logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="teacher-dashboard-content">

        {/* ====================================================
            INTRO
        ==================================================== */}

        <section className="teacher-dashboard-intro">

          <h2>
            Create a Live Lesson
          </h2>

          <p>
            Select the class that should attend
            this lesson. When you create it,
            your classroom will open automatically.
          </p>

          <p>
            Only students belonging to the selected
            class will receive the live classroom
            notification.
          </p>

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {error && (
          <div className="teacher-dashboard-error">
            {error}
          </div>
        )}

        {success && (
          <div className="teacher-dashboard-success">
            {success}
          </div>
        )}

        {/* ====================================================
            CREATE LESSON
        ==================================================== */}

        <section className="teacher-create-lesson-card">

          <h2>
            Create Lesson
          </h2>

          <form
            onSubmit={
              handleCreateLesson
            }
          >

            {/* SCHOOL CLASS */}

            <div className="teacher-form-group">

              <label htmlFor="schoolClass">
                School Class
              </label>

              <select
                id="schoolClass"
                name="schoolClass"
                value={
                  formData.schoolClass
                }
                onChange={
                  handleChange
                }
                disabled={
                  creatingLesson
                }
              >

                <option value="">
                  Select Class
                </option>

                {classes.map(
                  (schoolClass) => (
                    <option
                      key={
                        schoolClass.id
                      }
                      value={
                        schoolClass.id
                      }
                    >
                      {schoolClass.name}
                    </option>
                  )
                )}

              </select>

              {classes.length === 0 && (
                <small
                  style={{
                    marginTop: "8px",
                    color: "#a83232",
                  }}
                >
                  No classes were loaded.
                  Please refresh the page.
                </small>
              )}

            </div>

            {/* SUBJECT */}

            <div className="teacher-form-group">

              <label htmlFor="subject">
                Subject
              </label>

              <input
                id="subject"
                type="text"
                name="subject"
                placeholder="e.g. Mathematics"
                value={
                  formData.subject
                }
                onChange={
                  handleChange
                }
                disabled={
                  creatingLesson
                }
              />

            </div>

            {/* LESSON TITLE */}

            <div className="teacher-form-group">

              <label htmlFor="lessonTitle">
                Lesson Title
              </label>

              <input
                id="lessonTitle"
                type="text"
                name="lessonTitle"
                placeholder="e.g. Fractions"
                value={
                  formData.lessonTitle
                }
                onChange={
                  handleChange
                }
                disabled={
                  creatingLesson
                }
              />

            </div>

            {/* DATE + TIME */}

            <div className="teacher-form-row">

              <div className="teacher-form-group">

                <label htmlFor="lessonDate">
                  Lesson Date
                </label>

                <input
                  id="lessonDate"
                  type="date"
                  name="lessonDate"
                  value={
                    formData.lessonDate
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    creatingLesson
                  }
                />

              </div>

              <div className="teacher-form-group">

                <label htmlFor="lessonTime">
                  Lesson Time
                </label>

                <input
                  id="lessonTime"
                  type="time"
                  name="lessonTime"
                  value={
                    formData.lessonTime
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    creatingLesson
                  }
                />

              </div>

            </div>

            {/* DESCRIPTION */}

            <div className="teacher-form-group">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows="5"
                placeholder="Enter a short description of the lesson..."
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                disabled={
                  creatingLesson
                }
              />

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="teacher-create-lesson-button"
              disabled={
                creatingLesson
              }
            >
              {creatingLesson
                ? "Creating Classroom..."
                : "Create Lesson & Start Classroom"}
            </button>

          </form>

        </section>

        {/* ====================================================
            CREATED LESSONS
        ==================================================== */}

        <section className="teacher-lessons-card">

          <div className="teacher-lessons-header">

            <div>

              <h2>
                Created Lessons
              </h2>

              <p>
                Your recently created lessons
                are shown here.
              </p>

            </div>

            <button
              type="button"
              onClick={
                loadDashboardData
              }
              className="teacher-refresh-button"
            >
              Refresh
            </button>

          </div>

          {lessons.length === 0 ? (
            <div className="teacher-empty-lessons">
              No lessons have been created yet.
            </div>
          ) : (
            <div className="teacher-lessons-list">

              {lessons.map(
                (lesson) => (
                  <div
                    key={lesson.id}
                    className="teacher-lesson-item"
                  >

                    <div>

                      <h3>
                        {lesson.title}
                      </h3>

                      <p>
                        <strong>
                          Class:
                        </strong>{" "}
                        {lesson.class_name ||
                          lesson.school_class}
                      </p>

                      <p>
                        <strong>
                          Subject:
                        </strong>{" "}
                        {lesson.subject}
                      </p>

                      <p>
                        <strong>
                          Date:
                        </strong>{" "}
                        {lesson.lesson_date}
                      </p>

                      <p>
                        <strong>
                          Time:
                        </strong>{" "}
                        {lesson.lesson_time}
                      </p>

                    </div>

                    <span
                      className={`teacher-lesson-status ${
                        lesson.status
                          ? lesson.status.toLowerCase()
                          : ""
                      }`}
                    >
                      {lesson.status}
                    </span>

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* ====================================================
            CLASSROOM INFORMATION
        ==================================================== */}

        <section className="teacher-dashboard-info">

          <h2>
            How the classroom works
          </h2>

          <div className="teacher-info-grid">

            <div>

              <h3>
                1. Select a Class
              </h3>

              <p>
                Choose P1, P2, P3, P4, P5,
                P6 or P7.
              </p>

            </div>

            <div>

              <h3>
                2. Create the Lesson
              </h3>

              <p>
                Enter the subject, lesson title,
                date, time and description.
              </p>

            </div>

            <div>

              <h3>
                3. Classroom Starts
              </h3>

              <p>
                The lesson's own classroom session
                is started automatically.
              </p>

            </div>

            <div>

              <h3>
                4. Students Are Notified
              </h3>

              <p>
                Only students in the selected class
                can see that classroom as live.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="teacher-dashboard-footer">

        <p>
          PCIS Virtual Classroom
        </p>

      </footer>

    </div>
  );
}

export default TeacherDashboard;