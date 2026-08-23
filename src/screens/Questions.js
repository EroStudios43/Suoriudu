import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles/questions.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/useUser.js";

const url = process.env.REACT_APP_API_URL;

function Questions() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.access_token) {
      setLoading(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        const response = await axios.get(
          `${url}/courses/teacher/questions`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        );
        console.log("TEACHER QUESTIONS:", response.data);

        setQuestions(response.data || []);
      } catch (error) {
        console.error(
          "Kysymysten hakeminen epäonnistui:",
          error.response?.data || error.message
        );

        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [user?.access_token]);

  const openQuestion = async (question) => {
    try {
      await axios.put(
        `${url}/courses/teacher/questions/${question.idtaskresult}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        }
      );

      navigate("/SpecificQuestion", {
        state: {
          question,
        },
      });
    } catch (error) {
      console.error(
        "Kysymyksen merkitseminen luetuksi epäonnistui:",
        error.response?.data || error.message
      );

      // Navigoidaan silti keskusteluun, vaikka read-päivitys epäonnistuisi
      navigate("/SpecificQuestion", {
        state: {
          question,
        },
      });
    }
  };

  return (
    <div className="questions-page">
      <div className="questions-topbar">
        <div className="questions-title-wrapper">
          <i
            className="fa-regular fa-circle-left questions-back-icon"
            onClick={() => navigate(-1)}
          ></i>

          <div>
            <h1>Kysymykset</h1>
            <p>Oppilaiden tehtäviin liittyvät apupyynnöt</p>
          </div>
        </div>
      </div>

      <div className="divider"></div>

      <div className="questions-content">
        <h2>Tehtävien apupyynnöt</h2>

        {loading ? (
          <div className="questions-empty">
            <p>Ladataan kysymyksiä...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="questions-empty">
            <i className="fa-regular fa-envelope-open"></i>
            <p>Sinulle ei ole tällä hetkellä kysymyksiä.</p>
          </div>
        ) : (
          <div className="questions-list">
            {questions.map((question) => (
              <div
                className="question-card"
                key={question.idtaskcomments}
                onClick={() => openQuestion(question)}
              >
                <div className="question-student">
                  <div className="question-student-name">
                    <h3>
                      {question.anonymous
                        ? "Anonyymi opiskelija"
                        : `${question.student_firstname} ${question.student_lastname}`}
                    </h3>

                    {Number(question.has_unread) === 1 && (
                      <span className="unread-indicator">
                        <span className="unread-dot"></span>
                        Uusi viesti
                      </span>
                    )}
                  </div>

                  <span className="question-time">
                    {new Date(question.timestamp_of_message).toLocaleString("fi-FI")}
                  </span>
                </div>

                <div className="question-info">
                  <p className="question-course">
                    {question.coursename}
                  </p>

                  <p className="question-exercise">
                    {question.exercise_name}
                  </p>

                  <p className="question-task">
                    {question.task_question || "Tehtävänantoa ei löytynyt"}
                  </p>

                  <p className="question-comment">
                    {question.comment}
                  </p>
                </div>

                <button
                  type="button"
                  className="question-arrow"
                  onClick={(event) => {
                    event.stopPropagation();
                    openQuestion(question);
                  }}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Questions;