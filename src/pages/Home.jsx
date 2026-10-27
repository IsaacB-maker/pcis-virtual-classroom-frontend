
import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home-page">
      {/* HEADER */}
      <header className="home-header">
        <div className="home-brand">
          <div className="home-logo">PCIS</div>

          <div>
            <h1>Paraclete Classical International School</h1>
            <p>Virtual Classroom</p>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="home-main">
        {/* WELCOME */}
        <section className="home-welcome">
          <span className="home-label">WELCOME TO</span>

          <h2>
            PCIS <span>Virtual Classroom</span>
          </h2>

          <p>
            A digital learning environment where teachers can create
            and manage lessons while students attend live classes
            and access recorded lessons.
          </p>
        </section>

        {/* PORTAL SELECTION */}
        <section className="home-portal-section">
          <div className="home-portal-title">
            <span className="home-label">GET STARTED</span>

            <h3>Choose Your Portal</h3>

            <p>Select the portal that matches your role.</p>
          </div>

          <div className="home-portal-cards">
            {/* TEACHER PORTAL */}
            <Link
              to="/teacher/login"
              className="home-portal-card teacher-portal-card"
            >
              <div className="home-portal-icon" aria-hidden="true">
                👨‍🏫
              </div>

              <div className="home-portal-content">
                <span className="home-portal-label">FOR TEACHERS</span>

                <h4>Teacher Portal</h4>

                <p>
                  Create and manage lessons, enter your own subjects,
                  schedule classes and start live lessons.
                </p>
              </div>

              <div className="home-portal-action">
                Enter Teacher Portal →
              </div>
            </Link>

            {/* STUDENT PORTAL */}
            <Link
              to="/student"
              className="home-portal-card student-portal-card"
            >
              <div className="home-portal-icon" aria-hidden="true">
                👨‍🎓
              </div>

              <div className="home-portal-content">
                <span className="home-portal-label">FOR STUDENTS</span>

                <h4>Student Portal</h4>

                <p>
                  Enter your classroom, view scheduled lessons,
                  join live classes and watch recorded lessons.
                </p>
              </div>

              <div className="home-portal-action">
                Enter Student Portal →
              </div>
            </Link>

            {/* SCHOOL ADMINISTRATION PORTAL */}
            <Link
              to="/administration/login"
              className="home-portal-card administration-portal-card"
            >
              <div className="home-portal-icon" aria-hidden="true">
                🏫
              </div>

              <div className="home-portal-content">
                <span className="home-portal-label">
                  AUTHORIZED PERSONNEL
                </span>

                <h4>School Administration</h4>

                <p>
                  Manage student records, school fees, teachers,
                  classes, lessons and other school operations
                  according to your assigned permissions.
                </p>
              </div>

              <div className="home-portal-action">
                Enter Administration Portal →
              </div>
            </Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="home-how-section">
          <div className="home-how-title">
            <span className="home-label">HOW IT WORKS</span>

            <h3>Simple Learning Process</h3>
          </div>

          <div className="home-how-grid">
            <div className="home-how-card">
              <div className="home-how-number">01</div>

              <h4>Teacher Creates a Lesson</h4>

              <p>
                The teacher selects a class and enters the subject
                and lesson details.
              </p>
            </div>

            <div className="home-how-card">
              <div className="home-how-number">02</div>

              <h4>Students See the Lesson</h4>

              <p>
                The lesson automatically appears in the classroom
                of the selected class.
              </p>
            </div>

            <div className="home-how-card">
              <div className="home-how-number">03</div>

              <h4>Students Attend</h4>

              <p>
                Students can join live lessons and access available
                recordings.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="home-footer">
        <p>
          © {new Date().getFullYear()} Paraclete Classical International School
        </p>

        <span>PCIS Virtual Classroom</span>
      </footer>
    </div>
  );
}

export default Home;
