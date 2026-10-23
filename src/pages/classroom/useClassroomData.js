
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000/api";

export function useClassroomData(className) {
  const location = useLocation();

  const routeClassName = useMemo(() => {
    const path = location.pathname;

    const studentMatch = path.match(
      /^\/primary\/(p[1-7])\/?$/i
    );

    if (studentMatch) {
      return studentMatch[1].toUpperCase();
    }

    const teacherMatch = path.match(
      /^\/teacher\/classroom\/(p[1-7])\/?$/i
    );

    if (teacherMatch) {
      return teacherMatch[1].toUpperCase();
    }

    return "";
  }, [location.pathname]);

  const isTeacherRoute = useMemo(
    () => /^\/teacher\/classroom\/p[1-7]\/?$/i.test(location.pathname),
    [location.pathname]
  );

  const isStudentRoute = useMemo(
    () => /^\/primary\/p[1-7]\/?$/i.test(location.pathname),
    [location.pathname]
  );

  const isTeacher = isTeacherRoute;

  const currentClassName = useMemo(() => {
    if (routeClassName) return routeClassName;

    if (typeof className === "string") {
      return className.trim().toUpperCase();
    }

    return "";
  }, [className, routeClassName]);

  const [schoolClass, setSchoolClass] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lessonsLoaded, setLessonsLoaded] = useState(false);

  const lessonsRequestIdRef = useRef(0);

  const teacher = useMemo(() => {
    try {
      const teacherRaw = localStorage.getItem("pcisTeacher");
      return teacherRaw ? JSON.parse(teacherRaw) : null;
    } catch {
      return null;
    }
  }, []);

  // Load the selected class from Django.
  useEffect(() => {
    let cancelled = false;

    async function loadClass() {
      setLoading(true);
      setError("");
      setSchoolClass(null);
      setLessons([]);
      setLessonsLoaded(false);
      setJoined(false);
      setSocketConnected(false);
      lessonsRequestIdRef.current++;

      try {
        if (!currentClassName) {
          throw new Error(
            "No classroom was specified. Please open a valid class."
          );
        }

        const response = await fetch(`${API_BASE_URL}/classes/`);

        if (!response.ok) {
          throw new Error("Could not load classes from Django.");
        }

        const data = await response.json();

        const classes = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : null;

        if (!classes) {
          throw new Error("The classes response is invalid.");
        }

        const foundClass = classes.find(
          (item) =>
            String(item.name || "").trim().toUpperCase() ===
            currentClassName
        );

        if (!foundClass) {
          throw new Error(`Class ${currentClassName} was not found.`);
        }

        if (!cancelled) {
          setSchoolClass(foundClass);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Class loading error:", err);
          setError(err.message || "Could not load the classroom.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClass();

    return () => {
      cancelled = true;
    };
  }, [currentClassName]);

  // Refresh only the lessons belonging to the selected class.
  useEffect(() => {
    if (!schoolClass?.id || !schoolClass?.name) return;

    let cancelled = false;

    async function loadLessons() {
      const requestId = ++lessonsRequestIdRef.current;

      try {
        const selectedClass = String(schoolClass.name)
          .trim()
          .toUpperCase();

        const response = await fetch(
          `${API_BASE_URL}/lessons/?class=${encodeURIComponent(
            selectedClass
          )}`
        );

        if (!response.ok) {
          throw new Error("Could not refresh classroom lessons.");
        }

        const data = await response.json();

        if (
          cancelled ||
          requestId !== lessonsRequestIdRef.current
        ) {
          return;
        }

        const lessonData = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : null;

        if (!lessonData) {
          throw new Error("The lessons response is invalid.");
        }

        const selectedClassId = String(schoolClass.id);

        const classLessons = lessonData.filter((lesson) => {
          const lessonClassId =
            lesson.school_class &&
            typeof lesson.school_class === "object"
              ? lesson.school_class.id
              : lesson.school_class;

          return String(lessonClassId) === selectedClassId;
        });

        setLessons(classLessons);
        setLessonsLoaded(true);
        setError("");
      } catch (err) {
        if (!cancelled) {
          // Keep the last successful lesson list if a refresh fails.
          console.error("Lesson refresh error:", err);
        }
      }
    }

    loadLessons();

    const intervalId = setInterval(loadLessons, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      lessonsRequestIdRef.current++;
    };
  }, [schoolClass?.id, schoolClass?.name]);

  // Accept a lesson only when both the lesson and session are live.
  const liveLesson = useMemo(() => {
    if (!schoolClass) return null;

    const selectedClassId = String(schoolClass.id);

    const activeLessons = lessons.filter((lesson) => {
      const lessonClassId =
        lesson.school_class &&
        typeof lesson.school_class === "object"
          ? lesson.school_class.id
          : lesson.school_class;

      if (String(lessonClassId) !== selectedClassId) {
        return false;
      }

      if (
        String(lesson.status || "").toLowerCase() !== "live"
      ) {
        return false;
      }

      const session = lesson.classroom_session;

      if (!session || typeof session !== "object") {
        return false;
      }

      return (
        String(session.status || "").toLowerCase() === "live" &&
        session.is_live === true &&
        Boolean(session.room_id)
      );
    });

    if (activeLessons.length === 0) return null;

    return [...activeLessons].sort(
      (a, b) => Number(b.id) - Number(a.id)
    )[0];
  }, [lessons, schoolClass]);

  // Keep convenience storage consistent with the selected class.
  useEffect(() => {
    if (!schoolClass || !lessonsLoaded) return;

    const selectedClass = String(schoolClass.name || "")
      .trim()
      .toUpperCase();

    const storedClass = localStorage.getItem("pcisActiveClass");

    if (!liveLesson) {
      if (
        storedClass &&
        storedClass.trim().toUpperCase() === selectedClass
      ) {
        localStorage.removeItem("pcisActiveLesson");
        localStorage.removeItem("pcisActiveSession");
        localStorage.removeItem("pcisActiveClass");
      }

      return;
    }

    localStorage.setItem(
      "pcisActiveLesson",
      JSON.stringify(liveLesson)
    );

    if (liveLesson.classroom_session) {
      localStorage.setItem(
        "pcisActiveSession",
        JSON.stringify(liveLesson.classroom_session)
      );

      localStorage.setItem("pcisActiveClass", selectedClass);
    }
  }, [liveLesson, schoolClass, lessonsLoaded]);

  return {
    isTeacherRoute,
    isStudentRoute,
    isTeacher,
    routeClassName,
    currentClassName,
    schoolClass,
    lessons,
    liveLesson,
    loading,
    error,
    setError,
    joined,
    setJoined,
    socketConnected,
    setSocketConnected,
    teacher,
  };
}
