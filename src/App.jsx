
import { Navigate, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Primary from "./pages/Primary";
import TeacherLogin from "./pages/TeacherLogin";

import P1Classroom from "./pages/P1Classroom";
import P2Classroom from "./pages/P2Classroom";
import P3Classroom from "./pages/P3Classroom";
import P4Classroom from "./pages/P4Classroom";
import P5Classroom from "./pages/P5Classroom";
import P6Classroom from "./pages/P6Classroom";
import P7Classroom from "./pages/P7Classroom";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import ClassroomConference from "./pages/classroom/ClassroomConference";
import RecordedLessons from "./pages/RecordedLessons";

import StudentLogin from "./pages/student/StudentLogin";
import StudentDashboard from "./pages/student/StudentDashboard";

import AdminLogin from "./pages/administration/AdminLogin";
import AdminDashboard from "./pages/administration/AdminDashboard";

function App() {
  return (
    <Routes>
      {/* SCHOOL HOMEPAGE */}
      <Route path="/" element={<Home />} />

      {/* PRIMARY SCHOOL */}
      <Route path="/primary" element={<Primary />} />

      {/* STUDENT PORTAL */}
      <Route path="/student" element={<StudentLogin />} />
      <Route path="/student/login" element={<StudentLogin />} />

      <Route
        path="/student/register"
        element={<Navigate to="/student/login" replace />}
      />

      <Route
        path="/student/dashboard"
        element={<StudentDashboard />}
      />

      {/* STUDENT CLASSROOMS */}
      <Route path="/primary/p1" element={<P1Classroom />} />
      <Route path="/primary/p2" element={<P2Classroom />} />
      <Route path="/primary/p3" element={<P3Classroom />} />
      <Route path="/primary/p4" element={<P4Classroom />} />
      <Route path="/primary/p5" element={<P5Classroom />} />
      <Route path="/primary/p6" element={<P6Classroom />} />
      <Route path="/primary/p7" element={<P7Classroom />} />

      {/* TEACHER PORTAL */}
      <Route path="/teacher" element={<TeacherDashboard />} />
      <Route path="/teacher/login" element={<TeacherLogin />} />

      <Route
        path="/teacher/classroom/:className"
        element={<ClassroomConference />}
      />

      {/* RECORDED LESSONS */}
      <Route
        path="/recorded-lessons"
        element={<RecordedLessons />}
      />

      {/* SCHOOL ADMINISTRATION PORTAL */}
      <Route
        path="/administration"
        element={<Navigate to="/administration/login" replace />}
      />

      <Route
        path="/administration/login"
        element={<AdminLogin />}
      />

      <Route
        path="/administration/dashboard"
        element={<AdminDashboard />}
      />

      {/* UNKNOWN URLS RETURN TO THE HOMEPAGE */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
