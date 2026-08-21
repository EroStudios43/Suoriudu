import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./styles/createTask.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { normalizeChoiceSelection } from "../utils/choiceSelection.js";
import { getReviewDisplayName } from "../utils/reviewSelection.js";

const url = process.env.REACT_APP_API_URL;

function TestEvaluation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const state = location.state || {};
  const { courseId, exercise, submission, studentName, userId } = state;
  const isAnonymous = Boolean(state.isAnonymous || state.marathon);

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);

  const studentDisplayName = useMemo(() => getReviewDisplayName({
    studentData,
    studentName,
    isAnonymous,
  }), [studentData, studentName, isAnonymous]);

  useEffect(() => {
    const fetchReviewData = async () => {
      if (!courseId || !exercise?.idexercise || !user?.access_token) {
        setLoading(false);
        return;
      }

      const targetUserId = userId || submission?.iduser;
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions/${targetUserId}/review`,
          { headers: { Authorization: `Bearer ${user.access_token}` } }
        );

        setStudentData(response.data?.student || null);
        setTasks((response.data?.tasks || []).map((task) => {
            const nextTask = {
            ...task,
            teacherPoints: task.teacherPoints !== "" && task.teacherPoints !== null && task.teacherPoints !== undefined ? Number(task.teacherPoints) : getChoiceAutoPoints(task),
            teacherComment: task.teacherComment ?? "",
            options: Array.isArray(task.options) ? task.options : [],
            correctAnswers: Array.isArray(task.correctAnswers) ? task.correctAnswers.map((value) => Number(value)) : [],
            studentSelectedAnswers: Array.isArray(task.studentSelectedAnswers) ? task.studentSelectedAnswers.map((value) => Number(value)) : [],
            points: task.points ?? null,
          };

          return nextTask;
        }));
      } catch (error) {
        console.error("Failed to fetch exam review data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [courseId, exercise?.idexercise, user?.access_token, submission?.iduser, userId]);

  const updateTaskField = (taskIndex, field, value) => {
    setTasks((prev) => prev.map((task, index) => {
      if (index !== taskIndex) return task;
      return { ...task, [field]: value };
    }));
  };

  const getChoiceStudentSelections = (task) => {
    if (task.type !== "choice") return [];
    return normalizeChoiceSelection(task.studentSelectedAnswers ?? task.studentAnswer);
  };

  const getChoiceAutoPoints = (task) => {
    if (task.type !== "choice") return task.teacherPoints ?? "";

    const correctAnswers = Array.isArray(task.correctAnswers) ? task.correctAnswers.map((value) => Number(value)) : [];
    const selectedAnswers = getChoiceStudentSelections(task).map((value) => Number(value));
    const maxPoints = Number(task.points ?? 0);


    if (!correctAnswers.length) return 0;

    if (correctAnswers.length === 1) {
      return selectedAnswers.some((v) => correctAnswers.includes(v)) ? (maxPoints || 0) : 0;
    }

    if (maxPoints && correctAnswers.length > 0) {
      const per = maxPoints / correctAnswers.length;
      const correctSelectedCount = selectedAnswers.filter((v) => correctAnswers.includes(v)).length;
      return Number((per * correctSelectedCount).toFixed(2));
    }

    return selectedAnswers.filter((value) => correctAnswers.includes(value)).length;
  };

  const resolveTaskPoints = (task) => {
    if (task.type === "choice") {
      // jos opettaja on syöttänyt pisteet käsin käytä niitä
      if (task.teacherPoints !== "" && task.teacherPoints !== null && task.teacherPoints !== undefined) {
        return Number(task.teacherPoints);
      }
      return getChoiceAutoPoints(task);
    }

    return task.teacherPoints ?? "";
  };

  const formatStudentAnswer = (task) => {
    if (task.type === "choice") {
      const selections = getChoiceStudentSelections(task);
      if (task.options?.length && selections.length > 0) {
        return selections.map((index) => task.options[index]).filter(Boolean).join(", ");
      }

      if (typeof task.studentAnswer === "string") {
        try {
          const parsed = JSON.parse(task.studentAnswer);
          if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed.selectedAnswers)) return parsed.selectedAnswers.join(", ");
            if (Array.isArray(parsed.selectedAnswer)) return parsed.selectedAnswer.join(", ");
            if (parsed.selectedAnswer) return String(parsed.selectedAnswer);
          }
        } catch (error) {
          return task.studentAnswer || "Ei vastausta";
        }
      }

      return task.studentAnswer !== undefined && task.studentAnswer !== null && task.studentAnswer !== ""
        ? String(task.studentAnswer)
        : "Ei vastausta";
    }

    if (task.studentAnswer === undefined || task.studentAnswer === null || task.studentAnswer === "") {
      return "Ei vastausta";
    }

    if (typeof task.studentAnswer === "object") {
      return JSON.stringify(task.studentAnswer, null, 2);
    }

    let answerText = String(task.studentAnswer);
    if (answerText.startsWith('"') && answerText.endsWith('"')) {
      try {
        const parsed = JSON.parse(answerText);
        if (typeof parsed === "string") answerText = parsed;
      } catch (error) {
        // leave as-is
      }
    }

    return answerText;
  };

  const getMaxPoints = (task) => {
    const value = Number(task.points);

    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const getTaskPoints = (task) => {
  if ( task.teacherPoints !== null && task.teacherPoints !== undefined && task.teacherPoints !== "") {
    return task.teacherPoints;
  }

  if (task.type === "choice") {
    return getChoiceAutoPoints(task);
  }

  return "";
};


  const handleSaveTask = async (taskIndex) => {
    const task = tasks[taskIndex];
    if (!task || !courseId || !exercise?.idexercise || !user?.access_token || !task.idtask) return;

    try {
      setSaving(true);
      await axios.put(
        `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions/${userId || submission?.iduser}/review`,
        {
          reviews: [{
            idtask: task.idtask,
            teacherPoints: resolveTaskPoints(task),
            teacher_comment: task.teacherComment,
          }],
        },
        { headers: { Authorization: `Bearer ${user.access_token}` } }
      );
    } catch (error) {
      console.error("Failed to save exam review", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!courseId || !exercise?.idexercise || !user?.access_token) return;

    try {
      setSaving(true);
      await axios.put(
        `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions/${userId || submission?.iduser}/review`,
        {
          reviews: tasks.map((task) => ({
            idtask: task.idtask,
            teacherPoints: resolveTaskPoints(task),
            teacher_comment: task.teacherComment,
          }))
        },
        { headers: { Authorization: `Bearer ${user.access_token}` } }
      );

      navigate('/TestOverview', { replace: true, state: { courseId, exercise, week: location.state?.week } });
    } catch (error) {
      console.error("Failed to save exam evaluation", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="task-page">
      <div className="task-paper">
        <div className="task-header">
          <i
            className="fa-regular fa-circle-left back-arrow"
            onClick={() => navigate('/TestOverview', { replace: true, state: { courseId, exercise, week: location.state?.week } })}
          ></i>
          <h1>{exercise?.exercise_name || "Kokeen arviointi"}</h1>
        </div>

        {loading ? (
          <p>Ladataan arviointia...</p>
        ) : (
          <>
            <div className="task-content">
              <div>
                <h2>{exercise?.exercise_name || "Koe"}</h2>
                <p className="task-time-label">{studentDisplayName}</p>
              </div>
            </div>

            <div className="divider"></div>

            {tasks.length === 0 ? (
              <p>Ei arvioitavia tehtäviä.</p>
            ) : (
              tasks.map((task, index) => (
                <div key={task.idtask || index} className="single-task-section" style={{ width: "100%" }}>
                  <h3 className="task-time-title">{task.title || `Tehtävä ${index + 1}`}</h3>
                  <p className="task-time-label">{task.instruction || "Tehtävänanto"}</p>

                  {task.type !== "choice" && task.exampleAnswer ? (
                    <div className="option-card" style={{ marginBottom: 12 }}>
                      <strong>Esimerkkivastaus</strong>
                      <div>{task.exampleAnswer}</div>
                    </div>
                  ) : null}

                  <div style={{ marginTop: 18 }}>
                    {task.type === "choice" ? (
                      <div className="option-card" style={{ marginBottom: 12 }}>
                        <strong>Oppilaan vastaus</strong>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(task.options || []).map((option, optionIndex) => {
                            const isSelected = getChoiceStudentSelections(task).includes(optionIndex);
                            const isCorrect = (task.correctAnswers || []).includes(optionIndex);
                            const isWrongSelected = isSelected && !isCorrect;

                            return (
                              <label key={`${task.idtask}-${optionIndex}`} style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: isSelected ? "#eef9f1" : "#f7f7f7",
                                border: `1.5px solid ${isCorrect ? "#67c58b" : isWrongSelected ? "#f1b24a" : "#ddd"}`,
                                color: isCorrect ? "#1a6138" : "#1d283a",
                              }}>
                                <input
                                  type={task.choiceMode === "multiple" ? "checkbox" : "radio"}
                                  checked={isSelected}
                                  readOnly
                                  style={{ accentColor: isCorrect ? "#2c9b5f" : "#5b6b7d" }}
                                />
                                <span>{option || `Vaihtoehto ${optionIndex + 1}`}</span>
                                {isCorrect ? (
                                  <span style={{ marginLeft: "auto", color: "#1c7b4c", fontWeight: 700 }}>Oikea</span>
                                ) : isSelected ? (
                                  <span style={{ marginLeft: "auto", color: "#9a6b00", fontWeight: 700 }}>Valittu</span>
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 8 }}><strong>Oppilaan vastaus</strong></div>
                        <textarea
                          className="large-answer-input"
                          value={formatStudentAnswer(task)}
                          readOnly
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 12 }}>
                    <span className="task-time-label" style={{ margin: 0 }}>Tekoälyn merkinnät</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: task.hasQuestions ? "#f4c542" : "#d9d9d9",
                          display: "inline-block",
                          boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                        }}
                      ></span>
                      <i className="fa-regular fa-comment-dots" style={{ fontSize: 20, color: "#1d283a" }}></i>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, marginBottom: 12 }}>
                    <label className="task-time-label" style={{ margin: 0 }}>
                      Arviointi
                    </label>

                    <input
                      type="number"
                      min="0"
                      max={getMaxPoints(task)}
                      step="any"
                      value={getTaskPoints(task)}
                      onChange={(e) => {
                        const value = e.target.value;

                        // Sallitaan tyhjä arvo avoimille tehtäville
                        if (value === "") {
                          updateTaskField(index, "teacherPoints", "");
                          return;
                        }
                        let points = Number(value);
                        const maxPoints = getMaxPoints(task);
                        if (!Number.isFinite(points)) {
                          return;
                        }
                        // Ei negatiivisia
                        points = Math.max(0, points);

                        // Ei yli maksimipisteiden
                        points = Math.min(points, maxPoints);

                        updateTaskField(index, "teacherPoints", points);
                      }}
                      style={{width: 110,padding: 10,borderRadius: 8,border: "1px solid #ccc"}}
                    />

                    <span style={{ fontWeight: 700 }}>
                      / {getMaxPoints(task)} p
                    </span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label className="task-time-label">Palaute oppilaalle</label>
                    <textarea
                      className="large-answer-input"
                      style={{ minHeight: 120 }}
                      value={task.teacherComment || ""}
                      onChange={(e) => updateTaskField(index, "teacherComment", e.target.value)}
                      placeholder="Kirjoita oppilaalle palaute..."
                    />
                  </div>

                  <div className="task-bottom-actions" style={{ justifyContent: "flex-start", marginTop: 20 }}>
                    <button className="save-btn" type="button" onClick={() => handleSaveTask(index)} disabled={saving}>
                      {saving ? "Tallennetaan..." : "Tallenna tämä kohta"}
                    </button>
                  </div>

                  <div className="divider" style={{ marginTop: 30 }}></div>
                </div>
              ))
            )}

            <div className="task-bottom-actions" style={{ marginTop: 24 }}>
              <button className="save-btn" type="button" onClick={handleSaveAll} disabled={saving}>
                {saving ? "Tallennetaan..." : "Tallenna koko arviointi"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TestEvaluation;
