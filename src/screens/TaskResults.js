import React, { useState, useEffect, useCallback, useRef } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

import { useTheme } from "../context/ThemeContext.js";

import DrawingReview from "../components/DrawingReview.js";


const url = process.env.REACT_APP_API_URL

// The function to render all task boxes.
const RenderTask = React.memo(({task, index, correct_answer, student_answer, setShowCommentBox, setChosenTask, previousComments, uid})  => {
  if (task.tasktype === "drawing") {
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
  } else if (task.tasktype === "essay") {
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
          <br />
          <div className="chat-text d-inline" onClick={(e) => {setShowCommentBox(true); setChosenTask(task.idtask)}}>Ongelmia tehtävässä?<i className="fa-regular fa-message chat-icon"></i>
            {(() => {
              if (previousComments[previousComments.length - 1]?.idcommentor !== uid && previousComments[previousComments.length - 1]?.comment_read === 0) {
                return (<span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: "#f4c542",
                              display: "inline-block",
                              boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                            }}
                          ></span>)
              } else {
                return (<span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: "#d9d9d9",
                              display: "inline-block",
                              boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                            }}
                          ></span>)
              }
            })()}
          </div>
          <p className="float-end ms-3">{task.student_points || "Ei arvioitu"} / {task.full_points}p</p>
          <span className="text-muted text-end d-block"><small>{student_answer?.length || 0} merkkiä</small></span>
        </div>
        <hr />
      </>
    )

  } else if (task.tasktype === "coding") {
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          <CodeMirror 
            value={student_answer} 
            extensions={[javascript()]} 
            readOnly={true}
          />
          
          <br />
          <p className="float-end ms-3">{task.student_points || "Ei arvioitu"} / {task.full_points}p</p>
        </div>
        <br />
        <div className="chat-text inline" onClick={(e) => {setShowCommentBox(true); setChosenTask(task.idtask)}}>Ongelmia tehtävässä?<i className="fa-regular fa-message chat-icon"></i>
          {(() => {
            if (previousComments[previousComments.length - 1]?.idcommentor !== uid && previousComments[previousComments.length - 1]?.comment_read === 0) {
              return (<span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: "#f4c542",
                            display: "inline-block",
                            boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                          }}
                        ></span>)
            } else {
              return (<span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: "#d9d9d9",
                            display: "inline-block",
                            boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                          }}
                        ></span>)
            }
          })()}
        </div>
        <hr />
      </>
    )
  } else if (task.tasktype === "multiple_choice") {
    const studentAnswer = JSON.parse(student_answer).sort()
    const correctAnswer = JSON.parse(correct_answer).correctAnswers.sort()
    const taskOptions = JSON.parse(correct_answer).options.sort()
    let automaticPoints = 0
    return (
      <>
        <div id={`scrollspy-section${task.idtask}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          {taskOptions.map((option, index2) => {
            let correctStyle = ""
            
            if (student_answer?.includes(index2) && correct_answer?.includes(index2)) {
              correctStyle = "bg-success-subtle correct"
              automaticPoints += (1 / correctAnswer.length) * task.full_points
            } 
            else if (!student_answer?.includes(index2) && correct_answer?.includes(index2)) {
              correctStyle = "bg-warning-subtle partiallycorrect"
            }
            else if (student_answer?.includes(index2) && !correct_answer?.includes(index2)) {
              correctStyle = "bg-danger-subtle incorrect"
              if (automaticPoints > 0) {
                automaticPoints -= ((1 / correctAnswer.length) * task.full_points / 2)
              }
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
          <br />
          <div className="chat-text d-inline" onClick={(e) => {setShowCommentBox(true); setChosenTask(task.idtask)}}>Ongelmia tehtävässä?<i className="fa-regular fa-message chat-icon"></i>
            {(() => {
              if (previousComments[previousComments.length - 1]?.idcommentor !== uid && previousComments[previousComments.length - 1]?.comment_read === 0) {
                return (<span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: "#f4c542",
                              display: "inline-block",
                              boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                            }}
                          ></span>)
              } else {
                return (<span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: "#d9d9d9",
                              display: "inline-block",
                              boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                            }}
                          ></span>)
              }
            })()}
          </div>
          <p className="float-end">{task.student_points || automaticPoints } / {task.full_points}p</p>
        </div>
        <hr />
      </>
    )
  } else if (task.tasktype === "single_choice") {
    const studentAnswer = JSON.parse(student_answer)
    const correctAnswer = JSON.parse(correct_answer).correctAnswers.sort()[0]
    const taskOptions = JSON.parse(correct_answer).options.sort()
    let automaticPoints = 0
    
    return (
      <>
        <div id={`scrollspy-section${task.idtask}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          {taskOptions.map((option, index2) => {
            let correctStyle = ""
            if (studentAnswer === index2 && correctAnswer === index2) {
              correctStyle = "bg-success-subtle correct"
              automaticPoints += Number(task.full_points)
            } else if (studentAnswer === index2 && correctAnswer !== index2) {
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
          <br />
          <div className="chat-text d-inline" onClick={(e) => {setShowCommentBox(true); setChosenTask(task.idtask)}}>Ongelmia tehtävässä?<i className="fa-regular fa-message chat-icon"></i>
            {(() => {
              if (previousComments[previousComments.length - 1]?.idcommentor !== uid && previousComments[previousComments.length - 1]?.comment_read === 0) {
                return (<span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: "#f4c542",
                              display: "inline-block",
                              boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                            }}
                          ></span>)
              } else {
                return (<span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: "#d9d9d9",
                              display: "inline-block",
                              boxShadow: task.hasQuestions ? "0 0 0 3px rgba(244,197,66,0.15)" : "none",
                            }}
                          ></span>)
              }
            })()}
          </div>
          <p className="float-end">{task.student_points || automaticPoints } / {task.full_points}p</p>
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
  // Variable for the help / comment box
  const [ showCommentBox, setShowCommentBox ] = useState(false)
  const [ showNewQuestionBox, setShowNewQuestionBox ] = useState(false)
  const [ visibleTooltip, setVisibleTooltip ] = useState("")
  const [ previousComments, setPreviousComments ] = useState([])
  const [ newStudentComment, setNewStudentComment ] = useState({question: "", public_question: false, anonymous_question: false})
  const [ newCommentErrors, setNewCommentErrors ] = useState([])
  const [ chosenTask, setChosenTask ] = useState("")
  const commentContainerRef = useRef(null)

  // Function for fetching all the user's previous attempts
  const fetchCompletedExerciseAndTaskData = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("User data or token missing")
      navigate("/home")
      return null
    }

    // Check that the other needed variables are defined
    if (!idexercise) {
      console.log("Needed variables missing from request")
      navigate("/home")
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
        navigate("/home")
      }
    } 
  }, [user?.access_token, idexercise])

  const {data, loading, error } = useFetchData(fetchCompletedExerciseAndTaskData)

  // Function for fetching comment data
  const fetchCommentData  = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("User data or token missing")
      return null
    }

    // Check that the other variables are defined
    if (!idcourse || !idexercise) {
      console.log("Variables not set yet")
      return null
    }

    // Create the request to the backend
    try {
      const response = await axios.get(
        url + "/courses/getUserExerciseComments",
        {
          params: {idexercise: idexercise, idcourse: idcourse},
          headers: {Authorization: "Bearer " + user.access_token},
          signal
        }
      )

      console.log(response.data)
      setPreviousComments(response.data.comments)
    } catch (error) {
      console.log("Error fetching comments: ", error.response?.data, error.message)
    }
  }, [user?.access_token, idexercise])

  const {data2, loading2, error2 } = useFetchData(fetchCommentData)

  // UseEffect to automatically scroll the comment box to the bottom
  useEffect(() => {
    if (commentContainerRef.current) {
        commentContainerRef.current.scrollTo({
          top: commentContainerRef.current.scrollHeight,
          behavior: "smooth"
        })
      }
  }, [previousComments, showCommentBox])

  const handleCommentSumbit = async () => {
    try {
      console.log("Submitting comment")
      console.log(newStudentComment)
      console.log(chosenAttemptId)

      setNewCommentErrors([])
      const tempComment = {}
      const tempErrors = []

      // Check that user has access token
      if (!user || !user.access_token) {
        console.log("No user or token yet");
        return;
      } else {
        tempComment.idcommentor = user.id
      }

      // Check that idexercise and idcourse are valid
      // Check that the other variables are defined
      if (!idcourse || !idexercise) {
        console.log("Idexercise or idcourse aren't valid")
        return 
      } else {
        tempComment.idcourse = idcourse
        tempComment.idexercise = idexercise
      }

      // Check that idexerciseresult is not null
      if (!chosenAttemptId) {
        console.log("Chosen attempt id can't be null")
        return
      } else {
        tempComment.idexerciseresult = chosenAttemptId
      }

      // Check that chosen task id is not null
      if (!chosenTask) {
        console.log("No chosen task")
        return
      } else {
        tempComment.idtask = chosenTask
      }

      // Check that user has filled the question itself
      if (newStudentComment.question.length <= 0) {
        console.log("Question cannot be empty.")
        tempErrors.push("Kysymys ei voi olla tyhjä.")
        setNewCommentErrors(prev => [...prev, "Kysymys ei voi olla tyhjä."])
      }

      // Check that the answer is over 15 characters
      if (newStudentComment.question.length < 15 && newStudentComment.question.length !== 0) {
        console.log("Question must be 15 characters or more")
        tempErrors.push("Kysymyksen tulee olla vähintään 15 merkkiä pitkä.")
        setNewCommentErrors(prev => [...prev, "Kysymyksen tulee olla vähintään 15 merkkiä pitkä."])
      }
      

      console.log(newCommentErrors)

      if (tempErrors.length !== 0) {
        return
      }

      // If no errors, form the rest of the object and submit the comment
      tempComment.question = newStudentComment.question
      tempComment.public_question = newStudentComment.public_question
      tempComment.anonymous_question = newStudentComment.anonymous_question

      console.log(tempComment)

      const res = await axios.post(url + "/courses/insertTaskComment/student", tempComment, {headers: {Authorization: "Bearer " + user.access_token}})
      console.log("Comment submitted", res.data)
      setNewCommentErrors([])
      setNewStudentComment({})

      // Bring the user back to comment page
      setShowCommentBox(true)
      setShowNewQuestionBox(false)
      
      // Set tempcomment question -> tempcomment comment
      tempComment.comment = tempComment.question
      setPreviousComments(prev => [...prev, tempComment])
    } catch (error) {
      console.log("Error submitting comment:", error.response?.data || error.message)
    }
  }

  const handleCommentSetRead = async (idtaskcomments) => {
    try {
      // Check that user has access token
      if (!user || !user.access_token) {
        console.log("No user or token yet");
        return
      }

      if (!idtaskcomments) {
        console.log("No task comment id provided.")
        return
      }

      if (!idcourse) {
        console.log("Idcourse not set")
        return
      }

      const res = await axios.put(url + "/courses/updateCommentAsRead", {idtaskcomments: idtaskcomments, idcourse: idcourse}, {headers: {Authorization: "Bearer " + user.access_token}})
      
      // Update the read-value of the variable in frontend.
      setPreviousComments(prev => prev.map(comment => comment.idtaskcomments === idtaskcomments ? {...comment, comment_read: 1} : comment))

    } catch (error) {
      console.log("Error updating comment read status:", error.response?.data || error.message)
    }
  }

  const handleNewQuestionClick = () => {
    setShowCommentBox(false)
    setShowNewQuestionBox(true)
  }

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
          } else if (full_points != null && Number(student_points) === Number(full_points)) {
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
                      setShowCommentBox={setShowCommentBox} 
                      setChosenTask={setChosenTask} 
                      previousComments={previousComments} 
                      uid={user.id}
                    />
                  ))
                }
              </div>
            </div>

            { /* Show the hovering box here, the styles are the same used on coursepage, and can be found from coursePage.css */}
              {showCommentBox && (
                <div className="modal-overlay modal-overlay-light">
                  <div className="modal-dialog modal-white">
                    <div className="modal-header modal-header-light">
                        <h3>
                          Tehtävän kommentit
                        </h3>
                      <button type="button" className="modal-close modal-close-light" onClick={() => setShowCommentBox(false)}>
                          <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                    <div className="modal-body">
                      <div ref={commentContainerRef} className="row student-comment-container rounded-5 p-3">
                        {previousComments.map((comment, index) => (
                          <>
                            {comment.idcommentor === user.id && (
                              <>
                                <div className="col-md-6"></div>
                                <div className="col-md-6">
                                  <div className={`student-comment-box p-3 mb-2 mt-2 float-end student-own-comment`}>
                                    <p className="m-0 p-0">{user.firstname} {user.lastname}</p>
                                    <hr className="mt-1" />
                                    <p className="m-0 p-0">{comment.comment}</p>
                                  </div>
                                </div>
                              </>
                            )}

                            {comment.idcommentor !== user.id && (
                              <>
                              {/* Set latest comment's read status to 1 if it hasn't been read already */}
                              {(() => {
                                if (comment.comment_read === 0) {
                                  handleCommentSetRead(comment.idtaskcomments)
                                }
                              })()}
                                <div className="col-md-6">
                                  <div className={`student-comment-box p-3 mb-2 mt-2 float-start other-comment`}>
                                    <p className="m-0 p-0">{comment.firstname} {comment.lastname}</p>
                                    <hr className="mt-1" />
                                    <p className="m-0 p-0">{comment.comment}</p>
                                  </div>
                                </div>
                                <div className="col-md-6"></div>
                              </>
                            )}
                          </>
                        ))}
                      </div>
                      <br />
                      <br />
                      </div>
                      <div className="row p-3">
                        <div className="col text-start">
                          <button className="btn new-question btn-cancel" onClick={() => handleNewQuestionClick()}>Uusi kysymys<i className="fa-solid fa-plus chat-icon"></i></button>
                        </div>
                      </div>
                  </div>
              </div>
            )}

            { /* Show the hovering box here, the styles are the same used on coursepage, and can be found from coursePage.css */}
            {showNewQuestionBox && (
              <div className="modal-overlay modal-overlay-light">
                  <div className="modal-dialog modal-white">
                      <div className="modal-header modal-header-light">
                          <h3>
                            Uusi kysymys
                          </h3>
                        <button type="button" className="modal-close modal-close-light" onClick={() => setShowNewQuestionBox(false)}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <div className="modal-body">
                        <form noValidate>
                          <label htmlFor="student-question">Kysymys:</label>
                          <textarea id="student-question" className={`form-control essay mt-1 ${newCommentErrors.length > 0 ? "is-invalid" : ""}`} value={newStudentComment.question || ""} maxLength={1000} onChange={(e) => {setNewStudentComment((prev) => ({...prev, question: e.target.value})); setNewCommentErrors([])}}/>
                          {newCommentErrors.length > 0 && (
                            <p className="text-danger">{newCommentErrors[0]}</p>
                          )}
                          <br />
                          <label htmlFor="anonymous-question" style={{position: "relative"}}>
                            Anonyymi kysymys
                            <i className="fa-solid fa-circle-info" onMouseEnter={() => setVisibleTooltip("anonymous")} onMouseLeave={() => setVisibleTooltip("")}></i>
                            {visibleTooltip === "anonymous" && (
                              <div className="student-tooltip">
                                Lähetä kysymys nimettömänä <br />
                                klikkaamalla ruutua
                              </div>
                            )}
                          </label>
                          <input type="checkbox" className="form-check-input ms-2" checked={newStudentComment.anonymous_question || ""} onChange={(e) => setNewStudentComment((prev) => ({...prev, anonymous_question: e.target.checked}))}/>
                          <br />
                          <br />
                          <label htmlFor="public-question" style={{position: "relative"}}>
                            Julkinen kysymys
                            <i className={`fa-solid fa-circle-info`} onMouseEnter={() => setVisibleTooltip("public")} onMouseLeave={() => setVisibleTooltip("")}></i>
                            {visibleTooltip === "public" && (
                              <div className="student-tooltip">
                                Julkisia kysymyksiä voidaan <br/>
                                käyttää myöhemmin muiden  <br />
                                opiskelijoiden apuna. <br />
                                Jätä kohta tyhjäksi mikäli <br />
                                haluat pitää kysymyksesi <br />
                                yksityisenä.
                              </div>
                            )}
                          </label>
                          <input type="checkbox" className="form-check-input ms-2" checked={newStudentComment.public_question || ""} onChange={(e) => setNewStudentComment((prev) => ({...prev, public_question: e.target.checked}))}/>
                        </form>
                        <br />
                        <br />
                        <br />
                        
                        <div class="row">
                          <div className="col text-start">
                            <button type="button" className="btn btn-cancel rounded-5" onClick={() => {setShowNewQuestionBox(false); setShowCommentBox(true)}}>Peruuta</button>
                          </div>
                          <div className="col text-end">
                            <button type="button" className="btn btn-submit rounded-5" onClick={() => handleCommentSumbit()}>Lähetä kysymys</button>
                          </div>
                        </div>
                      </div>
                  </div>
              </div>
            )}
            <div className="col-md-1" />
          </div>
      </div>
    )
  }
}

export default TaskResults;