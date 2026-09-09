import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles/home.css";
import "./styles/coursePage.css";
import "./styles/weekPage.css";
import "./styles/examPage.css"
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import ProgressBarTimer from "../components/progressbartimer.js";
import CountdownTimer from "../components/CountDownTimer.js";
import confetti from "canvas-confetti";

import { useTheme } from "../context/ThemeContext.js";


const url = process.env.REACT_APP_API_URL;


function TeacherExamPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId, exercise } = location.state || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const [countdownMs, setCountdownMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progress, setProgress] = useState(100);
  const [remaining, setRemaining] = useState("");
  const [confettiShown, setConfettiShown] = useState(false);

  const [showReturnsPopup, setShowReturnsPopup] = useState(false);

  const { isDarkMode, toggleTheme } = useTheme();
   

  useEffect(() => {
    if (!courseId || !exercise?.idexercise) return;

    const fetchExam = async () => {
      try {
        const response = await axios.get(
          `${url}/courses/${courseId}/exercises/${exercise.idexercise}/teacher-exam`,
          {
            headers: { Authorization: `Bearer ${user.access_token}` },
          }
        );
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch teacher exam overview", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [courseId, exercise?.idexercise, user?.access_token]);



 useEffect(() => {
    if (!data?.exercise) return;

    const start = new Date(data.exercise.start_time).getTime();
    const end = new Date(data.exercise.end_time).getTime();

    const totalDuration = end - start;

    const updateTimer = () => {
      const now = Date.now();

      // Näytetään aikaa kokeen alkuun
      const diff = Math.max(0, start - now);

      setRemaining(diff);

      const percentage =
        totalDuration > 0
          ? Math.min(
              100,
              Math.max(0, ((end - now) / totalDuration) * 100)
            )
          : 0;

      setProgress(percentage);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    let reloadTimeout;

    // Koe ei ole vielä alkanut
    if (data.status === "before") {
      const timeUntilStart = start - Date.now();

      if (timeUntilStart > 0) {
        reloadTimeout = setTimeout(() => {
          window.location.reload();
        }, timeUntilStart + 100);
      }
    }

    // Koe on käynnissä
    if (data.status === "running") {
      const timeUntilEnd = end - Date.now();

      if (timeUntilEnd > 0) {
        reloadTimeout = setTimeout(() => {
          window.location.reload();
        }, timeUntilEnd + 100);
      }
    }

    return () => {
      clearInterval(interval);

      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
    };
  }, [data]);



   useEffect(() => {
    if (!data?.exercise) return;

    const serverNow = new Date(data.serverTime).getTime();
    const start = new Date(data.exercise.start_time).getTime();
    const end = new Date(data.exercise.end_time).getTime();

    const offset = Date.now() - serverNow;

    const interval = setInterval(() => {
      const now = Date.now() - offset;

      if (now < start) {
        setCountdownMs(start - now);
        setElapsedMs(0);
      } else if (now >= start && now <= end) {
        setCountdownMs(0);
        setElapsedMs(now - start);
      } else {
        setCountdownMs(0);
        setElapsedMs(end - start);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);


  useEffect(() => {
    if (data?.status !== "ended" ) return;

    const examId = data?.exercise?.idexercise;

    if (!examId) return;

    const confettiKey = `exam-confetti-shown-${examId}`;

    // Onko tämän kokeen konfetti jo näytetty?
    if (sessionStorage.getItem(confettiKey)) {
      return;
    }

    // Merkitään heti näytetyksi
    sessionStorage.setItem(confettiKey, "true");

    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ["#a864fd", "#29cdff", "#78ff44", "	#ff718d", "#fdff6a"];

    const frame = () => {
        // Vasen
        confetti({
          particleCount: 10,
          angle: 60,
          spread: 300,
          startVelocity: 55,
          origin: { x: 0, y: 0.7 },
          colors,
        });

        // Oikea
        confetti({
          particleCount: 10,
          angle: 120,
          spread: 300,
          startVelocity: 55,
          origin: { x: 1, y: 0.7 },
          colors,
        });

        // Keskeltä
        confetti({
          particleCount: 10,
          spread: 300,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.6 },
          colors,
        });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [data?.status]);


  const formatCountdown = (ms) => {
    if (ms <= 0) return "Koe alkaa pian";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}min ${seconds}s`;
  };

  const formatElapsed = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  if (loading || !data?.exercise) {
    return (
      <div className={`coursepage task-overview-page ${isDarkMode ? '' : 'light-theme'}`}>
        <div className="topbar task-overview-topbar">
          <div className="topbar-left">
            <div className="course-title">
              <i
                className="fa-regular fa-circle-left back-icon"
                onClick={() => navigate("/CoursePage/" + courseId, { replace: true })}
              ></i>
              <div>
                <h2 className="course-name task-overview-title">
                  {exercise?.exercise_name || "Koe"}
                </h2>
                <p className="course-description task-overview-subtitle">
                  Ladataan kokeen tietoja...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="exam-overview-section">
          <div className="submission-card">
            <p className="submission-meta">Ladataan...</p>
          </div>
        </div>
      </div>
    );
  }

  const { exercise: ex, status } = data;

  return (
      <div className={`coursepage task-overview-page ${isDarkMode ? '' : 'light-theme'}`}>
      <div className="topbar task-overview-topbar">
        <div className="topbar-left">
          <div className="course-title">
            <i
              className="fa-regular fa-circle-left back-icon"
              onClick={() => navigate(-1)}
            ></i>
            <div>
              <h2 className="course-name task-overview-title">{ex.exercise_name}</h2>
              <p className="course-description task-overview-subtitle">
                {status === "before"
                  ? "Koe ei ole vielä käynnissä"
                  : status === "running"
                  ? "Koe käynnissä"
                  : "Koe päättynyt"}
              </p>
            </div>
          </div>
        </div>

        <div className="task-overview-actions">
          {status === "before" && (
            <button
              className="settings-button"
              type="button"
              title="Muokkaa koetta"
              aria-label="Muokkaa koetta"
              onClick={async () => {
                try {
                  const response = await axios.get(
                    `${url}/courses/${courseId}/exercises/${exercise.idexercise}/details`,
                    { headers: { Authorization: `Bearer ${user.access_token}` } }
                  );

                  console.log("EXAM DETAILS:", response.data);
                  console.log("EXAM TASKS:", response.data?.exercise?.tasks);
                  navigate('/CreateExam', {
                    state: {
                      courseId,
                      weekIndex: response.data?.exercise?.idweek,
                      editMode: true,
                      exercise: {
                        ...response.data.exercise,
                        max_time: response.data.exercise.max_time  
                      },
                      source: 'teacherExam',
                    }
                  });
                } catch (error) {
                  console.error("Failed to fetch full exercise details", error);
                }
              }}
            >
              <i className="fa-solid fa-gear"></i>
            </button>
          )}

          {status === "running" && (
              <div className="exam-timer-box">
                                
                  <CountdownTimer startTime={exercise.start_time} endTime={exercise.end_time}/>
              </div>
              
          )}
        </div>

      </div>


      <div className="divider"></div>

     {status === "before" && (
        <div className="exam-content-wrapper">
          <div className="exam-overview-section">
            <h3>Koe alkaa</h3>
            <p>Countdown kokeen alkuun:</p>
            <div className="countdown-box">
              {formatCountdown(countdownMs)}
            </div>
          </div>
        </div>
      )}

      {status === "running" && (
        <div className="exam-content-wrapper">
          <button
            className="save-btn exam-follow-button"
            type="button"
            onClick={() => setShowReturnsPopup(true)}
          >
            Tarkastele kokeen kulkua
          </button>

          <div className="exam-overview-section">
            <div className="exam-password-box">
              <span className="exam-password">
                {ex.exam_password_student}
              </span>
            </div>

            <p className="small-info-text">
              Anna tämä liittymisavain oppilaille, jotta he voivat liittyä kokeeseen.
            </p>
          </div>
        </div>
      )}

      {status === "ended" && (
        <div className="exam-content-wrapper">
          <button
            className="save-btn exam-follow-button"
            type="button"
            onClick={() =>
              navigate("/TestOverview", {
                state: { courseId, exercise: ex },
              })
            }
          >
            Avaa palautusten näkymä
          </button>

          <div className="exam-overview-section">
            <h3>Koe päättynyt</h3>
            <p className="small-info-text">Voit siirtyä tarkastelemaan ja arvioimaan palautuksia.</p>
          </div>
        </div>
      )}

      
      {showReturnsPopup && (
        <div
          className="exam-confirm-overlay"
          onClick={() => setShowReturnsPopup(false)}
        >
          <div
            className="exam-confirm-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Olethan varma sivuvaihdoksesta?</h2>

            <p>
              Sivulla on tietoa, jonka ei pitäisi näkyä kaikille opiskelijoille.
              Olethan varma, ettei näyttöä heijasteta luokan eteen?
            </p>

            <div className="exam-confirm-actions">
              <button
                type="button"
                className="exam-confirm-back-btn"
                onClick={() => setShowReturnsPopup(false)}
              >
                En, siirry takaisin
              </button>

              <button
                type="button"
                className="exam-confirm-continue-btn"
                onClick={() => {
                  setShowReturnsPopup(false);

                  navigate("/TestOverview", {
                    state: {
                      courseId,
                      exercise: ex,
                    },
                  });
                }}
              >
                Kyllä, siirry kokeen tarkasteluun
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TeacherExamPage;