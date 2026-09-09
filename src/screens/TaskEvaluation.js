import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import "./styles/createTask.css";
import "./styles/overviews.css"
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import { normalizeChoiceSelection } from "../utils/choiceSelection.js";
import { getReviewDisplayName } from "../utils/reviewSelection.js";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import DrawingReview from "../components/DrawingReview.js";


import { useTheme } from "../context/ThemeContext.js";


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
  const [attempts, setAttempts] = useState([]);
  const [chosenAttemptId, setChosenAttemptId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [evaluatingAll, setEvaluatingAll] = useState(false);
  const commentMessagesRef = useRef(null);

  // Variables for coding exercises
  const [ codeRunResult, setCodeRunResult ] = useState({})
  
  const { isDarkMode, toggleTheme } = useTheme();

  const [commentModal, setCommentModal] = useState({
    open: false,
    task: null,
    comments: [],
    loading: false,
    sending: false,
  });

  const [commentText, setCommentText] = useState("");

  const getChoiceStudentSelections = useCallback((task) => {
    if (task.type !== "choice") return [];
    return normalizeChoiceSelection(task.studentSelectedAnswers ?? task.studentAnswer);
  }, []);

  const getChoiceAutoPoints = useCallback((task) => {
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
  }, [getChoiceStudentSelections]);

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
        console.log(
          "TASK IDS:",
          (response.data?.tasks || []).map(task => ({
            idtask: task.idtask,
            title: task.title,
            type: task.type,
            options: task.options,
            studentSelectedAnswers: task.studentSelectedAnswers,
          }))
        );

        setStudentData(response.data?.student || null);
        const loadedAttempts = response.data?.attempts || [];
        setAttempts(loadedAttempts);
        setChosenAttemptId((currentAttemptId) =>
          currentAttemptId && loadedAttempts.some(
            (attempt) => Number(attempt.idexerciseresult) === Number(currentAttemptId)
          )
            ? currentAttemptId
            : loadedAttempts[0]?.idexerciseresult || null
        );

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

            hasUnreadStudentComment: false,
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

      if (
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
                hasUnreadStudentComment: false,
              };
            }

            try {
              const response = await axios.get(
                `${url}/courses/teacher/questions/${task.idtaskresult}?_=${Date.now()}`,
                {
                  headers: {
                    Authorization: `Bearer ${user.access_token}`,
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                  },
                }
              );

              const comments = response.data?.comments || [];

              // Lukematon oppilaan viesti oranssiksi palleroksi
              const hasUnreadStudentComment = comments.some(
                (comment) =>
                  comment.role !== "teacher" &&
                  Number(comment.comment_read) === 0
              );

              return {
                idtask: task.idtask,
                hasUnreadStudentComment,
              };
            } catch (error) {
              console.error(
                `Tehtävän ${task.idtask} keskustelun hakeminen epäonnistui:`,
                error
              );

              return {
                idtask: task.idtask,
                hasUnreadStudentComment: false,
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
                  hasUnreadStudentComment: result.hasUnreadStudentComment,
                }
              : task;
          })
        );
      } catch (error) {
        console.error("Keskustelujen tilojen hakeminen epäonnistui:", error);
      }
    };

    fetchReviewData();
  }, [courseId, exercise?.idexercise, user?.access_token, submission?.iduser, userId, getChoiceAutoPoints]);

  useEffect(() => {
    const selectedAttempt = attempts.find(
      (attempt) => Number(attempt.idexerciseresult) === Number(chosenAttemptId)
    );

    if (!selectedAttempt) return;

    setTasks(selectedAttempt.tasks.map((task) => ({
      ...task,
      teacherPoints:
        task.teacherPoints !== "" && task.teacherPoints !== null && task.teacherPoints !== undefined
          ? Number(task.teacherPoints)
          : getChoiceAutoPoints(task),
      teacherComment: task.teacherComment ?? "",
      options: Array.isArray(task.options) ? task.options : [],
      correctAnswers: Array.isArray(task.correctAnswers)
        ? task.correctAnswers.map((value) => Number(value))
        : [],
      studentSelectedAnswers: Array.isArray(task.studentSelectedAnswers)
        ? task.studentSelectedAnswers.map((value) => Number(value))
        : [],
      points: task.points ?? null,
      hasUnreadStudentComment: false,
    })));
  }, [attempts, chosenAttemptId, getChoiceAutoPoints]);

  const updateTaskField = (taskIndex, field, value) => {
    setTasks((prev) => prev.map((task, index) => {
      if (index !== taskIndex) return task;
      return { ...task, [field]: value };
    }));
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

  const handleAiEvaluateAll = async () => {
    const essayTasks = tasks
      .map((task, index) => ({ task, index, studentAnswer: formatStudentAnswer(task) }))
      .filter(({ task, studentAnswer }) =>
        task.type === "essay" && studentAnswer && studentAnswer !== "Ei vastausta"
      );

    if (essayTasks.length === 0) {
      alert("Tehtävässä ei ole arvioitavia esseetehtäviä.");
      return;
    }

    try {
      setEvaluatingAll(true);
      const results = await Promise.all(essayTasks.map(async ({ task, index, studentAnswer }) => {
        const response = await axios.post(`${url}/ai/evaluate`, {
          type: task.type,
          question: task.instruction,
          studentAnswer,
          exampleAnswer: task.exampleAnswer,
          maxPoints: getMaxPoints(task),
        }, { headers: { Authorization: `Bearer ${user.access_token}` } });

        return { index, points: response.data.points, comment: response.data.comment };
      }));

      setTasks((previous) => previous.map((task, index) => {
        const result = results.find((item) => item.index === index);
        return result
          ? { ...task, teacherPoints: result.points, teacherComment: result.comment }
          : task;
      }));
    } catch (error) {
      console.error("AI essay evaluation failed", error);
      alert(error.response?.data?.error || "AI-arviointi epäonnistui.");
    } finally {
      setEvaluatingAll(false);
    }
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
            exerciseResultId: chosenAttemptId,
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
            exerciseResultId: chosenAttemptId,
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

  const loadComments = async (taskResultId) => {
    if (!taskResultId || !user?.access_token) {
      return [];
    }

    const response = await axios.get(
      `${url}/courses/teacher/questions/${taskResultId}?_=${Date.now()}`,
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );

    return response.data?.comments || [];
  };

const openCommentModal = async (task) => {
  const taskResultId = task?.idtaskresult;

  if (!taskResultId || !user?.access_token) {
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
    const comments = await loadComments(taskResultId);

    setCommentModal((previous) => ({
      ...previous,
      comments,
      loading: false,
      task: {
        ...task,
        idtaskresult: taskResultId,
      },
    }));

    await axios.put(
      `${url}/courses/teacher/questions/${taskResultId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        },
      }
    );

    setTasks((previous) =>
      previous.map((currentTask) =>
        currentTask.idtask === task.idtask
          ? {
              ...currentTask,
              hasUnreadStudentComment: false,
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
  const message = commentText.trim();

  if (!message) {
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
        comment: message,
      },
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    setCommentText("");

    // Haetaan keskustelu samalla endpointilla
    // jota käytetään modalin avaamisessa.
    const comments = await loadComments(taskResultId);

    setCommentModal((previous) => ({
      ...previous,
      comments,
      sending: false,
    }));

    // Vieritetään keskustelu uusimman viestin kohdalle
    requestAnimationFrame(() => {
      const container = commentMessagesRef.current;

      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

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
    <div className={`task-page ${isDarkMode ? '' : 'light-theme'}`}>
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
          <div className="evaluation-header-actions">
            <button className="save-btn" type="button" onClick={handleAiEvaluateAll} disabled={evaluatingAll || saving || loading}>
              {evaluatingAll ? "AI arvioi tehtäviä..." : "Arvioi tehtävät tekoälyllä"}
            </button>
          </div>
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

            {attempts.length > 0 && (
              <div className="attempt-selector-wrapper">
                <label htmlFor="task-attempt" className="task-time-label">
                  Suoritus
                </label>
                <select
                  id="task-attempt"
                  className="form-select attempt-selector"
                  value={chosenAttemptId || ""}
                  onChange={(event) => setChosenAttemptId(Number(event.target.value))}
                >
                  {attempts.map((attempt, index) => (
                    <option key={attempt.idexerciseresult} value={attempt.idexerciseresult}>
                      {`Suoritus ${attempts.length - index} - `}
                      {new Date(attempt.starting_time).toLocaleString("fi-FI", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tasks.length === 0 ? (
              <p>Ei tehtäviä arvioitavaksi.</p>
            ) : (
              tasks.map((task, index) => (
                <div key={task.idtask || index} className="single-task-section">
                  <h3 className="task-time-title">
                    {task.title || `Tehtävä ${index + 1}`}
                  </h3>

                  <p className="task-time-label">
                    {task.instruction || "Tehtävänanto"}
                  </p>

                  {task.type === "drawing" && task.exampleAnswer ? (
                    <div className="option-card example-answer-card">
                      <strong>Esimerkkivastaus</strong>
                      <DrawingReview json={task.exampleAnswer} />
                    </div>
                  ) : task.type !== "choice" && task.type !== "coding" && task.exampleAnswer ? (
                    <div className="option-card example-answer-card">
                      <strong>Esimerkkivastaus</strong>
                      <div>{task.exampleAnswer}</div>
                    </div>
                  ) : null}

                  <div className="student-answer-wrapper">
                    {task.type === "drawing" ? (
                      <div className="drawing-review-wrapper">
                        <strong>Oppilaan piirros</strong>
                        <DrawingReview json={task.studentAnswer} />
                      </div>
                    ) : task.type === "choice" ? (
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
                                  isSelected ? "choice-option-selected" : "",
                                  isCorrect ? "choice-option-correct" : "",
                                  isWrongSelected ? "choice-option-wrong" : "",
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
                                  {option || `Vaihtoehto ${optionIndex + 1}`}
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

                        <hr />
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
                      {issueLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => openCommentModal(task)}
                      title="Avaa tehtävän keskustelu"
                      className="comment-button"
                    >
                      <span
                        className={`comment-status-dot ${
                          task.hasUnreadStudentComment
                            ? "comment-status-dot-unread"
                            : ""
                        }`}
                      />

                      <i className="fa-regular fa-comment-dots comment-icon" />
                    </button>
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
                          updateTaskField(index, "teacherPoints", "");
                          return;
                        }

                        let points = Number(value);
                        const maxPoints = getMaxPoints(task);

                        if (!Number.isFinite(points)) {
                          return;
                        }

                        points = Math.max(0, points);
                        points = Math.min(points, maxPoints);

                        updateTaskField(index, "teacherPoints", points);
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
              ))
            )}

            <div className="task-bottom-actions save-all-actions">
              <button
                className="save-btn"
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
              >
                {saving ? "Tallennetaan..." : "Tallenna koko arviointi"}
              </button>
            </div>
          </>
        )}
      </div>

      {commentModal.open && (
        <div
          className="comment-modal-overlay"
          onClick={() =>
            setCommentModal((previous) => ({
              ...previous,
              open: false,
            }))
          }
        >
          <div
            className="comment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="comment-modal-header">
              <div>
                <h2 className="comment-modal-title">
                  Tehtävän keskustelu
                </h2>

                <p className="comment-modal-task-title">
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
                className="comment-modal-close"
              >
                ×
              </button>
            </div>

            <div
              ref={commentMessagesRef}
              className="comment-messages"
            >
              {commentModal.loading ? (
                <p className="comment-loading">
                  Ladataan keskustelua...
                </p>
              ) : commentModal.comments?.length > 0 ? (
                <div className="comment-list">
                  {commentModal.comments.map(
                    (comment, index) => {
                      const isTeacher =
                        comment.role === "teacher";

                      return (
                        <div
                          key={
                            comment.idtaskcomments || index
                          }
                          className={`comment-row ${
                            isTeacher
                              ? "comment-row-teacher"
                              : "comment-row-student"
                          }`}
                        >
                          <div
                            className={`comment-bubble ${
                              isTeacher
                                ? "comment-bubble-teacher"
                                : ""
                            }`}
                          >
                            <div className="comment-author">
                              {isTeacher
                                ? "Opettaja"
                                : `${comment.firstname || ""} ${
                                    comment.lastname || ""
                                  }`.trim() ||
                                  "Opiskelija"}
                            </div>

                            <div className="comment-content">
                              {comment.comment}
                            </div>

                            {comment.timestamp_of_message && (
                              <div className="comment-timestamp">
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
                <div className="no-comments">
                  Tästä tehtävästä ei ole vielä keskustelua.
                </div>
              )}
            </div>

            <div className="comment-compose">
              <textarea
                value={commentText}
                onChange={(event) =>
                  setCommentText(event.target.value)
                }
                placeholder="Kirjoita tähän viesti oppilaalle..."
                maxLength={10000}
                className="comment-input"
              />

              <div className="comment-send-actions">
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