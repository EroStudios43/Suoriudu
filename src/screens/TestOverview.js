import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles/home.css";
import "./styles/coursePage.css";
import "./styles/weekPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { pickRandomUnreviewedSubmission } from "../utils/reviewSelection.js";

import { useTheme } from "../context/ThemeContext.js";


const url = process.env.REACT_APP_API_URL;

function TestOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const exercise = location.state?.exercise || {};
  const courseId = location.state?.courseId;
  const taskName = exercise.exercise_name || "Koe";
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [submissions, setSubmissions] = useState({ unreviewed: [], reviewed: [], totalStudents: 0 });

  const { isDarkMode } = useTheme();

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
        console.error("Failed to fetch exam submissions", error);
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

  const handleAnonymousReview = () => {
    if (loading || !submissions.unreviewed.length) return;

    const nextSubmission = pickRandomUnreviewedSubmission(submissions.unreviewed);
    if (!nextSubmission) return;

    navigate('/TestEvaluation', {
      state: {
        courseId,
        exercise,
        submission: nextSubmission,
        studentName: nextSubmission.name,
        userId: nextSubmission.iduser,
        isAnonymous: true,
      }
    });
  };

  const handleBack = () => {
    if (location.state?.week && courseId) {
      navigate("/WeekOverview", {
        replace: true,
        state: {
          courseId,
          week: location.state.week,
        },
      });
    } else {
      navigate(-1);
    }
  };

  const parseAiNotes = (lista) => {
    if (!lista) return [];
    
    // Jos data on tietokannasta tuleva JSON-merkkijono, parsitaan se taulukoksi
    let parsedList = lista;
    if (typeof lista === "string") {
      try {
        parsedList = JSON.parse(lista);
      } catch (e) {
        return [];
      }
    }

    if (!Array.isArray(parsedList)) return [];

    return parsedList
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return {
            cause: item.cause || item.teksti || "Merkintä",
            timestamp: item.timestamp || item.aika || "",
          };
        }
        return null;
      })
      .filter(Boolean);
  };

 const allSubmissions = [...submissions.unreviewed, ...submissions.reviewed];

  const studentNotesMap = allSubmissions.reduce((acc, sub) => {
    const notes = parseAiNotes(sub.ai_notes || sub.ai_logs);
    if (notes.length > 0) {
      const studentName = sub.name || "Tuntematon opiskelija";
      if (!acc[studentName]) {
        acc[studentName] = [];
      }
      acc[studentName].push(...notes);
    }
    return acc;
  }, {});


  return (
    <div className={`coursepage task-overview-page ${isDarkMode ? '' : 'light-theme'}`}>
      <div className="topbar task-overview-topbar">
        <div className="topbar-left">
          <div className="course-title">
            <i
              className="fa-regular fa-circle-left back-icon"
              onClick={handleBack}
            ></i>
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
        </div>
      </div>

      <div className="divider"></div>

      <div className="task-overview-section">
        <div className="task-section-header">
          <h3>Arvioimattomat palautukset</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              className="edit-btn task-action-btn"
              type="button"
              onClick={handleAnonymousReview}
              disabled={loading || submissions.unreviewed.length === 0}
            >
              Arvioi anonyymisti
            </button>
            <button
              className="edit-btn task-action-btn"
              type="button"
              onClick={() => setNotesOpen(true)}
            >
              Kokeen merkinnät
            </button>
          </div>
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

                <button
                  className="submission-arrow"
                  aria-label="Avaa palautus"
                  type="button"
                  onClick={() => navigate('/TestEvaluation', {
                    state: {
                      courseId,
                      exercise,
                      submission,
                      studentName: submission.name,
                      userId: submission.iduser,
                    }
                  })}
                >
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
                  <span className="submission-status-value">
                    {submission.points !== undefined && submission.points !== null && submission.points !== ""
                      ? `${Number(submission.points)} p`
                      : "Arvioitu"}
                  </span>
                </div>

                <button
                  className="submission-arrow"
                  aria-label="Avaa arvioitu palautus"
                  type="button"
                  onClick={() => navigate('/TestEvaluation', {
                    state: {
                      courseId,
                      exercise,
                      submission,
                      studentName: submission.name,
                      userId: submission.iduser,
                    }
                  })}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {notesOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ width: "min(650px, 100%)" }}>
            <div className="modal-header">
              <h3>Kokeen merkinnät</h3>
              <button type="button" className="modal-close" onClick={() => setNotesOpen(false)} aria-label="Sulje">
                ×
              </button>
            </div>
            <div className="modal-body">
              {Object.keys(studentNotesMap).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {Object.entries(studentNotesMap).map(([studentName, notes], sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#f8f9fa",
                        borderLeft: "4px solid #e74c3c",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                      }}
                    >
                      {/* Opiskelijan nimi otsikkona */}
                      <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "1.05rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
                        {studentName} ({notes.length} merkintää)
                      </div>

                      {/* Kaikki opiskelijan rikkeet listattuna alle */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {notes.map((note, nIdx) => (
                          <div
                            key={nIdx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.9rem"
                            }}
                          >
                            <span style={{ color: "#7f8c8d", fontSize: "0.8rem" }}>
                              {formatSubmittedAt(note.timestamp) || "Ei aikaa"}
                            </span>
                            <span style={{ color: "#c0392b", fontWeight: "500" }}>
                              {note.cause}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#ffffff", lineHeight: 1.6 }}>Toistaiseksi ei merkintöjä.</p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
                <button type="button" className="save-btn" onClick={() => setNotesOpen(false)}>
                  Sulje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestOverview;