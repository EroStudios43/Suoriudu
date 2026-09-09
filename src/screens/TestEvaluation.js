import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./styles/createTask.css";
import "./styles/overviews.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { normalizeChoiceSelection } from "../utils/choiceSelection.js";
import { getReviewDisplayName } from "../utils/reviewSelection.js";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

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

  // Variables for coding exercises
  const [ codeRunResult, setCodeRunResult ] = useState({})

  const [aiModal, setAiModal] = useState({
    open: false,
    task: null,
  });

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
  const handleBack = () => {
    if (location.state?.week) {
      navigate("/WeekOverview", {
        replace: true,
        state: {
          courseId,
          week: location.state.week,
        },
      });
      return;
    }

    navigate(-1);
  };

  const openAiModal = (task) => {
    const rawLogs = task.ai_logs || task.ai_notes;
    const parsedLogs = parseAiNotes(rawLogs);

    setAiModal({
      open: true,
      task: {
        ...task,
        parsedLogs: parsedLogs
      },
    });
  };

  const closeAiModal = () => {
    setAiModal({
      open: false,
      task: null,
    });
  };

  const parseAiNotes = (lista) => {
    if (!Array.isArray(lista)) return [];

    return lista
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
  }

    const runAndCheckCode = (code, testCases) => {
    const worker = new Worker(new URL('../workers/codeworker.js', import.meta.url));
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        worker.terminate();
        resolve([{ name: 'Timeout', passed: false, error: 'Execution took too long' }]);
      }, 3000);

      worker.onmessage = (e) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(e.data);
      };
      worker.postMessage({ code, testCases });
    });
  }

  const handleCodeRun = async (task) => {
    const task_code_data = JSON.parse(task.exampleAnswer)
    const student_code = task.studentAnswer || task_code_data.starterCode
    const test_cases = task_code_data.testCases
    const results = await runAndCheckCode(student_code, test_cases)
    setCodeRunResult((prev) => ({ ...prev, [task.idtask]: results }));
  }

  // Function for rendering coding exercise test results
  const TestResults = ({ results }) => {
    const passedCount = results.filter((r) => r.passed).length;

    return (
      <div>
        <p>{passedCount} / {results.length} tests passed</p>
        <ul>
          {results.map((r, i) => (
            <li key={i} style={{ color: r.passed ? 'green' : 'red' }}>
              {r.passed ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-xmark"></i>} {r.name}
              {!r.passed && (
                <span>
                  {r.error
                    ? ` — Error: ${r.error}`
                    : ` — expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="task-page">
      <div className="task-paper">
        <div className="task-header">
          <i
            className="fa-regular fa-circle-left back-arrow"
            onClick={handleBack}          
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
              tasks.map((task, index) => {
                const hasAiLogs = Boolean(task.ai_logs && task.ai_logs.length > 0);
                return (
                  <div
                    key={task.idtask || index}
                    className="single-task-section"
                  >
                  <h3 className="task-time-title">
                    {task.title || `Tehtävä ${index + 1}`}
                  </h3>

                  <p className="task-time-label">
                    {task.instruction || "Tehtävänanto"}
                  </p>

                  {task.type !== "choice" && task.type !== "coding" && task.exampleAnswer ? (
                    <div className="option-card example-answer-card">
                      <strong>Esimerkkivastaus</strong>
                      <div>{task.exampleAnswer}</div>
                    </div>
                  ) : null}

                  <div className="student-answer-wrapper">
                    {task.type === "choice" ? (
                      <div className="option-card">
                        <strong>Oppilaan vastaus</strong>

                        <div className="choice-options">
                          {(task.options || []).map((option, optionIndex) => {
                            const isSelected =
                              getChoiceStudentSelections(task).includes(optionIndex);

                            const isCorrect =
                              (task.correctAnswers || []).includes(optionIndex);

                            const isWrongSelected =
                              isSelected && !isCorrect;

                            return (
                              <label
                                key={`${task.idtask}-${optionIndex}`}
                                className={[
                                  "choice-option",
                                  isSelected
                                    ? "choice-option-selected"
                                    : "",
                                  isCorrect
                                    ? "choice-option-correct"
                                    : "",
                                  isWrongSelected
                                    ? "choice-option-wrong"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <input
                                  type={
                                    task.choiceMode === "multiple"
                                      ? "checkbox"
                                      : "radio"
                                  }
                                  checked={isSelected}
                                  readOnly
                                  className={
                                    isCorrect
                                      ? "choice-input-correct"
                                      : "choice-input"
                                  }
                                />

                                <span>
                                  {option ||
                                    `Vaihtoehto ${optionIndex + 1}`}
                                </span>

                                {isCorrect ? (
                                  <span className="choice-status choice-status-correct">
                                    Oikea
                                  </span>
                                ) : isSelected ? (
                                  <span className="choice-status choice-status-selected">
                                    Valittu
                                  </span>
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (task.type === "coding") ? (
                      <>
                        <CodeMirror 
                          value={task.studentAnswer} 
                          extensions={[javascript()]} 
                          readOnly={true}
                        />

                        <div>
                          {codeRunResult[task.idtask] && <TestResults results={codeRunResult[task.idtask]} />}
                        </div>
                        <hr />
                        <div className="btn btn-submit float-end" onClick={() => handleCodeRun(task)}>Suorita koodi</div>
                        <br />
                      </>
                    ) : (
                      <div>
                        <div className="student-answer-label">
                          <strong>Oppilaan vastaus</strong>
                        </div>

                        <textarea
                          className="large-answer-input"
                          value={formatStudentAnswer(task)}
                          readOnly
                        />
                      </div>
                    )}
                  </div>

                  <div className="issue-row">
                    <span className="task-time-label issue-label">
                      Tekoälyn merkinnät
                    </span>

                    <div 
                        className="ai-marking-indicator"
                        style={{ cursor: "pointer" }}
                        onClick={() => openAiModal(task)}
                      >
                        <span
                          className={`ai-status-dot ${
                            hasAiLogs ? "ai-status-dot-active" : ""
                          }`}
                        />

                      <i className="fa-regular fa-comment-dots ai-comment-icon" />
                    </div>
                  </div>

                  <div className="evaluation-row">
                    <label className="task-time-label evaluation-label">
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

                        if (value === "") {
                          updateTaskField(
                            index,
                            "teacherPoints",
                            ""
                          );
                          return;
                        }

                        let points = Number(value);
                        const maxPoints = getMaxPoints(task);

                        if (!Number.isFinite(points)) {
                          return;
                        }

                        points = Math.max(0, points);
                        points = Math.min(points, maxPoints);

                        updateTaskField(
                          index,
                          "teacherPoints",
                          points
                        );
                      }}
                      className="points-input"
                    />

                    <span className="points-total">
                      / {getMaxPoints(task)} p
                    </span>
                  </div>

                  <div className="feedback-wrapper">
                    <label className="task-time-label">
                      Palaute oppilaalle
                    </label>

                    <textarea
                      className="large-answer-input feedback-input"
                      value={task.teacherComment || ""}
                      onChange={(e) =>
                        updateTaskField(
                          index,
                          "teacherComment",
                          e.target.value
                        )
                      }
                      placeholder="Kirjoita oppilaalle palaute..."
                    />
                  </div>

                  <div className="task-bottom-actions task-save-actions">
                    <button
                      className="save-btn"
                      type="button"
                      onClick={() => handleSaveTask(index)}
                      disabled={saving}
                    >
                      {saving
                        ? "Tallennetaan..."
                        : "Tallenna tämä kohta"}
                    </button>
                  </div>

                  <div className="divider task-divider" />
                </div>
                )
              })
            )}

            <div className="task-bottom-actions save-all-actions">
              <button
                className="save-btn"
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
              >
                {saving
                  ? "Tallennetaan..."
                  : "Tallenna koko arviointi"}
              </button>
            </div>
          </>
        )}
      </div>
      {aiModal.open && (
        <div className="comment-modal-overlay" onClick={closeAiModal}>
          <div
            className="comment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="comment-modal-header">
              <div>
                <h2 className="comment-modal-title">Tekoälyn merkinnät</h2>
                <p className="comment-modal-task-title">
                  {aiModal.task?.title || "Tehtävä"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAiModal}
                className="comment-modal-close"
              >
                x
              </button>
            </div>

            <div className="comment-messages">
              {aiModal.task?.parsedLogs && aiModal.task.parsedLogs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0" }}>
                  {aiModal.task.parsedLogs.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#f8f9fa",
                        borderLeft: "4px solid #e74c3c",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px"
                      }}
                    >
                      {/* Tulostetaan teksti ensin */}
                      <div style={{ fontWeight: "600", color: "#2c3e50", fontSize: "0.95rem" }}>
                        {log.cause}
                      </div>
                      
                      {/* Tulostetaan aika sen alle */}
                      <div style={{ fontSize: "0.8rem", color: "#7f8c8d" }}>
                        Aika: {log.timestamp ? new Date(log.timestamp).toLocaleString("fi-FI") : "Ei aikaa"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-comments">
                  Ei tekoälyn merkintöjä tässä tehtävässä.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestEvaluation;
