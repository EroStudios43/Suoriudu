import React, { useState, useEffect, useCallback } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import useFetchData from "../hooks/fetchHookWithNavState.js";
import axios from "axios";

import { useTheme } from "../context/ThemeContext.js";


const url = process.env.REACT_APP_API_URL;

function WeeksExercises() {
  // Variables for navigation and getting variables for the specific week
  const navigate = useNavigate();
  const location = useLocation();

  // Variables from the previous page, as well as user from useUser
  const { idweek } = useParams()
  const { user, updateToken } = useUser();
  const [ idcourse, setIdCourse ] = useState(location.state?.idcourse || "")
  const [ week, setWeek ] = useState(location.state?.week || {})
  const [ studentExerciseResults, setStudentExerciseResults ] = useState(location.state?.exerciseresults || [])

  // Task data fetched from database
  const [ tasks, setTasks ] = useState([])
  const [ taskResults, setTaskResults ] = useState([])

  // Variable for opening and closing the exercise boxes
  const [openBoxes, setOpenBoxes] = useState({})

  const { isDarkMode, toggleTheme } = useTheme();

  // Fetch required data from database
  // -> Get week data in case the object didn't get passed through the state
  // -> Get course id for navigation if user didn't go to the page trough the navigation itself
  // -> Get task information, since it's not been fetched before

  const fetchWeekExercises = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet")
      return null
    }

    // Check that the other variables are defined
    if (!idcourse || !week) {
      console.log("Variables not set yet")
      return null
    }


    try {
      const response = await axios.get(
        url + "/courses/weekExercises",
        {
          params: {iduser: user.id, idcourse: idcourse, idweek: idweek},
          headers: {Authorization: "Bearer " + user.access_token},
          signal
        }
      )
      console.log("WeekExercises: ", response.data)
      setWeek({...week, exercises: response.data.exercises, exerciseresults: response.data.exerciseresults})
      setStudentExerciseResults(response.data.exerciseresults)
    } catch (error) {
      console.log("Error fetching exercise data:", error.response?.data || error.message)
      if (error.status === 404) {
        console.log("Course not found. Navigating to home page.")
      }
    }
  }, [user?.access_token, idweek])

  const { data, loading, error } = useFetchData(fetchWeekExercises)

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

    console.log(week)

    // Get the tasks for all of the weeks exercises.
    const getWeekTasks = async () => {
      
      try {
      const response = await axios.get(
        url + "/courses/userTasksAndAnswersWeek",
        {
          params: {iduser: user.id, idcourse: idcourse, idweek: idweek},
          headers: { Authorization: "Bearer " + user.access_token }
        }
      );
      console.log("WeekTasks: ", response.data)
      setTasks(response.data.tasks)
      setTaskResults(response.data.answerArray)

      // Update token
      updateToken(response)

      } catch (error) {
        console.error("Error fetching week data:", error.response?.data || error.message)
        if (error.status === 404) {
          console.log("Course not found. Navigating to home page.")
        }
      }
    }
    if (user.role === "student" || user.role === "teacher") {
      getWeekTasks()
    }
  }, [idweek, user?.access_token])

  // Function for opening and closing the exercise boxes. 
  // The object with the id of the box get's either collapsed or opened.
  const toggleBox = (id) => {
    setOpenBoxes(prev => ({...prev, [id]: !prev[id]}))
  }

  if (user.role === "student" || user.role === "teacher"){
    return (
      <div className={`container-fluid coursepage d-flex flex-column min-vh-100 exercises-container ${isDarkMode ? '' : 'light-theme'}`}>
          { /* Topbar */}
          <div className="d-flex flex">
            <i className="fa-regular fa-circle-left back-icon" onClick={e => navigate(`/CoursePage/${location.state?.idcourse}`)}></i>
            <h1 className="ms-5">{week?.week_name}</h1>
          </div>
          { /* Page content */}
          <div className="row">
            { /* Empty div for centering purposes. */}
            <div className="col-lg-1">

            </div>
            { /* Boxes for different exercises */}
            <div className="container col-lg-10">
              <br />
              <div className="row text-start">
                <h3>Viikon tehtäväpaketit</h3>
                {week?.exercises?.map((exercise, index) => {
                  if (exercise.exercise_type === "task") {
                  return (
                    <div className={`col-xl-4 col-lg-6 p-2`} key={exercise.idexercise}>
                      <div className={`course-color-${index % 4} p-3 rounded-3 exercise-box`} onClick={() => toggleBox(exercise.idexercise)}>
                        <div className="row">
                          <div className="col-sm-6">
                            <p className="mb-0">{exercise.exercise_name}</p>
                          </div>
                          <div className="col-sm-6 text-end">
                              <p className="mb-0">
                                {(() => {
                                  // Get all the task ids from the taskresults
                                  const taskResultTaskIds = new Set(
                                    taskResults?.map(t => t.idtask)
                                  )

                                  // Get all tasks that are in this exercise
                                  const exerciseTasks = tasks?.filter(t => t.idexercise === exercise.idexercise) || []

                                  // Get all task results for this exercise
                                  const exerciseTaskResults = taskResults?.filter(tr => exerciseTasks.some(t => t.idtask === tr.idtask)) || []

                                  // Get the done tasks for this exercise
                                  const doneTasks = exerciseTasks?.filter(task =>exerciseTaskResults.some(tr => tr.idtask === task.idtask && tr.answer !== null)) || []

                                  // Get the possible exerciseresult for this exercise
                                  const exerciseResult = studentExerciseResults?.find(ex => ex.idexercise === exercise.idexercise)

                                  if (exerciseResult?.complete_time === null || !exerciseResult || typeof exerciseResult === "undefined") {
                                    // Return the correct number of tasks done
                                    return (doneTasks?.length + "/" + exerciseTasks?.length + " tehtävää suoritettu")
                                  } else {
                                    // Get the full points for this exercise
                                    const fullPoints = exerciseTasks?.reduce((sum, task) => sum + Number(task.full_points || 0), 0)

                                    // Check if all tasks are unrated
                                    const allUnrated = exerciseTaskResults?.every(
                                      taskResult => taskResult.points == null
                                    )

                                    if (allUnrated) {
                                      return ("Ei arvioitu / " + fullPoints + " pistettä")
                                    }

                                    // Get the points earned for this exercise
                                    const earnedPoints = exerciseTaskResults?.reduce((sum, taskResult) => sum + Number(taskResult.points || 0), 0)
                                    
                                    // Return the correct number of points
                                    return (earnedPoints + "/" + fullPoints + " pistettä")
                                  } 
                                })()}
                                {
                                  studentExerciseResults?.some(ex =>
                                    ex.idexercise === exercise.idexercise &&
                                    ex.complete_time != null
                                  ) ? (
                                    <i className="fa-regular fa-circle-check ps-3 pe-3 pt-1"></i>
                                  ) : new Date(exercise.end_time) < new Date() ? (
                                    <i
                                      className="fa-solid fa-circle-exclamation ps-3 pe-3 pt-1"
                                      style={{ color: "#00F3FB" }}
                                    ></i>
                                  ) : (
                                    <i className="fa-regular fa-circle ps-3 pe-3 pt-1"></i>
                                  )
                                }
                              </p>
                            </div>
                          </div>
                        <div className={`collapse ${openBoxes[exercise.idexercise] ? "show" : ""} mt-3`}>
                          <hr/>
                          <div className="row">
                            <h5>Tehtäväpaketin kuvaus</h5>
                            <p className="mb-0">{exercise.exercise_description}</p>
                          </div>
                          
                          <br />
                          <hr />
                          
                          <div className="row">
                            <div className="col-sm-6">
                              <h5>Avautuu:</h5>
                              <p>
                                {new Date(exercise.start_time).toLocaleString("fi-FI", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="col-sm-6">
                              <h5>Sulkeutuu:</h5>
                                <p>
                                  {new Date(exercise.end_time).toLocaleString("fi-FI", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                            </div>
                            {exercise.allow_late_submissions ? 
                              <p><small>Myöhästyneet palautukset sallittu</small></p>
                              : 
                              <p><small>Myöhästyneitä palautuksia ei sallita</small></p>
                            }
                            <div className="d-flex justify-content-end gap-3">
                              {
                                studentExerciseResults?.some(ex => 
                                  ex.idexercise === exercise.idexercise &&
                                  ex.complete_time != null
                                ) ? (
                                  <>
                                    {(new Date(exercise.end_time) > new Date() || exercise.allow_late_submissions) ? 
                                      <button className="btn to-exercise-btn" onClick={() => navigate(`/TaskQuestions/${exercise.idexercise}`, {state: { idweek: idweek, idcourse: idcourse }})}>Yritä uudelleen</button>
                                      : <></>
                                    }
                                    <button className="btn to-exercise-btn" onClick={() => navigate(`/TaskResults/${exercise.idexercise}`, {state: {idweek: idweek, idcourse: idcourse}})}>Tarkastele tuloksia</button>
                                  </>
                                ) :
                                (
                                  <>
                                    {(new Date(exercise.end_time) > new Date() || exercise.allow_late_submissions) ?
                                      <button className="btn to-exercise-btn" onClick={() => navigate(`/TaskQuestions/${exercise.idexercise}`, {state: {idweek: idweek, idcourse: idcourse}})}>Suorita tehtävä</button>
                                      : <></>
                                    }
                                  </>
                                )
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                })}

                </div>
                <br />
                <div className="row text-start">
                <h3>Viikon Kokeet</h3>
                {week?.exercises?.map((exercise, index) => {
                  if (exercise.exercise_type === "exam") {
                  return (
                    <div className={`col-xl-4 col-lg-6 p-2`} key={exercise.idexercise}>
                      <div className={`course-color-${index % 4} p-3 rounded-3 exercise-box`} onClick={() => toggleBox(exercise.idexercise)}>
                        <div className="row">
                          <div className="col-sm-6">
                            <p className="mb-0">{exercise.exercise_name}</p>
                          </div>
                          <div className="col-sm-6 text-end">
                              <p className="mb-0">
                                {(() => {
                                  // Get all the task ids from the taskresults
                                  const taskResultTaskIds = new Set(
                                    taskResults?.map(t => t.idtask)
                                  )

                                  // Get all tasks that are in this exercise
                                  const exerciseTasks = tasks?.filter(t => t.idexercise === exercise.idexercise) || []

                                  // Get all task results for this exercise
                                  const exerciseTaskResults = taskResults?.filter(tr => exerciseTasks.some(t => t.idtask === tr.idtask)) || []

                                  // Get the done tasks for this exercise
                                  const doneTasks = exerciseTasks?.filter(task =>exerciseTaskResults.some(tr => tr.idtask === task.idtask && tr.answer !== null)) || []

                                  // Get the possible exerciseresult for this exercise
                                  const exerciseResult = studentExerciseResults?.find(ex => ex.idexercise === exercise.idexercise)

                                  if (exerciseResult?.complete_time === null || !exerciseResult || typeof exerciseResult === "undefined") {
                                    // Return the correct number of tasks done
                                    return (doneTasks?.length + "/" + exerciseTasks?.length + " tehtävää suoritettu")
                                  } else {
                                    // Get the full points for this exercise
                                    const fullPoints = exerciseTasks?.reduce((sum, task) => sum + Number(task.full_points || 0), 0)

                                    // Check if all tasks are unrated
                                    const allUnrated = exerciseTaskResults?.every(
                                      taskResult => taskResult.points == null
                                    )

                                    if (allUnrated) {
                                      return ("Ei arvioitu / " + fullPoints + " pistettä")
                                    }

                                    // Get the points earned for this exercise
                                    const earnedPoints = exerciseTaskResults?.reduce((sum, taskResult) => sum + Number(taskResult.points || 0), 0)
                                    
                                    // Return the correct number of points
                                    return (earnedPoints + "/" + fullPoints + " pistettä")
                                  }
                                  
                                })()}
                                {
                                  studentExerciseResults?.some(ex =>
                                    ex.idexercise === exercise.idexercise &&
                                    ex.complete_time != null
                                  ) ? (
                                    <i className="fa-regular fa-circle-check ps-3 pe-3 pt-1"></i>
                                  ) : new Date(exercise.end_time) < new Date() ? (
                                    <i
                                      className="fa-solid fa-circle-exclamation ps-3 pe-3 pt-1"
                                      style={{ color: "#00F3FB" }}
                                    ></i>
                                  ) : (
                                    <i className="fa-regular fa-circle ps-3 pe-3 pt-1"></i>
                                  )
                                }
                              </p>
                            </div>
                          </div>
                        <div className={`collapse ${openBoxes[exercise.idexercise] ? "show" : ""} mt-3`}>
                          <hr/>
                          <div className="row">
                            <h5>Kokeen kuvaus</h5>
                            <p className="mb-0">{exercise.exercise_description}</p>
                          </div>
                          
                          <br />
                          <hr />
                          
                          <div className="row">
                            <div className="col-sm-6">
                              <h5>Avautuu:</h5>
                              <p>
                                {new Date(exercise.start_time).toLocaleString("fi-FI", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="col-sm-6">
                              <h5>Sulkeutuu:</h5>
                                <p>
                                  {new Date(exercise.end_time).toLocaleString("fi-FI", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                            </div>
                            {exercise.allow_late_submissions ? 
                              <p><small>Myöhästyneet palautukset sallittu</small></p>
                              : 
                              <p><small>Myöhästyneitä palautuksia ei sallita</small></p>
                            }
                            <div className="row m-0 p-0">
                              {
                                studentExerciseResults?.some(ex => 
                                  ex.idexercise === exercise.idexercise &&
                                  ex.complete_time != null
                                ) ? (
                                  <div className="text-end m-0">
                                    <button className="btn to-exercise-btn" onClick={() => navigate(`/TaskResults/${exercise.idexercise}`, {state: {idweek: idweek, idcourse: idcourse}})}>Tarkastele tuloksia</button>
                                  </div>
                                ) :
                                (
                                  <>
                                  {(new Date(exercise.end_time) > new Date() || exercise.allow_late_submissions) ? 
                                    <div className="text-end">
                                      <button className="btn to-exercise-btn" onClick={() => navigate(`/ExamLobby/${exercise.idexercise}`, {state: {idweek: idweek, idcourse: idcourse}})}>Suorita koe</button>
                                    </div> : <></>
                                    }
                                  </>
                                )
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                })}
                {week.exercises?.length < 1 && <p>Viikolla ei ole tehtäviä.</p>}
              </div>
            </div>
            { /* Empty div for centering purposes. */}
            <div className="col-lg-2">

            </div>
          </div>
      </div>
    );
  }
  
}

export default WeeksExercises;