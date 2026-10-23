import { useState } from "react";
import "./ClassroomTabs.css";
import ClassroomConference from "./classroom/ClassroomConference";
import RecordedLessons from "./RecordedLessons";

function ClassroomPage({ className }) {
  const [activeTab, setActiveTab] = useState("live");

  const currentClassName =
    className?.trim().toUpperCase() || "";

  return (
    <div className="individual-classroom">

      {/* CLASSROOM TABS */}
      <div className="classroom-tabs">

        <button
          type="button"
          className={
            activeTab === "live"
              ? "classroom-tab active"
              : "classroom-tab"
          }
          onClick={() => setActiveTab("live")}
        >
          🔴 Live Classroom
        </button>

        <button
          type="button"
          className={
            activeTab === "recordings"
              ? "classroom-tab active"
              : "classroom-tab"
          }
          onClick={() => setActiveTab("recordings")}
        >
          📚 Recorded Lessons
        </button>

      </div>

      {/* LIVE CLASSROOM */}
      {activeTab === "live" && (
        <ClassroomConference
          className={currentClassName}
        />
      )}

      {/* RECORDED LESSONS */}
      {activeTab === "recordings" && (
        <RecordedLessons
          className={currentClassName}
        />
      )}

    </div>
  );
}

export default ClassroomPage;