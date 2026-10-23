import { Link } from "react-router-dom";
import "../styles/Primary.css";

function Primary() {
  const primaryClasses = [
    { name: "P1", path: "/primary/p1" },
    { name: "P2", path: "/primary/p2" },
    { name: "P3", path: "/primary/p3" },
    { name: "P4", path: "/primary/p4" },
    { name: "P5", path: "/primary/p5" },
    { name: "P6", path: "/primary/p6" },
    { name: "P7", path: "/primary/p7" },
  ];

  return (
    <div className="primary-page">

      <header className="primary-header">

        <div className="primary-brand">

          <div className="primary-logo">
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

        <div className="primary-badge">
          PRIMARY
        </div>

      </header>


      <main className="primary-main">

        <Link
          to="/"
          className="primary-back"
        >
          ← Back to Education Levels
        </Link>


        <section className="primary-title">

          <span className="primary-label">
            PRIMARY SCHOOL
          </span>

          <h2>
            Choose Your Class
          </h2>

          <p>
            Select your class to enter the
            Paraclete virtual classroom.
          </p>

        </section>


        <section className="primary-class-grid">

          {primaryClasses.map((schoolClass) => (

            <Link
              to={schoolClass.path}
              className="primary-class-card"
              key={schoolClass.name}
            >

              <div>

                <div className="primary-class-icon">
                  {schoolClass.name}
                </div>

                <div className="primary-class-info">

                  <h3>
                    Primary {schoolClass.name.replace("P", "")}
                  </h3>

                  <p>
                    Enter classroom
                  </p>

                </div>

              </div>


              <span className="primary-class-arrow">
                →
              </span>

            </Link>

          ))}

        </section>

      </main>


      <footer className="primary-footer">

        <p>
          © {new Date().getFullYear()} Paraclete Classical International School
        </p>

        <span>
          Primary Virtual Classroom
        </span>

      </footer>

    </div>
  );
}

export default Primary;