import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import "./styles/createTask.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { normalizeChoiceSelection } from "../utils/choiceSelection.js";
import { getReviewDisplayName } from "../utils/reviewSelection.js";

const url = process.env.REACT_APP_API_URL;

function TaskEvaluation({ isExamMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const state = location.state || {};
  const { courseId, exercise, submission, studentName, userId } = state;
  const isAnonymous = Boolean(state.isAnonymous || state.marathon);
  const overviewPath = isExamMode ? '/TestOverview' : '/TaskOverview';
  const issueLabel = isExamMode ? 'Tekoälyn merkinnät' : 'Ongelmia tehtävässä?';

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const commentMessagesRef = useRef(null);

  const [commentModal, setCommentModal] = useState({
    open: false,
    task: null,
    comments: [],
    loading: false,
    sending: false,
  });

  const [commentText, setCommentText] = useState("");

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
        console.log("REVIEW DATA:", response.data)

        setStudentData(response.data?.student || null);

        const loadedTasks = (response.data?.tasks || []).map((task) => {
          const nextTask = {
            ...task,
            teacherPoints:
              task.teacherPoints !== "" &&
              task.teacherPoints !== null &&
              task.teacherPoints !== undefined
                ? Number(task.teacherPoints)
                : getChoiceAutoPoints(task),

            teacherComment: task.teacherComment ?? "",

            options: Array.isArray(task.options)
              ? task.options
              : [],

            correctAnswers: Array.isArray(task.correctAnswers)
              ? task.correctAnswers.map((value) => Number(value))
              : [],

            studentSelectedAnswers: Array.isArray(task.studentSelectedAnswers)
              ? task.studentSelectedAnswers.map((value) => Number(value))
              : [],

            points:
              task.points ??
              (task.idtaskresult ? null : task.points) ??
              null,

            hasStudentComment: false,
          };

          return nextTask;
        });

        setTasks(loadedTasks);
        await loadStudentCommentStatus(loadedTasks);

      } catch (error) {
        console.error("Failed to fetch student review data", error);
      } finally {
        setLoading(false);
      }
    };
    const loadStudentCommentStatus = async (loadedTasks) => {
      const targetUserId = userId || submission?.iduser;

      if (
        !courseId ||
        !exercise?.idexercise ||
        !targetUserId ||
        !user?.access_token ||
        !loadedTasks?.length
      ) {
        return;
      }

      try {
        const results = await Promise.all(
          loadedTasks.map(async (task) => {
            if (!task.idtask) {
              return {
                idtask: task.idtask,
                hasStudentComment: false,
              };
            }

            try {
              const response = await axios.get(
                `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions/${targetUserId}/question/${task.idtask}?_=${Date.now()}`,
                {
                  headers: {
                    Authorization: `Bearer ${user.access_token}`,
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                  },
                }
              );

              const comments = response.data?.comments || [];

              // Vain opiskelijan viesti tekee pallerosta oranssin.
              // Opettajan viesti yksin ei tee sitä oranssiksi.
              const hasStudentComment = comments.some(
                (comment) => comment.role !== "teacher"
              );

              return {
                idtask: task.idtask,
                hasStudentComment,
              };
            } catch (error) {
              console.error(
                `Tehtävän ${task.idtask} keskustelun hakeminen epäonnistui:`,
                error
              );

              return {
                idtask: task.idtask,
                hasStudentComment: false,
              };
            }
          })
        );

        setTasks((previous) =>
          previous.map((task) => {
            const result = results.find(
              (item) => item.idtask === task.idtask
            );

            return result
              ? {
                  ...task,
                  hasStudentComment: result.hasStudentComment,
                }
              : task;
          })
        );
      } catch (error) {
        console.error("Keskustelujen tilojen hakeminen epäonnistui:", error);
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
    if (
      task.teacherPoints !== null &&
      task.teacherPoints !== undefined &&
      task.teacherPoints !== ""
    ) {
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
            teacherPoints: resolveTaskPoints(task),
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

      navigate(overviewPath, {
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


  const openCommentModal = async (task) => {
    const targetUserId = userId || submission?.iduser;

    if (
      !courseId ||
      !exercise?.idexercise ||
      !targetUserId ||
      !task?.idtask ||
      !user?.access_token
    ) {
      return;
    }

    setCommentText("");

    setCommentModal({
      open: true,
      task,
      comments: [],
      loading: true,
      sending: false,
    });

    try {
      const response = await axios.get(
        `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions/${targetUserId}/question/${task.idtask}?_=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      const comments = response.data?.comments || [];

      setCommentModal((previous) => ({
        ...previous,
        comments,
        loading: false,
        task: {
          ...task,
          idtaskresult:
            response.data?.idtaskresult ?? task.idtaskresult,
        },
      }));

      // Oranssi pallero vain jos opettaja on kirjoittanut viestin.
      const hasStudentComment = comments.some(
        (comment) => comment.role !== "teacher"
      );

      setTasks((previous) =>
        previous.map((currentTask) =>
          currentTask.idtask === task.idtask
            ? {
                ...currentTask,
                hasStudentComment,
              }
            : currentTask
        )
      );
    } catch (error) {
      console.error(
        "Tehtävän keskustelun hakeminen epäonnistui:",
        error.response?.data || error.message
      );

      setCommentModal((previous) => ({
        ...previous,
        loading: false,
      }));
    }
  };



  const handleSendComment = async () => {
    if (!commentText.trim()) {
      return;
    }

    const taskResultId = commentModal.task?.idtaskresult;

    if (!taskResultId || !user?.access_token) {
      console.error(
        "idtaskresult puuttuu:",
        commentModal.task
      );
      return;
    }

    try {
      setCommentModal((previous) => ({
        ...previous,
        sending: true,
      }));

      await axios.post(
        `${url}/courses/taskComments/teacher`,
        {
          idtaskresult: taskResultId,
          comment: commentText.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setCommentText("");

      // Haetaan keskustelu uudelleen
      const targetUserId = userId || submission?.iduser;

      const response = await axios.get(
        `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions/${targetUserId}/question/${commentModal.task.idtask}?_=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      const comments = response.data?.comments || [];

      setCommentModal((previous) => ({
        ...previous,
        comments,
        sending: false,
      }));

      // Päivitetään pallero oransiksi jos oppilaalla vviestiä
      setTasks((previous) =>
        previous.map((task) =>
          task.idtask === commentModal.task.idtask
            ? {
                ...task,
                hasStudentComment: comments.some(
                  (comment) => comment.role !== "teacher"
                ),
              }
            : task
        )
      );
    } catch (error) {
      console.error(
        "Viestin lähettäminen epäonnistui:",
        error.response?.data || error.message
      );

      setCommentModal((previous) => ({
        ...previous,
        sending: false,
      }));
    }
  };

  useEffect(() => {
    if (!commentModal.open || commentModal.loading) return;

    const container = commentMessagesRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [
    commentModal.open,
    commentModal.loading,
    commentModal.comments,
  ]);





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

              navigate(overviewPath, {
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

                  <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 12,}}
                    >
                      <span className="task-time-label" style={{ margin: 0 }}>
                        {issueLabel}
                      </span>

                      <button
                        type="button"
                        onClick={() => openCommentModal(task)}
                        title="Avaa tehtävän keskustelu"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "5px 8px",
                          borderRadius: 8,
                        }}
                      >
                        <span style={{ width: 12,height: 12, borderRadius: "50%",background: task.hasStudentComment ? "#f28c28" : "#d9d9d9", display: "inline-block",
                            boxShadow: task.hasStudentComment
                            ? "0 0 0 4px rgba(242,140,40,0.15)"
                            : "none",
                          }}
                        />

                        <i className="fa-regular fa-comment-dots"  style={{fontSize: 21, color: "#1d283a", }}/>
                      </button>
                    </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, marginBottom: 12 }}>
                    <label className="task-time-label" style={{ margin: 0 }}>Arviointi</label>
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

      {commentModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() =>
            setCommentModal((previous) => ({
              ...previous,
              open: false,
            }))
          }
        >
          <div
            style={{
              width: "100%",
              maxWidth: 700,
              maxHeight: "85vh",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 15px 50px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(event) => event.stopPropagation()}
          >

            {/* Otsikko */}

            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid #e5e5e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Tehtävän keskustelu
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#6b7280",
                    fontSize: 14,
                  }}
                >
                  {commentModal.task?.title ||
                    `Tehtävä ${
                      tasks.findIndex(
                        (task) =>
                          task.idtask ===
                          commentModal.task?.idtask
                      ) + 1
                    }`}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCommentModal((previous) => ({
                    ...previous,
                    open: false,
                  }))
                }
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 28,
                  cursor: "pointer",
                  color: "#555",
                }}
              >
                ×
              </button>
            </div>

            {/* Keskustelu */}

            <div
              ref={commentMessagesRef}
              style={{
                padding: 20,
                overflowY: "auto",
                minHeight: 250,
                maxHeight: 500,
                background: "#f8f9fb",
              }}
            >
              {commentModal.loading ? (
                <p style={{ textAlign: "center", color: "#777" }}>
                  Ladataan keskustelua...
                </p>
              ) : commentModal.comments?.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {commentModal.comments.map(
                    (comment, index) => {
                      const isTeacher =
                        comment.role === "teacher";

                      return (
                        <div
                          key={
                            comment.idtaskcomments ||
                            index
                          }
                          style={{
                            display: "flex",
                            justifyContent: isTeacher
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "80%",
                              padding: "12px 15px",
                              borderRadius: 12,
                              background: isTeacher
                                ? "#eaf3ff"
                                : "#fff",
                              border: "1px solid #e1e5ea",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                marginBottom: 6,
                                color: "#344054",
                              }}
                            >
                              {isTeacher
                                ? "Opettaja"
                                : `${comment.firstname || ""} ${
                                    comment.lastname || ""
                                  }`.trim() ||
                                  "Opiskelija"}
                            </div>

                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5,
                              }}
                            >
                              {comment.comment}
                            </div>

                            {comment.timestamp_of_message && (
                              <div
                                style={{
                                  marginTop: 7,
                                  fontSize: 11,
                                  color: "#8a8f98",
                                }}
                              >
                                {new Date(
                                  comment.timestamp_of_message
                                ).toLocaleString("fi-FI")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: "#888",
                    padding: "50px 20px",
                  }}
                >
                  Tästä tehtävästä ei ole vielä keskustelua.
                </div>
              )}
            </div>

            {/* Uusi viesti */}

            <div
              style={{
                padding: 18,
                borderTop: "1px solid #e5e5e5",
                background: "#fff",
              }}
            >
              <textarea
                value={commentText}
                onChange={(event) =>
                  setCommentText(event.target.value)
                }
                placeholder="Kirjoita tähän viesti oppilaalle..."
                maxLength={10000}
                style={{
                  width: "100%",
                  minHeight: 100,
                  resize: "vertical",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSendComment}
                  disabled={
                    commentModal.sending ||
                    !commentText.trim()
                  }
                >
                  {commentModal.sending
                    ? "Lähetetään..."
                    : "Lähetä viesti"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskEvaluation;