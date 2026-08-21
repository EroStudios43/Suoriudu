import React, { useEffect, useState } from "react";
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
  const [initialAnswer, setInitialAnswer] = useState("");

  const [showBackModal, setShowBackModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  /*
   * Haetaan kysymyksen tarkat tiedot backendistä.
   *
   * Tarvitaan:
   * courseId
   * exerciseId
   * userId
   * taskId
   */
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

          student_answer: data.student_answer,
          teacher_comment: data.teacher_comment,

          exercise_description:
            data.exercise_description ||
            questionFromState.exercise_description,
        };

        setQuestion(mergedQuestion);

        const existingAnswer = data.teacher_comment || "";

        setAnswer(existingAnswer);
        setInitialAnswer(existingAnswer);
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

  const isDirty = answer !== initialAnswer;

  const handleBack = () => {
    if (isDirty) {
      setShowBackModal(true);
      return;
    }

    navigate(-1);
  };

  const handleSendAnswer = async () => {
    if (!answer.trim()) {
      alert("Kirjoita ensin vastaus.");
      return;
    }

    if (!user?.access_token) {
      alert("Käyttäjän istuntoa ei löytynyt.");
      return;
    }

    const courseId = question.courseId ?? question.idcourse;
    const exerciseId = question.exerciseId ?? question.idexercise;
    const userId = question.userId ?? question.iduser;
    const taskId = question.taskId ?? question.idtask;

    if (!courseId || !exerciseId || !userId || !taskId) {
      console.error("ID:t puuttuvat:", {
        courseId,
        exerciseId,
        userId,
        taskId,
        question,
      });

      alert("Kysymyksen tunnistetietoja puuttuu.");
      return;
    }

    setSending(true);

    try {
      const response = await axios.put(
        `${url}/courses/${courseId}/exercises/${exerciseId}/submissions/${userId}/question/${taskId}`,
        {
          teacher_comment: answer,
        },
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Opettajan vastaus tallennettu:", response.data);

      setInitialAnswer(answer);

      setQuestion((previous) => ({
        ...previous,
        teacher_comment: answer,
      }));

      alert("Vastaus tallennettu.");
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

          </div>

        </section>

        {/* OPISKELIJAN APUPYYNTÖ */}

        <section className="specific-section">

          <h2>Tehtävän apupyyntö</h2>

          <div className="student-question-box">

            <div className="student-question-header">
              <strong>
                {question.anonymous
                  ? "Anonyymi opiskelija"
                  : `${question.student_firstname || ""} ${question.student_lastname || ""}`.trim()
                }
              </strong>
            </div>

            <p>
              {question.comment ||
                "Opiskelijan apupyyntöä ei löytynyt."}
            </p>

          </div>

        </section>

        {/* OPISKELIJAN VASTAUS */}

        {question.student_answer && (
          <section className="specific-section">

            <h2>Opiskelijan vastaus</h2>

            <div className="student-answer-box">

              <p>
                {question.student_answer}
              </p>

            </div>

          </section>
        )}

        {/* OPETTAJAN VASTAUS */}

        <section className="specific-section">

          <h2>Vastaus oppilaalle</h2>

          <textarea
            className="teacher-answer-input"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Kirjoita tähän vastaus oppilaalle..."
          />

        </section>

        <div className="specific-question-actions">

          <button
            className="send-answer-btn"
            type="button"
            disabled={sending}
            onClick={handleSendAnswer}
          >
            {sending
              ? "Lähetetään..."
              : "Lähetä vastaus"}
          </button>

        </div>

      </div>

      {/* BACK MODAL */}

      {showBackModal && (
        <div className="specific-modal-overlay">

          <div className="specific-modal">

            <div className="specific-modal-header">

              <h3>
                Palauttamattomia muutoksia
              </h3>

              <button
                type="button"
                className="specific-modal-close"
                onClick={() => setShowBackModal(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

            </div>

            <div className="specific-modal-body">

              <p>
                Olet kirjoittanut vastauksen, mutta et ole
                lähettänyt sitä.
              </p>

              <p>
                Haluatko varmasti poistua ilman että vastaus
                tallennetaan?
              </p>

              <div className="specific-modal-actions">

                <button
                  type="button"
                  className="specific-modal-cancel"
                  onClick={() => setShowBackModal(false)}
                >
                  Jatka kirjoittamista
                </button>

                <button
                  type="button"
                  className="specific-modal-leave"
                  onClick={() => navigate(-1)}
                >
                  Poistu ilman tallennusta
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default SpecificQuestion;