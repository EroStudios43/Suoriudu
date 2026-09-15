import React, { useState, useEffect, useCallback, useRef } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";
import ProgressBarTimer from "../components/progressbartimer.js";
import DrawingBoard from "../components/DrawingBoard.js";
import DrawingReview from "../components/DrawingReview.js";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

import GazeTracker from "../components/GazeTracker.js";

import { useTheme } from "../context/ThemeContext.js";


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

const RenderTask = React.memo(({task, index, answers, setAnswers, handleCodeRun, codeRunResult, drawingStates, setDrawingStates, drawingRefs})  => {
  const taskDrawingState = drawingStates[task.idtask];
  const lines = Array.isArray(taskDrawingState?.lines) ? taskDrawingState.lines : [];
  
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
            maxLength={10000}
            onChange={(e) =>
              setAnswers(prev => ({...prev, [task.idtask]: e.target.value
            }))
          }/>
          <span className="text-muted text-end d-block"><small>{answers[task.idtask]?.length || 0}/{10000} merkkiä</small></span>
        </div>
        <hr />
      </>
    )

  } 
  else if (task.tasktype === "drawing") {
    return ( 
      <>
        <div id={`scrollspy-section${index}`} className="col single-task">
          <p className="mb-0"><b>Tehtävä {index + 1}</b></p>

          {/* Tehtävänanto näkyviin */}
          <p>{task.question}</p>

          {/* Piirtolaatikko */}
          <DrawingBoard
            onRegisterGetJson={(getJson) => {
              drawingRefs.current[task.idtask] = getJson;
            }}
            lines={lines}
            setLines={(newLines) => {
              setDrawingStates(prev => {
                const currentTaskState = prev[task.idtask] || {};
                const currentLines = Array.isArray(currentTaskState.lines) ? currentTaskState.lines : [];
                const updatedLines = typeof newLines === "function"
                  ? newLines(currentLines)
                  : newLines;

                return {
                  ...prev,
                  [task.idtask]: {
                    ...currentTaskState,
                    lines: updatedLines
                  }
                };
              });
            }}
            onSave={(json) => {
              setAnswers(prev => ({
                ...prev,
                [task.idtask]: json
              }));
            }}
          />

          {/* Näytä tallennettu piirros oppilaalle */}
          {answers[task.idtask] && (
            <>
              <p className="mt-3">Tallennettu piirros:</p>
              <DrawingReview json={answers[task.idtask]} />
            </>
          )}
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
          
        </div>
        <hr />
      </>
    )
  }
})

// Page itself
function TestQuestions() {
  // Variables for navigation and getting some values from previous page
  const navigate = useNavigate();
  const location = useLocation();

  // Variables from the previous page and user from useUser
  const { idexercise } = useParams()
  const { user, updateToken } = useUser()
  const [ idcourse, setIdCourse ] = useState(location.state?.idcourse || "")
  const [ idweek, setIdWeek ] = useState(location.state?.idweek)
  const [ examCodeMatch, setExamCodeMatch ] = useState(location.state?.examCodeMatch)

  // Data for tasks and exercise
  const [ tasks, setTasks ] = useState([])
  const [ taskResults, setTaskResults ] = useState([])
  const [ exercisedata, setExercisedata ] = useState({})

  
  // Variables for coding exercises
  const [ codeRunResult, setCodeRunResult ] = useState({})

  // Variable for student's answers (both from the database and the current ones)
  const [ answers, setAnswers ] = useState({})
  const [drawingStates, setDrawingStates] = useState({});
  const drawingRefs = useRef({});

  // Variable for showing the confirmation screen for returning the exercise
  const [showConfirm, setShowConfirm ] = useState(false)

  // Variables for navigating back, set to false by default
  const [canGoBack, setCanGoBack ] = useState(false)

  // Variables used for the timer
  const [ startingTime, setStartingTime ] = useState(null)
  const [ showTimer, setShowTimer ] = useState(true)
  const [ remainingExamTime, setRemainingExamTime ] = useState(null) // Used to automatically submit the exam after time ends. Updated in the timer component
  const [ fiveMinutesLeft, setFiveMinutesLeft ] = useState(false) // Used to determine when the warning should be shown.
  const [ showFiveMinuteWarning, setShowFiveMinuteWarning ] = useState(false) // Used to determine whether the 5-minute warning box should be shown.
  const [ zeroTimeRemaining, setZeroTimeRemaining ] = useState(false) // Used when the exam time has ended and answers have automatically been submitted.

  const { isDarkMode, toggleTheme } = useTheme();
  // Variables for detecting page focus and visibility
  const [ isPageFocused, setIsPageFocused ] = useState(true)
  const [ isPageVisible, setIsPageVisible ] = useState(true)

  // Fetch data when landing on the page
  const fetchUserExerciseAndTaskData = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      navigate("/home")
      return null
    }

    // Check that the user has successfully given the right exam code on the previous page
    if (!examCodeMatch) {
      console.log("Exam password incorrect")
      navigate("/home")
      return
    }

    // Check that the other variables are defined
    if (!idcourse || !idexercise) {
      console.log("Variables not set yet")
      navigate("/home")
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
      setStartingTime(response.data.starting_time)
      
      updateToken(response)
      return response.data
      
    } catch (error) {
      console.log("Error fetching exercise data:", error.response?.data || error.message)
      if (error.status === 404) {
        console.log("Course not found. Navigating to home page.")
        navigate("/home")
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

  // Prevent refresh and tab closing
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!canGoBack) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [canGoBack])

  // Prevent browser's back-button navigation
  useEffect(() => {
    const handlePopState = (e) => {
      if (!canGoBack) {
        e.preventDefault()
        setShowConfirm(true)

        // Prevent url from changing
        window.history.pushState(null, "", window.location.pathname)
      }
    }

    window.history.pushState(null, "", window.location.pathname)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [canGoBack])

  // A function for sending visibility data and page leaving data to the backend
  const sendExamNoteData = (cause) => {
    console.log("Sending visibility change to backend")
    if (!user || !user.access_token) {
      console.log("No user or token yet")
      return
    }

    if (!idcourse) {
      console.log("Idcourse not set")
      return
    }

    if (!idexercise) {
      console.log("Idexercise not set")
      return
    }

    // Have to use fetch (previously with keepalive) to make sure the request doesn't break when page isn't visible
    fetch(url + "/courses/updateAiNotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + user.access_token
      },
      body: JSON.stringify({
        ai_notes: cause,
        idcourse,
        idexercise
      }),
      keepalive: true
    })
      .then(response => {
        console.log("Visibility request:", response.status)
      })
      .catch(error => {
        console.error("Visibility request failed:", error)
      })
  }

  // Check for the case of page being not visible or out of focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === 'visible')
      if (document.visibilityState === 'hidden') {
        console.log("Page not visible")
        sendExamNoteData("Page not visible")
      }
    }

    const handleWindowFocus = () => {
      setIsPageFocused(true)
    }

    const handleWindowBlur = () => {
      setIsPageFocused(false)
    }

    const handlePageHide = () => {
      sendExamNoteData("Student left the exam page")
    }

    // Tab switches, minimization
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Window focus
    window.addEventListener('focus',handleWindowFocus )
    window.addEventListener('blur', handleWindowBlur)

    // Leaving the page completely
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  // Checks for page visibility and focus variables
  useEffect(() => {
    if (isPageFocused === false && isPageVisible === true) {
      console.log("Page not in focus")

      // Send info to db
      const updatePageFocusInfo = async () => {
        try {
          // Check that user has access token
          if (!user || !user.access_token) {
            console.log("No user or token yet");
            return
          }

          if (!idcourse) {
            console.log("Idcourse not set")
            return
          }

          if (!idexercise) {
            console.log("Idexercise not set")
            return
          }

          const ai_note_object = {
            idexercise: idexercise,
            ai_notes: "Page not in focus",
            idcourse: idcourse
          }

          const res = await axios.post(url + "/courses/updateAiNotes", ai_note_object, {headers: {Authorization: "Bearer " + user.access_token}})
          console.log("Notes successfully updated")

        } catch (error) {
          console.log("Error updating ai-notes:", error.response?.data || error.message)
        }
      }

      updatePageFocusInfo()
    }
  }, [isPageFocused, isPageVisible])

  // Check if the exam has 5 minutes remaining
  //     -> The time is checked and variable is updated in the progressbartimer component
  //     -> If the exam has five minutes remaining, show the modal that warns the user that there's not a lot of time remaining
  useEffect(() => {
    if (fiveMinutesLeft === true) {
      setShowFiveMinuteWarning(true)
    }
  }, [fiveMinutesLeft])

  // Check if the exam time has run out
  //     -> The time is checked in the progressbartimer component
  //     -> The component sets the zeroTimeRemaining variable to true when the time's run out
  useEffect(() => {
    if (zeroTimeRemaining === true) {
      // Return the answers
      handleSubmit()
    }
  }, [zeroTimeRemaining])

  // Function for submitting answers
  const handleSubmit = async () => {
    try {
      const taskResults = {...answers};
      tasks.forEach((task) => {
        if (task.tasktype === "drawing") {
          const drawingJson = drawingRefs.current[task.idtask]?.();
          if (drawingJson) taskResults[task.idtask] = drawingJson;
        }

        
        if (task.tasktype === "coding") {
          // If the student has not written any code, use the starter code
          if (!taskResults[task.idtask]) {
            const task_code_data = JSON.parse(task.answer)
            const student_code = task_code_data.starterCode
            taskResults[task.idtask] = student_code
          }
        }
      });

      const exerciseObject = {
        idexercise: idexercise,
        taskResults
      }
      
      const res = await axios.post(url + "/courses/addExerciseAndTaskResults", exerciseObject, {headers: {Authorization: "Bearer " + user.access_token}})
      if (res.status === 200) {
        setCanGoBack(true)
        if (!zeroTimeRemaining) {
          navigate(`/WeeksExercises/${exercisedata.idweek}`, {state: { idcourse: idcourse}})
        }
      }
    } catch (error) {
      console.log("Error submitting answers:", error.response?.data || error.message)
    }
    console.log(answers)
    
  }

  // Function for closing the confirmation screen
  const handleClosingConfirm = () => {
    setShowConfirm(false)
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
        (taskResult) => taskResult.idtask === task.idtask
      )


      // Return the nav item (star) for the task
      return (<li className="nav-item">
        <i className={`fa-regular fa-star progress-star me-1 ${isDone ? "complete" : ""}`} onClick={handleClick}></i>
      </li>)
    }
    return(
      <div id="starProgression" className="d-none d-md-inline-block">
        <ul className="nav flex-wrap">
        {tasks.map((task, index) => (
          <NavLink key={task.idtask || index} task={task} index={index}/>
        ))}
    </ul>
      </div>
    )
  }

  if (user.role === "student" || user.role === "teacher") {
    return (
      <div className={`container-fluid min-vh-100 exercises-container ${isDarkMode ? '' : 'light-theme'}`}>

          {/* Välitetään kokeen ID GazeTrackerille: */}
          <GazeTracker idexercise={exercisedata?.idexercise} />
          
          <div className="row">
            <div className="col-md-1" />
            { /* White box for page content */}
            <div className="col-md-10 rounded-4 p-4 allTasksBox">
              <div className="row">
                <div className="col-md-2">
                   <h1 className="display-4">{exercisedata?.exercise_name}</h1>
                </div>
                <div className="col-md-3 col-lg-5" />
                <div className="col-md-2 scrollspy-example text-end" data-bs-spy="scroll" data-bs-target="#starProgression" data-bs-offset="0" tabIndex={0}>
                  <RenderProgressBar />
                </div> 
                <div className="col-md-5 col-lg-3 text-end">
                   <i className={`fa-regular fa-eye show-timer ${showTimer ? "" : "hide"} d-inline-block align-middle`} onClick={() => setShowTimer(!showTimer)}></i>
                  {
                    showTimer ? 
                      <div className="d-inline-block align-middle">
                        <ProgressBarTimer 
                          studentExamStartTime={startingTime} 
                          exerciseEndTime={exercisedata?.end_time} 
                          examDuration={exercisedata?.max_time}
                          fiveMinutesLeft={fiveMinutesLeft}
                          setFiveMinutesLeft={setFiveMinutesLeft}
                          zeroTimeRemaining={zeroTimeRemaining}
                          setZeroTimeRemaining={setZeroTimeRemaining}
                        />
                      </div>
                      : <></>
                  }
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
                        handleCodeRun={handleCodeRun} 
                        codeRunResult={codeRunResult}
                        drawingStates={drawingStates}
                        setDrawingStates={setDrawingStates}
                        drawingRefs={drawingRefs}
                        />
                    )
                  })}
                  <div className="text-center">
                    <button type="button" className="btn btn-submit rounded-5" onClick={() => setShowConfirm(!showConfirm)}>Palauta koe</button>
                  </div>
                </form>
              </div>
              { /* Show the confirm submission box here, the styles are the same used on coursepage, and can be found from coursePage.css */}
              { /* The box styles are slightly edited, and the changes can be found from exercises.css */}
              {showConfirm && (
                <div className="modal-overlay modal-overlay-light">
                    <div className="modal-dialog modal-dialog-light">
                        <div className="modal-header modal-header-light">
                            <h3>
                              Oletko varma, että haluat palauttaa kokeen?
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
                                Voit palauttaa kokeen, mutta vastaamattomista tehtävistä ei saa pisteitä.
                              </p>
                            )}
                            <br />
                            
                            <br />
                            <div class="row">
                              <div className="col text-start">
                                <button type="button" className="btn btn-cancel rounded-5" onClick={() => handleClosingConfirm()}>Peruuta</button>
                              </div>
                              <div className="col text-end">
                                <button type="button" className="btn btn-submit rounded-5" onClick={() => handleSubmit()}>Palauta koe</button>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            { /* Show the five minute warning box here, the styles are the same used on coursepage, and can be found from coursePage.css */}
            { /* The box styles are slightly edited, and the changes can be found from exercises.css */}
              {showFiveMinuteWarning === true && (
                <div className="modal-overlay">
                    <div className="modal-dialog modal-white">
                        <div className="modal-header modal-header-light">
                            <h3>
                              Kokeen suoritusaikaa 5 minuuttia jäljellä
                            </h3>
                          <button type="button" className="modal-close modal-close-light" onClick={() => setShowFiveMinuteWarning(false)}>
                              <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                        <div className="modal-body">
                          <p>
                            Ajan loputtua vastauksesi tallennetaan ja lähetetään automaattisesti.
                            <br />
                            Varmistathan, että vastauksesi ovat valmiita ennen ajan loppumista.
                          </p>
                          <br />
                        </div>
                    </div>
                </div>
              )}

            { /* Show the time ended box, the styles are the same used on coursepage, and can be found from coursePage.css */}
            { /* The box styles are slightly edited, and the changes can be found from exercises.css */}
              {zeroTimeRemaining === true && (
                <div className="modal-overlay">
                    <div className="modal-dialog modal-white">
                        <div className="modal-header modal-header-light">
                            <h3>
                              Kokeen suoritusaikaa on loppunut.
                            </h3>
                        </div>
                        <div className="modal-body">
                          <p>
                            Kokeen suoritusaika on loppunut, ja vastauksesi on tallennettu ja koe lähetetty automaattisesti.
                            <br />
                            Voit palata kurssin sivulle alla olevasta painikkeesta.
                          </p>
                          <br />
                          <button type="button" className="btn btn-submit rounded-5 float-end mb-2" onClick={canGoBack ? e => navigate(`/CoursePage/${idcourse}`) : e => {}}>Palaa kurssisivulle</button>
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

export default TestQuestions;