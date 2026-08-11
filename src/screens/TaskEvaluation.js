import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./styles/createTask.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser.js";

const url = process.env.REACT_APP_API_URL;

function TaskEvaluation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const state = location.state || {};
  const { courseId, exercise, submission, studentName, userId } = state;

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);

  const studentDisplayName = useMemo(() => {
    if (studentData?.firstname || studentData?.lastname) {
      return `${studentData.firstname || ""} ${studentData.lastname || ""}`.trim();
    }

    return studentName || "Oppilas";
  }, [studentData, studentName]);

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
            points: task.points ?? "",
            teacherComment: task.teacherComment ?? "",
            options: Array.isArray(task.options) ? task.options : [],
            correctAnswers: Array.isArray(task.correctAnswers) ? task.correctAnswers.map((value) => Number(value)) : [],
            studentSelectedAnswers: Array.isArray(task.studentSelectedAnswers) ? task.studentSelectedAnswers.map((value) => Number(value)) : [],
          };

          if (task.type === "choice" && (nextTask.points === "" || nextTask.points === null || nextTask.points === undefined)) {
            nextTask.points = getChoiceAutoPoints(nextTask);
          }

          return nextTask;
        }));
      } catch (error) {
        console.error("Failed to fetch student review data", error);
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

    if (Array.isArray(task.studentSelectedAnswers)) return task.studentSelectedAnswers.map((value) => Number(value)).filter((value) => !Number.isNaN(value));

    if (Array.isArray(task.studentAnswer)) return task.studentAnswer.map((value) => Number(value)).filter((value) => !Number.isNaN(value));

    if (typeof task.studentAnswer === "number") return [task.studentAnswer];

    if (typeof task.studentAnswer === "string") {
      const trimmed = task.studentAnswer.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
        }
        if (Array.isArray(parsed.selectedAnswers)) return parsed.selectedAnswers.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
        if (Array.isArray(parsed.selectedAnswer)) return parsed.selectedAnswer.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
        if (parsed.selectedAnswer !== undefined && parsed.selectedAnswer !== null && parsed.selectedAnswer !== "") {
          return [Number(parsed.selectedAnswer)];
        }
        if (parsed !== null && typeof parsed === "number") {
          return [parsed];
        }
      } catch (error) {
        const parsedNumber = Number(trimmed);
        return Number.isNaN(parsedNumber) ? [] : [parsedNumber];
      }
    }

    return [];
  };

  const getChoiceAutoPoints = (task) => {
    if (task.type !== "choice") return task.points ?? "";

    const correctAnswers = Array.isArray(task.correctAnswers) ? task.correctAnswers.map((value) => Number(value)) : [];
    const selectedAnswers = getChoiceStudentSelections(task).map((value) => Number(value));

    if (!correctAnswers.length) return 0;
    return selectedAnswers.filter((value) => correctAnswers.includes(value)).length;
  };

  const resolveTaskPoints = (task) => {
    if (task.type !== "choice") return task.points ?? "";

    const currentValue = task.points;
    if (currentValue === "" || currentValue === null || currentValue === undefined) {
      return getChoiceAutoPoints(task);
    }

    return Number(currentValue);
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
            points: resolveTaskPoints(task),
            teacher_comment: task.teacherComment,
          }],
        },
        { headers: { Authorization: `Bearer ${user.access_token}` } }
      );
    } catch (error) {
      console.error("Failed to save review", error);
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
            points: resolveTaskPoints(task),
            teacher_comment: task.teacherComment,
          }))
        },
        { headers: { Authorization: `Bearer ${user.access_token}` } }
      );

      if (location.state?.marathon) {
        navigate('/home', {
          replace: true,
          state: { triggerMarathon: true },
        });
        return;
      }

      navigate('/TaskOverview', {
        replace: true,
        state: {
          courseId,
          exercise,
          week: location.state?.week,
        }
      });
    } catch (error) {
      console.error("Failed to save evaluation", error);
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
            onClick={() => {
              if (location.state?.marathon) {
                navigate('/home', { replace: true });
                return;
              }

              navigate('/TaskOverview', {
                replace: true,
                state: {
                  courseId,
                  exercise,
                  week: location.state?.week,
                }
              });
            }}
          ></i>
          <h1>{exercise?.exercise_name || "Tehtävän arviointi"}</h1>
        </div>

        {loading ? (
          <p>Ladataan arviointia...</p>
        ) : (
          <>
            <div className="task-content">
              <div>
                <h2>{exercise?.exercise_name || "Tehtävä"}</h2>
                <p className="task-time-label">{studentDisplayName}</p>
              </div>
            </div>

            <div className="divider"></div>

            {tasks.length === 0 ? (
              <p>Ei tehtäviä arvioitavaksi.</p>
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
                    <span className="task-time-label" style={{ margin: 0 }}>Ongelmia tehtävässä?</span>
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
                    <label className="task-time-label" style={{ margin: 0 }}>Arviointi</label>
                    <input
                      type="number"
                      min="0"
                      value={task.type === "choice" ? resolveTaskPoints(task) : (task.points ?? "")}
                      onChange={(e) => updateTaskField(index, "points", e.target.value)}
                      style={{ width: 110, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
                    />
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

export default TaskEvaluation;