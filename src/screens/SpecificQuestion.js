import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./styles/specificQuestions.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/useUser.js";

const url = process.env.REACT_APP_API_URL;

function SpecificQuestion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const questionFromState = location.state?.question;

  const [question, setQuestion] = useState(questionFromState || null);

  const [answer, setAnswer] = useState("");

  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const commentContainerRef = useRef(null);

 //Kysymyksen tehtävän tarkemmat tiedot ja koko keskustelu
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!questionFromState) {
        navigate("/Questions", { replace: true });
        return;
      }

      const {
        courseId,
        idcourse,
        exerciseId,
        idexercise,
        userId,
        iduser,
        student_id,
        taskId,
        idtask,
      } = questionFromState;

      const finalCourseId = courseId ?? idcourse;
      const finalExerciseId = exerciseId ?? idexercise;
      const finalUserId = userId ?? iduser ?? student_id;
      const finalTaskId = taskId ?? idtask;

      if (
        !finalCourseId ||
        !finalExerciseId ||
        !finalUserId ||
        !finalTaskId
      ) {
        console.error("SpecificQuestion: tarvittavat ID:t puuttuvat", {
          finalCourseId,
          finalExerciseId,
          finalUserId,
          finalTaskId,
          questionFromState,
        });

        setLoading(false);
        return;
      }

      if (!user?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${url}/courses/${finalCourseId}/exercises/${finalExerciseId}/submissions/${finalUserId}/question/${finalTaskId}?_=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        );

        const data = response.data;


        console.log("KYSYMYS DATA:", data);

        const mergedQuestion = {
          ...questionFromState,
          ...data,

          courseId: finalCourseId,
          exerciseId: finalExerciseId,
          userId: finalUserId,
          taskId: finalTaskId,

          idcourse: finalCourseId,
          idexercise: finalExerciseId,
          iduser: finalUserId,
          idtask: finalTaskId,

          idtaskresult: data.idtaskresult,

          task_question: data.question || questionFromState.task_question,
          tasktype: data.tasktype || questionFromState.tasktype,

          comments: data.comments || [],

          exercise_description:
            data.exercise_description ||
            questionFromState.exercise_description,
        };

        setQuestion(mergedQuestion);
      } catch (error) {
        console.error(
          "Kysymyksen hakeminen epäonnistui:",
          error.response?.data || error.message
        );

        alert("Kysymyksen tietojen hakeminen epäonnistui.");
        
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [questionFromState, user, navigate]);


  //Keskustelu uusimpaan viestiin
  useEffect(() => {
    const container = commentContainerRef.current;

    if (!container) return;

    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
  }, [question?.comments]);


  //Ladataan näkymä
  if (loading) {
    return (
      <div className="specific-question-page">
        <div className="specific-question-content">
          <p>Ladataan kysymystä...</p>
        </div>
      </div>
    );
  }
  if (!question) {
    return null;
  }

  //Takaisin nappi
  const handleBack = () => {
    if (answer.trim()) {
      const shouldLeave = window.confirm(
        "Olet kirjoittanut vastauksen, mutta et ole lähettänyt sitä. Haluatko varmasti poistua?"
      );

      if (!shouldLeave) {
        return;
      }
    }

    navigate(-1);
  };

  //Uusi opettajan viesti
  const handleSendAnswer = async () => {
    if (!answer.trim()) {
      alert("Kirjoita ensin vastaus.");
      return;
    }

    if (!user?.access_token) {
      alert("Käyttäjän istuntoa ei löytynyt.");
      return;
    }

    if (!question.idtaskresult) {
      console.error(
        "idtaskresult puuttuu:",
        question
      );

      alert(
        "Kysymyksen keskustelun tunnistetiedot puuttuvat."
      );

      return;
    }

    setSending(true);

    try {
      const response = await axios.post(
        `${url}/courses/taskComments/teacher`,
        {
          idtaskresult: question.idtaskresult,
          comment: answer.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Opettajan vastaus tallennettu:", response.data);



      //Backend palauttaa uuden kommentin
      //Lisätään se keskusteluun jos objekti
      if (response.data.comment){
        setQuestion((previous) => ({
          ...previous,
          comments: [
            ...(previous.comments || []),
            response.data.comment,
          ],
        }))
      }else {
        //Jos palautus vain onnistumisviesti, haetaan keskustelu uudelleen
        const courseId =
          question.courseId ?? question.idcourse;

        const exerciseId =
          question.exerciseId ?? question.idexercise;

        const userId =
          question.userId ??
          question.iduser ??
          question.student_id;

        const taskId =
          question.taskId ?? question.idtask;

        const refreshResponse = await axios.get(
          `${url}/courses/${courseId}/exercises/${exerciseId}/submissions/${userId}/question/${taskId}?_=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        );

        setQuestion((previous) => ({
          ...previous,
          ...refreshResponse.data,
          comments:
            refreshResponse.data.comments || [],
        }));

      }

      setAnswer("");
    } catch (error) {
      console.error(
        "Vastauksen lähettäminen epäonnistui:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.error ||
          "Vastauksen lähettäminen epäonnistui."
      );
    } finally {
      setSending(false);
    }
  };

  const getTaskTypeLabel = (type) => {
    switch (type) {
      case "essay":
        return "Essee";
      case "coding":
        return "Ohjelmointi";
      case "drawing":
        return "Piirustus";
      case "single_choice":
        return "Yksi vaihtoehto";
      case "multiple_choice":
        return "Monivalinta";
      default:
        return "Tehtävä";
    }
  };

  const getChoiceData = () => {
    if (
      question.tasktype !== "single_choice" &&
      question.tasktype !== "multiple_choice"
    ) {
      return null;
    }

    try {
      const data =
        typeof question.correct_answer === "string"
          ? JSON.parse(question.correct_answer)
          : question.correct_answer;

      return data;
    } catch (error) {
      console.error("Vaihtoehtojen lukeminen epäonnistui:", error);
      return null;
    }
  };



  return (
    <div className="specific-question-page">

      <div className="specific-question-topbar">

        <div className="specific-question-title-wrapper">

          <i
            className="fa-regular fa-circle-left specific-question-back"
            onClick={handleBack}
          ></i>

          <div>
            <h1>
              {question.coursename || "Kurssi"}
            </h1>

            <p>
              {question.exercise_name || "Tehtävä"}
            </p>
          </div>

        </div>

      </div>

      <div className="divider"></div>

      <div className="specific-question-content">

        {/* TEHTÄVÄ */}

        <section className="specific-section">

          <h2>Tehtävä:</h2>

          <div className="task-description-box">
            <p>
              {question.exercise_description ||
                "Tehtävänantoa ei löytynyt."}
            </p>
          </div>

          <div className="task-box">
            <p className="task-type">
              {getTaskTypeLabel(question.tasktype)}
            </p>

            <p className="task-box-title">
              Tehtävä
            </p>

            <p>
              {question.task_question ||
                question.question ||
                "Tehtävän sisältöä ei löytynyt."}
            </p>

              {question.tasktype === "essay" && question.correct_answer && (
                <div className="task-example-answer">
                  <p className="task-example-answer-title">
                    Esimerkkivastaus
                  </p>

                  <p>
                    {question.correct_answer}
                  </p>
                </div>
              )}
              {(question.tasktype === "single_choice" ||
                question.tasktype === "multiple_choice") && (
                <>
                  {(() => {
                    const choiceData = getChoiceData();

                    if (!choiceData?.options?.length) {
                      return null;
                    }

                    return (
                      <div className="task-options">
                        <p className="task-box-title">Vaihtoehdot</p>

                        {choiceData.options.map((option, index) => {
                          const isCorrect =
                            choiceData.correctAnswers?.includes(index);

                          return (
                            <div
                              key={index}
                              className={`task-option ${
                                isCorrect ? "correct-option" : ""
                              }`}
                            >
                              <span className="task-option-number">
                                {index + 1}.
                              </span>

                              <span className="task-option-text">
                                {option}
                              </span>

                              {isCorrect && (
                                <span className="correct-option-label">
                                  ✓ Oikea vastaus
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}

          </div>

        </section>

        {/* Keskustelu */}
        <section className="specific-section">

          <div className="specific-chat-header">
            <h2>Tehtävän kommentit</h2>
          </div>

          <div className="specific-chat-box">
            <div ref={commentContainerRef} className="student-comment-container">

              {question.comments?.length > 0 ? (
                question.comments.map((comment, index) => {
                  const isStudent =
                    comment.idcommentor === question.userId;

                  return (
                    <div
                      key={comment.idcomment || comment.idtaskcomments || index}
                      className={`specific-chat-message-wrapper ${
                        isStudent ? "student-message" : "teacher-message"
                      }`}
                    >
                      <div
                        className={`student-comment-box ${
                          isStudent
                            ? "student-comment"
                            : "teacher-comment"
                        }`}
                      >
                        <p className="comment-author">
                          {isStudent
                            ? `${question.student_firstname || ""} ${
                                question.student_lastname || ""
                              }`.trim() || "Opiskelija"
                            : "Opettaja"}
                        </p>

                        <hr />

                        <p className="comment-text">
                          {comment.comment}
                        </p>

                        {comment.timestamp_of_message && (
                          <span className="comment-time">
                            {new Date(
                              comment.timestamp_of_message
                            ).toLocaleString("fi-FI")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="specific-chat-empty">
                  Tästä tehtävästä ei ole vielä keskustelua.
                </p>
              )}
            </div>
          </div>

        </section>

        {/* UUSI VASTAUS */}

        <section className="specific-section">

          <h2>
            Vastaus oppilaalle
          </h2>

          <textarea
            className="teacher-answer-input"
            value={answer}
            onChange={(event) =>
              setAnswer(event.target.value)
            }
            placeholder="Kirjoita tähän vastaus oppilaalle..."
            maxLength={10000}
          />

          <div className="teacher-answer-character-count">
            {answer.length}/10000
          </div>

        </section>


        <div className="specific-question-actions">

          <button
            className="send-answer-btn"
            type="button"
            disabled={
              sending ||
              !answer.trim()
            }
            onClick={handleSendAnswer}
          >
            {sending
              ? "Lähetetään..."
              : "Lähetä vastaus"}
          </button>

        </div>

      </div>

    </div>
        
  );
}

export default SpecificQuestion;