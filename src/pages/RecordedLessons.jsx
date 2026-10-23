import { useEffect, useMemo, useState } from "react";
import "./RecordedLessons.css";

const API_BASE_URL = "http://127.0.0.1:8000/api";

function RecordedLessons({ className }) {
  const [recordings, setRecordings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedRecording, setSelectedRecording] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentClassName = useMemo(() => {
    return className?.trim().toUpperCase() || "";
  }, [className]);

  useEffect(() => {
    const fetchRecordings = async () => {
      if (!currentClassName) {
        setRecordings([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/recordings/?class=${encodeURIComponent(
            currentClassName
          )}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load recordings. Server returned ${response.status}.`
          );
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setRecordings(data);
        } else if (Array.isArray(data.results)) {
          setRecordings(data.results);
        } else {
          setRecordings([]);
        }
      } catch (err) {
        console.error("Recording loading error:", err);
        setError(
          "We could not load the recorded lessons right now."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [currentClassName]);

  const subjects = useMemo(() => {
    const uniqueSubjects = recordings
      .map((recording) => recording.subject)
      .filter(Boolean);

    return ["All", ...new Set(uniqueSubjects)];
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return recordings.filter((recording) => {
      const matchesSubject =
        selectedSubject === "All" ||
        recording.subject?.toLowerCase() ===
          selectedSubject.toLowerCase();

      const searchableText = [
        recording.subject,
        recording.title,
        recording.description,
        recording.teacher_name,
        recording.class_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      return matchesSubject && matchesSearch;
    });
  }, [recordings, searchTerm, selectedSubject]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-UG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) {
      return "";
    }

    const totalSeconds = Number(seconds);

    if (Number.isNaN(totalSeconds)) {
      return "";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  };

  const getVideoUrl = (recording) => {
    if (!recording) {
      return "";
    }

    if (recording.video_url) {
      return recording.video_url;
    }

    if (recording.video) {
      if (recording.video.startsWith("http")) {
        return recording.video;
      }

      return `http://127.0.0.1:8000${recording.video}`;
    }

    return "";
  };

  return (
    <section className="recorded-lessons">
      <div className="recorded-lessons-header">
        <div>
          <span className="recorded-lessons-label">
            PCIS LEARNING LIBRARY
          </span>

          <h2>
            Recorded Lessons
            {currentClassName && ` — ${currentClassName}`}
          </h2>

          <p>
            Search and watch lessons that have already been
            taught in your class.
          </p>
        </div>
      </div>

      <div className="recorded-lessons-tools">
        <div className="recorded-search-box">
          <span className="search-icon">🔎</span>

          <input
            type="text"
            placeholder="Search lessons, subjects, teachers..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="subject-filter">
          <select
            value={selectedSubject}
            onChange={(event) =>
              setSelectedSubject(event.target.value)
            }
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject === "All"
                  ? "All Subjects"
                  : subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="recorded-status">
          <div className="recorded-spinner"></div>

          <p>Loading recorded lessons...</p>
        </div>
      )}

      {!loading && error && (
        <div className="recorded-status recorded-error">
          <div className="status-icon">⚠️</div>

          <h3>Unable to load lessons</h3>

          <p>{error}</p>
        </div>
      )}

      {!loading &&
        !error &&
        filteredRecordings.length === 0 && (
          <div className="recorded-status recorded-empty">
            <div className="status-icon">📚</div>

            <h3>
              {recordings.length === 0
                ? "No recorded lessons yet"
                : "No lessons found"}
            </h3>

            <p>
              {recordings.length === 0
                ? `Recorded lessons for ${currentClassName || "this class"} will appear here after teachers complete their lessons.`
                : "Try another search word or change the subject filter."}
            </p>

            {searchTerm && (
              <button
                type="button"
                className="clear-results-button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSubject("All");
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        )}

      {!loading &&
        !error &&
        filteredRecordings.length > 0 && (
          <div className="recorded-lessons-grid">
            {filteredRecordings.map((recording) => {
              const videoUrl = getVideoUrl(recording);

              return (
                <article
                  className="recorded-lesson-card"
                  key={recording.id}
                >
                  <div className="recorded-thumbnail">
                    <div className="thumbnail-icon">
                      ▶
                    </div>

                    {recording.duration && (
                      <span className="recorded-duration">
                        {formatDuration(recording.duration)}
                      </span>
                    )}
                  </div>

                  <div className="recorded-card-content">
                    <span className="recorded-subject">
                      {recording.subject ||
                        "Recorded Lesson"}
                    </span>

                    <h3>
                      {recording.title ||
                        recording.lesson_title ||
                        "Untitled Lesson"}
                    </h3>

                    {recording.description && (
                      <p className="recorded-description">
                        {recording.description}
                      </p>
                    )}

                    <div className="recorded-meta">
                      <span>
                        👨‍🏫{" "}
                        {recording.teacher_name ||
                          "Teacher"}
                      </span>

                      <span>
                        📅{" "}
                        {formatDate(
                          recording.created_at ||
                            recording.lesson_date
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="watch-recording-button"
                      onClick={() =>
                        setSelectedRecording(recording)
                      }
                      disabled={!videoUrl}
                    >
                      ▶ Watch Lesson
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      {selectedRecording && (
        <div
          className="recording-modal"
          onClick={() => setSelectedRecording(null)}
        >
          <div
            className="recording-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="close-recording-modal"
              onClick={() => setSelectedRecording(null)}
              aria-label="Close video"
            >
              ×
            </button>

            <div className="recording-modal-heading">
              <span>
                {selectedRecording.subject ||
                  "Recorded Lesson"}
              </span>

              <h2>
                {selectedRecording.title ||
                  selectedRecording.lesson_title ||
                  "Recorded Lesson"}
              </h2>
            </div>

            {getVideoUrl(selectedRecording) ? (
              <video
                className="recording-video-player"
                src={getVideoUrl(selectedRecording)}
                controls
                autoPlay
                playsInline
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="video-unavailable">
                <div>🎥</div>

                <h3>Video not available</h3>

                <p>
                  The recording information is available,
                  but the video file could not be found.
                </p>
              </div>
            )}

            <div className="recording-modal-info">
              <span>
                👨‍🏫{" "}
                {selectedRecording.teacher_name ||
                  "Teacher"}
              </span>

              <span>
                📅{" "}
                {formatDate(
                  selectedRecording.created_at ||
                    selectedRecording.lesson_date
                )}
              </span>

              <span>
                🏫{" "}
                {selectedRecording.class_name ||
                  currentClassName}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default RecordedLessons;