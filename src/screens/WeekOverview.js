import React, { useState, useEffect } from "react";
import "./styles/home.css";
import "./styles/coursePage.css";
import "./styles/weekPage.css";
import { useNavigate, useLocation } from "react-router-dom";

import { useTheme } from "../context/ThemeContext.js";


import axios from "axios";
import { useUser } from "../context/useUser.js";

const url = process.env.REACT_APP_API_URL;

function WeekOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const week = location.state?.week || {};
  const courseId = location.state?.courseId;
  const refresh = location.state?.refresh;
  const weekId = week.idweek;

  const weekname = week.week_name || "Viikko";

  const [loading, setLoading] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [content, setContent] = useState(week.content || "");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [deletingExercise, setDeletingExercise] = useState(false);

  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchExercises = async () => {
      if (!week.idweek || !user?.access_token) return;

      try {
        setLoading(true);

        const response = await axios.get(
          `${url}/courses/weekExercises`,
          {
            params: {
              idweek: week.idweek,
              idcourse: courseId,
            },
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        );

        const fetchedExercises = Array.isArray(response.data)
          ? response.data
          : response.data?.exercises || [];

        setExercises(fetchedExercises);
      } catch (error) {
        console.error(
          "Exercises loading failed:",
          error.response?.data || error.message
        );

        setExercises(
          Array.isArray(week.exercises)
            ? week.exercises
            : []
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();

    const contentKey = week.idweek
      ? `weekOverview_content_${week.idweek}`
      : null;

    if (contentKey) {
      const savedContent = localStorage.getItem(contentKey);

      if (savedContent !== null) {
        setContent(savedContent);
      } else {
        setContent(week.content || "");
      }
    } else {
      setContent(week.content || "");
    }
  }, [weekId, user?.access_token, refresh]);



  const toggleContentEdit = () => {
    setEditingContent(!editingContent);
  };

  const saveContent = () => {
    if (week.idweek) localStorage.setItem(`weekOverview_content_${week.idweek}`, content);
    setEditingContent(false);
  };

  const cancelContentEdit = () => {
    const contentKey = week.idweek ? `weekOverview_content_${week.idweek}` : null;
    if (contentKey) {
      const savedContent = localStorage.getItem(contentKey);
      if (savedContent !== null) setContent(savedContent);
      else setContent(week.content || "");
    } else {
      setContent(week.content || "");
    }
    setEditingContent(false);
  };

  const tasks = exercises.filter(e => (e.exercise_type || "task") === "task");
  const exams = exercises.filter(e => (e.exercise_type || "") === "exam");

  const formatDate = (t) => {
    if (!t) return "";
    try {
      return new Date(t).toLocaleDateString("fi-FI", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) {
      return t;
    }
  };

  const formatDuration = (value) => {
    if (!value) return "";
    if (typeof value === "string" && value.includes(":")) return value;
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes <= 0) return value || "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  const openDeleteModal = (exercise) => {
    setExerciseToDelete(exercise);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deletingExercise) return;

    setExerciseToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete?.idexercise || !courseId || !user?.access_token) {
      return;
    }
    setDeletingExercise(true);
    try {
      await axios.delete(
        `${url}/courses/${courseId}/exercises/${exerciseToDelete.idexercise}`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        }
      );

      // Poistetaan myös Reactin näkymästä heti
      setExercises((prev) =>
        prev.filter(
          (exercise) =>
            exercise.idexercise !== exerciseToDelete.idexercise
        )
      );

      closeDeleteModal();
    } catch (error) {
      console.error(
        "Exercise deletion failed:",
        error.response?.data || error.message
      );

      alert("Tehtävän poistaminen epäonnistui.");
    } finally {
      setDeletingExercise(false);
    }
  };

  return (
    <div className={`coursepage ${isDarkMode ? '' : 'light-theme'}`}>
      <div className="topbar">
        <div className="topbar-left">
          <div className="course-title">
            <i className="fa-regular fa-circle-left back-icon" onClick={() => navigate(-1)}></i>
            <h2 className="course-name">{loading ? "Ladataan..." : weekname}</h2>
          </div>
        </div>

        
      </div>

      <div className="divider"></div>

      <div className="container">
        <div className="row g-4">
          <div className="col-md-6">
            <h3>Aineisto</h3>
            <div className="material-card">
              <div className="card-actions" style={{ display: 'flex', gap: 8 }}>
                {editingContent ? (
                  <>
                    <button className="edit-btn" onClick={saveContent}>Tallenna</button>
                    <button className="edit-btn" onClick={cancelContentEdit}>Peruuta</button>
                  </>
                ) : (
                  <i className="fa-solid fa-pen-to-square user-icon" title="Muokkaa aineistoa" onClick={toggleContentEdit}></i>
                )}
              </div>

              {(!content || content.trim().length === 0) && !editingContent ? (
                <p className="empty-message">Ei materiaalia</p>
              ) : editingContent ? (
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} style={{ width: '100%', borderRadius: 8, padding: 10 }} />
              ) : (
                <div className="material-content">{content}</div>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <div className="week-section-header">
              <h3>Tehtävät</h3>

              <button
                className="add-exercise-btn"
                title="Luo uusi tehtävä"
                onClick={() =>
                  navigate("/CreateTask", {
                    state: {
                      courseId,
                      week,
                      weekIndex: week.idweek,
                      source: "weekOverview",
                      defaultStartTime: "",
                      defaultEndTime: "",
                    },
                  })
                }
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>


            {tasks.length === 0 ? (
              <p className="empty-message">Ei tehtäviä</p>
            ) : (
              tasks.map((task, idx) => (
                <div key={task.idexercise || idx} className="week-box small-week-box">
                  <div className="exercise-actions">
                    <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate('/TaskOverview', { state: { courseId, exercise: task, week } })}></i>
                    <button
                        type="button"
                        className="exercise-delete-btn"
                        title="Poista tehtävä"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(task);
                        }}
                      >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>

                  <h4 className="week-title">{task.exercise_name}</h4>
                  <div className="week-task-desc">{task.exercise_description}</div>
                  <div className="week-task-time">Aukeaa: {formatDate(task.start_time)}</div>
                  <div className="week-task-time">Sulkeutuu: {formatDate(task.end_time)}</div>
                </div>
              ))
            )}

            <div className="divider"></div>

            <div className="week-section-header">
              <h3>Kokeet</h3>

              <button
                className="add-exercise-btn"
                title="Luo uusi koe"
                onClick={() =>
                  navigate("/CreateExam", {
                    state: {
                      courseId,
                      week,
                      weekIndex: week.idweek,
                      source: "weekOverview",
                    },
                  })
                }
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>
            {exams.length === 0 ? (
              <p className="empty-message">Ei kokeita</p>
            ) : (
              exams.map((exam, idx) => (
                <div key={exam.idexercise || idx} className="week-box small-week-box">
                  <div className="exercise-actions">
                    <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate('/StartExamPage', { state: { courseId, exercise: exam, week } })}></i>
                   <button
                      type="button"
                      className="exercise-delete-btn"
                      title="Poista koe"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(exam);
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <h4 className="week-title">{exam.exercise_name}</h4>
                  <div className="week-task-desc">{exam.exercise_description}</div>
                  <div className="week-task-time">Koepäivä: {formatDate(exam.start_time)}</div>
                  <div className="week-task-time">Auki: {formatDuration(exam.exam_duration || exam.max_time || exam.end_time ? (() => {
                    if (exam.start_time && exam.end_time) {
                      const diff = new Date(exam.end_time) - new Date(exam.start_time);
                      const totalMinutes = Math.max(0, Math.round(diff / 60000));
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
                    }
                    return "";
                  })() : "")}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && exerciseToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog delete-exercise-modal">
            <div className="modal-header">
              <h3>
                Poista{" "}
                {exerciseToDelete.exercise_type === "exam"
                  ? "koe"
                  : "tehtävä"}
              </h3>

              <button
                type="button"
                className="modal-close"
                onClick={closeDeleteModal}
                disabled={deletingExercise}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">
              <p>
                Haluatko varmasti poistaa tehtävän/ kokeen
                <strong> "{exerciseToDelete.exercise_name}"</strong>?
              </p>

              <p className="delete-warning">
                Tämä poistaa myös siihen liittyvät kysymykset,
                palautukset ja muut vastaukset.
              </p>

              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="cancel-delete-btn"
                  onClick={closeDeleteModal}
                  disabled={deletingExercise}
                >
                  Peruuta
                </button>

                <button
                  type="button"
                  className="confirm-delete-btn"
                  onClick={handleDeleteExercise}
                  disabled={deletingExercise}
                >
                  {deletingExercise ? "Poistetaan..." : "Kyllä, poista"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeekOverview;