import React, { useState, useEffect, useCallback } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";

import { useTheme } from "../context/ThemeContext.js";

import DrawingReview from "../components/DrawingReview.js";


const url = process.env.REACT_APP_API_URL

// The function to render all task boxes.
const RenderTask = React.memo(({task, index, correct_answer, student_answer})  => {
  if (task.tasktype === "essay") {
    const studentAnswer = student_answer
    return (
      <>
        <div id={`scrollspy-section${task.idtask}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          <textarea 
            id={task.idtask} 
            className="form-control essay" 
            value={studentAnswer || ""} 
            readOnly={true}
            />
          <span className="text-muted text-end d-block"><small>{student_answer?.length || 0} merkkiä</small></span>
        </div>
        <hr />
      </>
    )
  } else if (task.tasktype === "drawing") {
    return (
      <>
        <div id={`scrollspy-section${task.idtask}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1} (Piirros)</b></p>
          <p>{task.question}</p>
          
          {student_answer ? (
            <DrawingReview key={student_answer} json={student_answer} />
          ) : (
            <p className="text-muted fs-6"><i>Opiskelija ei jättänyt piirrosta.</i></p>
          )}
        </div>
        <hr />
      </>
    );
  }
  
  else if (task.tasktype === "multiple_choice") {
    const studentAnswer = JSON.parse(student_answer).sort()
    const correctAnswer = JSON.parse(correct_answer).correctAnswers.sort()
    const taskOptions = JSON.parse(correct_answer).options.sort()
    return (
      <>
        <div id={`scrollspy-section${task.idtask}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          {taskOptions.map((option, index2) => {
            let correctStyle = ""
            if (student_answer?.includes(index2) && correct_answer?.includes(index2)) {
              correctStyle = "bg-success-subtle correct"
            } 
            else if (!student_answer?.includes(index2) && correct_answer?.includes(index2)) {
              correctStyle = "bg-warning-subtle partiallycorrect"
            }
           else if (student_answer?.includes(index2) && !correct_answer?.includes(index2)) {
              correctStyle = "bg-danger-subtle incorrect"
            }

            return(
              <div key={index2} className={`form-check student-multiple-choice-answer d-flex justify-content-between align-items-start p-2 ${correctStyle}`}>
                <label className="form-check-label" htmlFor={`${task.idtask}${index2}`} style={{flex: 1}}>
                  {option}
                </label>
                <input 
                  className="mt-1 form-check-input position-static" 
                  checked={(student_answer?.includes(index2)/* || correct_answer?.includes(index2)*/) || false}
                  type="checkbox" 
                  id={`${task.idtask}${index2}`}
                  readOnly={true}
                />
              </div>
            )
          })}
          
        </div>
        <hr />
      </>
    )
  } else if (task.tasktype === "single_choice") {
    const studentAnswer = JSON.parse(student_answer)
    const correctAnswer = JSON.parse(correct_answer).correctAnswers.sort()
    const taskOptions = JSON.parse(correct_answer).options.sort()
    return (
      <>
        <div id={`scrollspy-section${task.idtask}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          {taskOptions.map((option, index2) => {
            let correctStyle = ""
            if (student_answer?.includes(index2) && correct_answer?.includes(index2)) {
              correctStyle = "bg-success-subtle correct"
            } else if (student_answer?.includes(index2) && !correct_answer?.includes(index2)) {
              correctStyle = "bg-danger-subtle incorrect"
            }
            return(
              <div key={index2} className={`form-check student-single-choice-answer d-flex justify-content-between align-items-start p-2 ${correctStyle}`}>
                <label className="form-check-label" htmlFor={`${task.idtask}${index2}`} style={{flex: 1}}>
                  {option}
                </label>
                <input 
                  className="mt-1 form-check-input" 
                  name={`task-${task.idtask}`}
                  checked={studentAnswer === index2 ? true : false}
                  readOnly={true}
                  type="radio" 
                  id={`${task.idtask}${index2}`}
                />
              </div>
            )
          })}
          
        </div>
        <hr />
      </>
    )
  }
})

function TaskResults() {
  // Variables for navigation and getting some values from previous page
  const navigate = useNavigate();
  const location = useLocation();
  
  // Variables from the previous page and user from useUser
  const { idexercise } = useParams()
  const { user, updateToken } = useUser()
  const [ idcourse, setIdCourse ] = useState(location.state?.idcourse || "")
  const [ idweek, setIdWeek ] = useState(location.state?.idweek)

  // Data for tasks and exercise
  const [ tasks, setTasks ] = useState([])
  const [ exercisedata, setExercisedata ] = useState({})
  
  // Variable for currently chosen attempt
  const [chosenAttemptId, setChosenAttemptId ] = useState(null)

  const { isDarkMode, toggleTheme } = useTheme();

  // Function for fetching all the user's previous attempts
  const fetchCompletedExerciseAndTaskData = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("User data or token missing")
      return null
    }

    // Check that the other needed variables are defined
    if (!idexercise) {
      console.log("Needed variables missing from request")
      return null
    }

    // Create the request to backend
    try {
      const response = await axios.get(
        url + "/courses/completedExercises",
        {
          params: {idexercise: idexercise},
          headers: { Authorization: "Bearer " + user.access_token},
          signal
        }
      )

      console.log(response.data)

      setExercisedata(response.data.exercise)


      const results = response.data.exercise?.exerciseresults;
      if (results && results.length > 0) {
        // Muutos: Otetaan taulukon viimmeinen alkio (uusin yritys) ensimmäisen sijaan
        const latestAttempt = results[results.length - 1];
        setChosenAttemptId(latestAttempt.idexerciseresult);
      }
      updateToken(response)
      return response.data
    } catch (error) {
      console.log("Error fetching exercise results: ", error.response?.data || error.message)
      if (error.status === 404) {
        console.log("Course not found. Navigating to home page.")
      }
    } 
  }, [user?.access_token, idexercise])

  const {data, loading, error } = useFetchData(fetchCompletedExerciseAndTaskData)

  // The star progress bar with a clickable scrollspy.
  const RenderProgressBar = () => {
    const NavLink = ({task, index}) => {
      // Handle click and move the screen to right section
      const handleClick = (e) => {
        e.preventDefault()
        const element = document.getElementById(`scrollspy-section${task.idtask}`)
        if (element) {
          element?.scrollIntoView({ behavior: "smooth", block: "start"})
        }
      }

      // Helper function for checking if the multiple_choice or single_choice answers match
      const answersMatch = (studentAnswer, correctAnswer) => {
        try {
          const student = JSON.parse(studentAnswer)
          const correct = JSON.parse(correctAnswer).correctAnswers

          // Map and sort the arrays. If there are more than one answer, normalize by sorting.
          const studentNormalized = Array.isArray(student) 
            ? student.map(Number).sort((a, b) => a - b)
            : [Number(student)]

          const correctNormalized = [...correct].map(Number).sort((a, b) => a - b)
          console.log(studentNormalized, correctNormalized)

          return JSON.stringify(studentNormalized) === JSON.stringify(correctNormalized)
        } catch (error) {
          console.log("Something went wrong comparing answers:", error)
          return false
        }
      }

      let progressClass = "text-secondary"

      // Check and compare if the task is a single-choice or a multiple-choice
      // If so, calculate what color the star should be
      if ((task.tasktype === "single_choice" || task.tasktype === "multiple_choice")) {
        // Compare the student's answer to correct answer
        if (task.student_answer === null) {
          progressClass = "text-secondary"
        } else {
          progressClass = answersMatch(task.student_answer, task.correct_answer) ? "text-success" : "text-danger"
        }
      } else {
        // If task has to be evaluated by teacher and has not been evaluated yet, set to gray
        if ((task.tasktype === "essay" || task.tasktype === "drawing" || task.tasktype === "coding") && task.student_points === null) {
          progressClass = "text-secondary"
        } else if (task.student_points !== null) {
        // If task has points set / been evaluated, check if they are full
          const student_points = task.student_points
          const full_points = task.full_points != null ? Number(task.full_points) : null

          if (student_points === 0) {
            progressClass = "text-danger"
          } else if (full_points != null && student_points === full_points) {
            progressClass = "text-success"
          } else if (student_points > 0) {
            progressClass = "text-warning"
          }
        }
      }


      // Return the nav item (star) for the task
      return (<li className="nav-item">
        <i className={`fa-regular fa-star progress-star me-1 ${progressClass}`} onClick={handleClick}></i>
      </li>)
    }
    return(
      <div id="starProgression" className="d-inline">
        <ul className="nav flex-wrap">
        {exercisedata.exerciseresults
          ?.find(er => er.idexerciseresult === chosenAttemptId)
          ?.tasks
          ?.map((task, index) => (
            <NavLink
              key={task.idtask}
              task={task}
              index={index}
            />
          ))
        }
    </ul>
      </div>
    )
  }

  if (user.role === "student" || user.role === "teacher") {
    return (
      <div className={`container-fluid min-vh-100 exercises-container ${isDarkMode ? '' : 'light-theme'}`}>
         <div className="row">
            <div className="col-md-1" />
            { /* White box for page content */}
            <div className="col-md-10 rounded-4 p-4 allTasksBox">
              <div className="row">
                <div className="col d-inline">
                  <i className="fa-regular fa-circle-left back-icon-light d-inline" onClick={e => navigate(`/WeeksExercises/${location.state.idweek}`, {state: {idcourse: idcourse}})}></i>
                </div>
              </div>
              <div className="row">
                <div className="col-md-4">
                   <h1 className="display-4">{exercisedata?.exercise_name}</h1>
                </div>
                <div className="col-md-6" />
                <div className="col-md-2 scrollspy-example" data-bs-spy="scroll" data-bs-target="#starProgression" data-bs-offset="0" tabIndex={0}>
                  <RenderProgressBar />
                </div>
              </div>
              <div className="row">
                <select className="form-select" value={chosenAttemptId} onChange={(e) => setChosenAttemptId(Number(e.target.value))}>
                  {
                    exercisedata.exerciseresults?.map((attempt, index) => (
                      <option key={attempt.idexerciseresult} value={attempt.idexerciseresult}>
                        {new Date(attempt.starting_time).toLocaleString("fi-FI", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </option>
                    ))
                  }
                </select>
                {exercisedata.exerciseresults
                  ?.find(
                    attempt => attempt.idexerciseresult === Number(chosenAttemptId)
                  )
                  ?.tasks
                  ?.map((task, index) => (
                    <RenderTask
                      task={task}
                      index={index}
                      key={task.idtask}
                      correct_answer={task.correct_answer}
                      student_answer={task.student_answer}
                    />
                  ))
                }
              </div>
            </div>
            <div className="col-md-1" />
          </div>
      </div>
    )
  }
}

export default TaskResults;