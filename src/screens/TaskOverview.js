import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles/home.css";
import "./styles/coursePage.css";
import "./styles/weekPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/useUser.js";

const url = process.env.REACT_APP_API_URL;

function TaskOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const exercise = location.state?.exercise || {};
  const courseId = location.state?.courseId;
  const taskName = exercise.exercise_name || "Tehtävä";
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({ unreviewed: [], reviewed: [], totalStudents: 0 });

  useEffect(() => {
    if (!courseId || !exercise?.idexercise || !user?.access_token) {
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        const response = await axios.get(`${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions`, {
          headers: { Authorization: `Bearer ${user.access_token}` },
        });

        const data = response.data || {};
        setSubmissions({
          unreviewed: data.unreviewed || [],
          reviewed: data.reviewed || [],
          totalStudents: data.totalStudents || 0,
        });
      } catch (error) {
        console.error("Failed to fetch task submissions", error);
        setSubmissions({ unreviewed: [], reviewed: [], totalStudents: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [courseId, exercise?.idexercise, user?.access_token]);

  const formatSubmittedAt = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString("fi-FI", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return value;
    }
  };

  const returnedCount = submissions.unreviewed.length + submissions.reviewed.length;
  const progressPercentage = submissions.totalStudents > 0 ? Math.round((returnedCount / submissions.totalStudents) * 100) : 0;
  const completionText = `${returnedCount}/${submissions.totalStudents} oppilasta palauttanut`;

  return (
    <div className="coursepage task-overview-page">
      <div className="topbar task-overview-topbar">
        <div className="topbar-left">
          <div className="course-title">
            <i className="fa-regular fa-circle-left back-icon" onClick={() => navigate(-1)}></i>
            <div>
              <h2 className="course-name task-overview-title">{taskName}</h2>
              <p className="course-description task-overview-subtitle">{loading ? "Ladataan..." : completionText}</p>
            </div>
          </div>
        </div>

        <div className="task-overview-actions">
          <div
            className="task-progress-ring"
            style={{ background: `conic-gradient(#3DDC97 ${progressPercentage * 3.6}deg, rgba(255,255,255,0.14) 0deg)` }}
          >
            <div className="task-progress-ring-inner">
              <span>{progressPercentage}%</span>
            </div>
          </div>

          <button className="settings-button" type="button" title="Asetukset" aria-label="Asetukset" onClick={() => {}}>
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>

      <div className="divider"></div>

      <div className="task-overview-section">
        <div className="task-section-header">
          <h3>Arvioimattomat palautukset</h3>
          <button className="edit-btn task-action-btn" type="button">Arvioi anonyymisti</button>
        </div>

        <div className="submission-list">
          {loading ? (
            <div className="submission-card">
              <p className="submission-meta">Ladataan palautuksia...</p>
            </div>
          ) : submissions.unreviewed.length === 0 ? (
            <div className="submission-card">
              <p className="submission-meta">Ei arvioimattomia palautuksia.</p>
            </div>
          ) : (
            submissions.unreviewed.map((submission, index) => (
              <div className="submission-card" key={`${submission.iduser || index}`}>
                <div className="submission-main">
                  <div>
                    <h4 className="submission-name">{submission.name}</h4>
                    <p className="submission-meta">{formatSubmittedAt(submission.submittedAt)}</p>
                  </div>
                </div>

                <div className="submission-status">
                  <span className="submission-status-label">Automaatti tarkastus:</span>
                  <span className="submission-status-value">{submission.autoCheck}</span>
                </div>

                <button className="submission-arrow" aria-label="Avaa palautus" type="button">
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="divider"></div>

      <div className="task-overview-section">
        <div className="task-section-header">
          <h3>Arvioidut palautukset</h3>
        </div>

        <div className="submission-list">
          {loading ? (
            <div className="submission-card reviewed">
              <p className="submission-meta">Ladataan arvioituja palautuksia...</p>
            </div>
          ) : submissions.reviewed.length === 0 ? (
            <div className="submission-card reviewed">
              <p className="submission-meta">Ei arvioituja palautuksia.</p>
            </div>
          ) : (
            submissions.reviewed.map((submission, index) => (
              <div className="submission-card reviewed" key={`${submission.iduser || index}`}>
                <div className="submission-main">
                  <div>
                    <h4 className="submission-name">{submission.name}</h4>
                    <p className="submission-meta">{formatSubmittedAt(submission.submittedAt)}</p>
                  </div>
                </div>

                <div className="submission-status">
                  <span className="submission-status-label">Arviointi:</span>
                  <span className="submission-status-value">Arvioitu</span>
                </div>

                <button className="submission-arrow" aria-label="Avaa arvioitu palautus" type="button">
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskOverview;