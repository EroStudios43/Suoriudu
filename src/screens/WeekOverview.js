import React, { useState, useEffect } from "react";
import "./styles/home.css";
import "./styles/coursePage.css";
import "./styles/weekPage.css";
import { useNavigate, useLocation } from "react-router-dom";

function WeekOverview() {
  const navigate = useNavigate();
  const location = useLocation();

  const week = location.state?.week || {};
  const courseId = location.state?.courseId;
  const weekname = week.week_name || "Viikko";

  const [loading, setLoading] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [content, setContent] = useState(week.content || "");

  useEffect(() => {
    // initialize exercises from passed week or from saved local draft
    const savedKey = week.idweek ? `weekOverview_exercises_${week.idweek}` : null;
    let saved = null;
    if (savedKey) {
      try {
        saved = JSON.parse(localStorage.getItem(savedKey));
      } catch (e) {
        saved = null;
      }
    }

    if (saved && Array.isArray(saved)) {
      setExercises(saved);
    } else if (week.exercises && Array.isArray(week.exercises)) {
      setExercises(week.exercises);
    } else {
      setExercises([]);
    }

    // initialize content (week material)
    const contentKey = week.idweek ? `weekOverview_content_${week.idweek}` : null;
    if (contentKey) {
      const savedContent = localStorage.getItem(contentKey);
      if (savedContent !== null) setContent(savedContent);
      else setContent(week.content || "");
    } else {
      setContent(week.content || "");
    }
  }, [week]);

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

  return (
    <div className="coursepage">
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
            <h3>Tehtävät</h3>
            {tasks.length === 0 ? (
              <p className="empty-message">Ei tehtäviä</p>
            ) : (
              tasks.map((task, idx) => (
                <div key={task.idexercise || idx} className="week-box small-week-box">
                  <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate('/TaskOverview', { state: { courseId, exercise: task, week } })}></i>
                  <h4 className="week-title">{task.exercise_name}</h4>
                  <div className="week-task-desc">{task.exercise_description}</div>
                  <div className="week-task-time">Aukeaa: {formatDate(task.start_time)}</div>
                  <div className="week-task-time">Sulkeutuu: {formatDate(task.end_time)}</div>
                </div>
              ))
            )}

            <div className="divider"></div>

            <h3>Kokeet</h3>
            {exams.length === 0 ? (
              <p className="empty-message">Ei kokeita</p>
            ) : (
              exams.map((exam, idx) => (
                <div key={exam.idexercise || idx} className="week-box small-week-box">
                  <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate('/TestOverview', { state: { courseId, exercise: exam, week } })}></i>
                  <h4 className="week-title">{exam.exercise_name}</h4>
                  <div className="week-task-desc">{exam.exercise_description}</div>
                  <div className="week-task-time">Koepäivä: {formatDate(exam.start_time)}</div>
                  <div className="week-task-time">Kesto: {formatDuration(exam.exam_duration || exam.max_time || exam.end_time ? (() => {
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
    </div>
  );
}

export default WeekOverview;