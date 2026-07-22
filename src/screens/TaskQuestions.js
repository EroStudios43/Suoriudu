import React, { useState, useEffect, useCallback } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";

const url = process.env.REACT_APP_API_URL;

// The function to render all task boxes.
const RenderTask = React.memo(({task, index, answers, setAnswers})  => {
  if (task.tasktype === "essay") {
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          <textarea 
            id={task.idtask} 
            className="form-control essay" 
            value={answers[task.idtask] || ""} 
            onChange={(e) =>
              setAnswers(prev => ({...prev, [task.idtask]: e.target.value
            }))
          }>
          </textarea>
        </div>
        <hr />
      </>
    )
  } else if (task.tasktype === "multiple_choice") {
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          
          
        </div>
        <hr />
      </>
    )
  }
})

function TaskQuestions() {
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
  const [ taskResults, setTaskResults ] = useState([])
  const [ exercisedata, setExercisedata ] = useState({})

  // Variables for student's answers
  const [ answers, setAnswers ] = useState({})

  const fetchUserExerciseAndTaskData = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      return null
    }

    // Check that the other variables are defined
    if (!idcourse || !idexercise) {
      console.log("Variables not set yet")
      return null
    }

    // Get the exercise and task data
    try {
      const response = await axios.get(
        url + "/courses/userExerciseDataAndTasks",
        {
          params: {iduser: user.id, idcourse: idcourse, idexercise: idexercise},
          headers: { Authorization: "Bearer " + user.access_token},
          signal
        }
      )

      console.log(response.data)
      setTasks(response.data.tasks)
      setTaskResults(response.data.answerArray)
      setExercisedata(response.data.exercise)

      // Set the task results to the answer array if previous answers are present
      if(response.data.answerArray.length)
      
      updateToken(response)
      return response.data
      
    } catch (error) {
      console.log("Error fetching exercise data:", error.response?.data || error.message)
      if (error.status === 404) {
        console.log("Course not found. Navigating to home page.")
      }
    }
  }, [user?.id, user?.access_token, idexercise])

  const { data, loading, error } = useFetchData(fetchUserExerciseAndTaskData)

  useEffect(() => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      return;
    }

    // Fallback in case the course id is not set in state
    // Needed in the back-button.
    if (!location.state?.idcourse) {
      // Add fallback code here, not done yet
      console.log("Fetch data manually with id")
    }

  }, [user?.access_token, idexercise])

  const handleSubmit = () => {
    console.log(answers)
  }

  // The star progress bar with a clickable scrollspy.
  const RenderProgressBar = () => {
    const NavLink = ({task, index}) => {
      // Handle click and move the screen to right section
      const handleClick = (e) => {
        e.preventDefault()
        const element = document.getElementById(`scrollspy-section${index}`)
        if (element) {
          element?.scrollIntoView({ behavior: "smooth", block: "start"})
        }
      }

      // Get task results for the progress bar and check if the corresponding task is done
      const isDone = taskResults?.some(
        (taskResult) => taskResult.idtask === task.idtask
      )


      // Return the nav item (star) for the task
      return (<li className="nav-item">
        <i className={`fa-regular fa-star progress-star me-1 ${isDone ? "complete" : ""}`} onClick={handleClick}></i>
      </li>)
    }
    return(
      <div id="starProgression" className="d-inline">
        <ul className="nav flex-wrap">
        {tasks.map((task, index) => (
          <NavLink task={task} index={index}/>
        ))}
    </ul>
      </div>
    )
  }

  if (user.role === "student" || user.role === "teacher") {
    return (
      <div className="container-fluid min-vh-100 exercises-container">
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
                <div className="col-md-2">
                   <h1 className="display-4">{exercisedata?.exercise_name}</h1>
                </div>
                <div className="col-md-8" />
                <div className="col-md-2 scrollspy-example" data-bs-spy="scroll" data-bs-target="#starProgression" data-bs-offset="0" tabIndex={0}>
                 
                  <RenderProgressBar />
                </div>
              </div>
              <div className="row">
                <form noValidate>
                  {tasks.map((task, index) => {
                    return (
                      <RenderTask task={task} index={index} key={task.idtask} answers={answers} setAnswers={setAnswers} />
                    )
                  })}

                  <button type="button" className="btn btn-primary" onClick={handleSubmit}>PRINT</button>
                </form>
              </div>
            </div>
            <div className="col-md-1" />
          </div>
          
          
      </div>
    );
  }
  
}

export default TaskQuestions;