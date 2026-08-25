import React, { useState, useEffect, useCallback, useRef } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

const url = process.env.REACT_APP_API_URL;

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

// The function to render all task boxes.
const RenderTask = React.memo(({task, index, answers, setAnswers, setShowCommentBox, setChosenTask, previousComments, uid, handleCodeRun, codeRunResult})  => {
  if (task.tasktype === "essay" || task.tasktype === "drawing") {
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          <textarea 
            id={task.idtask} 
            className="form-control essay" 
            value={answers[task.idtask] || ""} 
            maxLength={10000}
            onChange={(e) =>
              setAnswers(prev => ({...prev, [task.idtask]: e.target.value
            }))
          }/>
          <span className="text-muted text-end d-block"><small>{answers[task.idtask]?.length || 0}/{10000} merkkiä</small></span>
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
  } else if (task.tasktype === "coding") {
    const starter_code = JSON.parse(task.answer).starterCode
    const test_cases = JSON.parse(task.answer).testCases
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          <CodeMirror 
            value={answers[task.idtask] || starter_code || ""} 
            extensions={[javascript()]} 
            onChange={(value) =>
              setAnswers(prev => ({
                ...prev,
                [task.idtask]: value
              }))
            }
          />
          <br />
          <div>
            {codeRunResult[task.idtask] && <TestResults results={codeRunResult[task.idtask]} />}
          </div>
          <div className="btn btn-submit float-end" onClick={() => handleCodeRun(task)}>Suorita koodi</div>
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
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          {task.answer.options.map((option, index2) => {
            return(
              <div key={index2} className="form-check student-multiple-choice d-flex justify-content-between align-items-start p-2">
                <label className="form-check-label" htmlFor={`${task.idtask}${index2}`} style={{flex: 1}}>
                  {option}
                </label>
                <input 
                  className="mt-1 form-check-input" 
                  checked={answers[task.idtask]?.includes(index2) || false}
                    onChange={(e) => {
                    setAnswers(prev => {
                      const prevTaskAnswers = prev[task.idtask] || []

                      let updated

                      if (e.target.checked) {
                        updated = [...prevTaskAnswers, index2]
                      } else {
                        updated = prevTaskAnswers.filter(i => i !== index2)
                        // Remove instance from the answers if none are selected
                        if (updated.length === 0) {
                          const { [task.idtask]: _, ...rest } = prev;
                          return rest;
                        }
                      }

                      return {
                        ...prev,
                        [task.idtask]: updated
                      }
                    })
                  }}
                  type="checkbox" 
                  id={`${task.idtask}${index2}`}
                />
              </div>
            )
          })}
          <br />
          <div className="chat-text" onClick={(e) => {setShowCommentBox(true); setChosenTask(task.idtask)}}>Ongelmia tehtävässä?<i className="fa-regular fa-message chat-icon"></i>
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
        </div>
        <hr />
      </>
    )
  } else if (task.tasktype === "single_choice") {
    return (
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>
          <p>{task.question}</p>
          {task.answer.options.map((option, index2) => {
            return(
              <div key={index2} className="form-check student-single-choice d-flex justify-content-between align-items-start p-2">
                <label className="form-check-label" htmlFor={`${task.idtask}${index2}`} style={{flex: 1}}>
                  {option}
                </label>
                <input 
                  className="mt-1 form-check-input" 
                  name={`task-${task.idtask}`}
                  checked={answers[task.idtask] === index2 ? true : false}
                  onChange={(e) => {
                    setAnswers(prev => ({...prev, [task.idtask]: index2}))
                  }}
                  type="radio" 
                  id={`${task.idtask}${index2}`}
                />
              </div>
            )
          })}
          <br />
          <div className="chat-text" onClick={(e) => {setShowCommentBox(true); setChosenTask(task.idtask)}}>Ongelmia tehtävässä?<i className="fa-regular fa-message chat-icon"></i>
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

  // Variable for student's answers (both from the database and the current ones)
  const [ answers, setAnswers ] = useState({})

  // Variable for showing the confirmation screen for returning the exercise
  const [ showConfirm, setShowConfirm ] = useState(false)

  // Variable for the help / comment box
  const [ showCommentBox, setShowCommentBox ] = useState(false)
  const [ showNewQuestionBox, setShowNewQuestionBox ] = useState(false)
  const [ visibleTooltip, setVisibleTooltip ] = useState("")
  const [ previousComments, setPreviousComments ] = useState([])
  const [ newStudentComment, setNewStudentComment ] = useState({question: "", public_question: false, anonymous_question: false})
  const [ newCommentErrors, setNewCommentErrors ] = useState([])
  const [ chosenTask, setChosenTask ] = useState("")
  const commentContainerRef = useRef(null)

  // Variables for coding exercises
  const [ codeRunResult, setCodeRunResult ] = useState({})

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
      
      // Make an object out of the already submitted answers
      const tempAnswerObject = response.data.answerArray.reduce((acc, task) => {
        acc[task.idtask] = task.answer
        return acc
      }, {})
      console.log(tempAnswerObject)
      setAnswers(tempAnswerObject)
      
      setTasks(response.data.tasks)
      setTaskResults(response.data.answerArray)
      setExercisedata(response.data.exercise)
      
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

  // UseEffect to automatically scroll the comment box to the bottom
  useEffect(() => {
    if (commentContainerRef.current) {
        commentContainerRef.current.scrollTo({
          top: commentContainerRef.current.scrollHeight,
          behavior: "smooth"
        })
      }
  }, [previousComments, showCommentBox])

  const handleSubmit = async () => {
    try {
      const exerciseObject = {
        idexercise: idexercise,
        taskResults: answers
      }
      
      const res = await axios.post(url + "/courses/addExerciseAndTaskResults", exerciseObject, {headers: {Authorization: "Bearer " + user.access_token}})
      console.log("Exercise submitted", res.data)
      navigate(`/WeeksExercises/${exercisedata.idweek}`, {state: { idcourse: idcourse}})
    } catch (error) {
      console.log("Error submitting answers:", error.response?.data || error.message)
    }
    console.log(answers)
  }

  const handleCommentSumbit = async () => {
    try {
      console.log("Submitting comment")
      console.log(newStudentComment)
      console.log(exercisedata.idexerciseresult)

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
      if (!exercisedata.idexerciseresult) {
        console.log("Idexercisersult can't be null")
        return
      } else {
        tempComment.idexerciseresult = exercisedata.idexerciseresult
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
    const task_code_data = JSON.parse(task.answer)
    const student_code = answers[task.idtask] || task_code_data.starterCode
    const test_cases = task_code_data.testCases
    const results = await runAndCheckCode(student_code, test_cases)
    setCodeRunResult((prev) => ({ ...prev, [task.idtask]: results }));
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
        (taskResult) => taskResult.idtask === task.idtask && taskResult.answer !== null
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
                  <i className="fa-regular fa-circle-left back-icon-light d-inline" onClick={e => navigate(`/WeeksExercises/${exercisedata.idweek}`, {state: {idcourse: idcourse}})}></i>
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
                      <RenderTask 
                        task={task} 
                        index={index} 
                        key={task.idtask} 
                        answers={answers} 
                        setAnswers={setAnswers} 
                        setShowCommentBox={setShowCommentBox} 
                        setChosenTask={setChosenTask} 
                        previousComments={previousComments} 
                        uid={user.id} 
                        handleCodeRun={handleCodeRun}
                        codeRunResult={codeRunResult}
                      />
                    )
                  })}
                  <div className="text-center">
                    <button type="button" className="btn btn-submit rounded-5" onClick={() => setShowConfirm(!showConfirm)}>Palauta tehtäväpaketti</button>
                  </div>
                </form>
              </div>
              { /* Show the hovering box here, the styles are the same used on coursepage, and can be found from coursePage.css */}
              {showConfirm && (
                <div className="modal-overlay modal-overlay-light">
                    <div className="modal-dialog modal-dialog-light">
                        <div className="modal-header modal-header-light">
                            <h3>
                              Oletko varma, että haluat palauttaa tehtäväpaketin?
                            </h3>
                          <button type="button" className="modal-close modal-close-light" onClick={() => setShowConfirm(false)}>
                              <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                        <div className="modal-body">
                            
                            {Object.keys(answers).length !== tasks.length && (
                              <p className="text-danger">
                                Kaikkiin tehtäviin ei ole vastattu. 
                              <br />
                                Voit palauttaa tehtävän, mutta vastaamattomista tehtävistä ei saa pisteitä.
                              </p>
                            )}
                            <br />
                            
                            <br />
                            <div className="row">
                              <div className="col text-start">
                                <button type="button" className="btn btn-cancel rounded-5" onClick={() => setShowConfirm(false)}>Peruuta</button>
                              </div>
                              <div className="col text-end">
                                <button type="button" className="btn btn-submit rounded-5" onClick={() => handleSubmit()}>Palauta tehtäväpaketti</button>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
            </div>
            <div className="col-md-1" />
          </div>
      </div>
    );
  }
  
}

export default TaskQuestions;