import React, { useState, useEffect } from "react";
import "./styles/coursePage.css";
import { useNavigate, useParams } from "react-router-dom"
import { useUser } from "../context/useUser.js";
import axios from "axios";

const url = process.env.REACT_APP_API_URL;

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user, updateToken } = useUser();
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [weeks, setWeeks] = useState([]);

  // Student sidebar (collapse not implemented yet)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [chosenWeek, setChosenWeek] = useState({})

  // Student exercise data
  const [studentExerciseResults, setStudentExerciseResults] = useState([])
  const [courseExercises, setCourseExercises] = useState([])

  // Tooltip
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      return;
    }

    console.log("Fetching course data for courseId:", courseId);
    console.log("API URL:", url);
    console.log("Full URL:", url + "/courses/" + courseId);

    const getCourseData = async () => {
      try {
        const response = await axios.get(
          url + "/courses/" + courseId,
          { 
            params: { iduser: user.id},
            headers: { Authorization: "Bearer " + user.access_token } 
          }
        );
        console.log("FULL COURSE:", response.data);
        console.log("Course data response:", response.data);
        setCourseName(response.data.coursename || "");
        setCourseDescription(response.data.course_description || "");
        setWeeks(response.data.weeks || []);

        // If user is a student:
        //  -> set the chosen week to the first element
        if(user.role === "student") {
            setChosenWeek(response.data.weeks[0])
        }
        // Update token
        updateToken(response)

      } catch (error) {
        console.error("Error fetching course data:", error.response?.data || error.message);
        if(error.status === 404) {
            console.log("Course not found. Navigating to home page.")
            navigate("/home")
        }
      }
    };

    const getStudentExerciseData = async () => {
        try {
            // Only do this if the role of the user is student. Otherwise return.
            if (user.role === "student") {
                const response = await axios.get(
                    url + "/courses/userExercisesAndAnswers",
                    {
                        params: {iduser: user.id, idcourse: courseId},
                        headers: { Authorization: "Bearer " + user.access_token }
                    }
                );
                console.log(response.data)
                setStudentExerciseResults(response.data.exerciseResults)
                setCourseExercises(response.data.exercises)
            } else {
                return
            }
        } catch (error) {
            console.error("Error fetching student exercise data: ", error.response?.data || error.message)
        }
    }

    getCourseData()
    if (user.role === "student") {
        getStudentExerciseData()
    }
  }, [courseId, user?.access_token]);

  useEffect(() => {
    console.log("WEEKS FROM API:", weeks);
    }, [weeks]);

  // The sidebar week box of student sidebar
  // Needs a fair amout of conditional rendering, so made it a component here
  const StudentWeekBox = ({week}) => {
    const getIcon = () => {
        // Check if the week has exercises at all
        if (!week.exercises?.length) {
            return
        }

        const now = new Date()

        // Make a lookup set for student exercise results
        const completedExerciseIds = new Set(
            studentExerciseResults?.filter(r => r.complete_time != null).map(r => r.idexercise)
        )

        // Check if all of the week's exercises are done
        const areExercisesDone = week.exercises?.every(exercise => 
            completedExerciseIds.has(exercise.idexercise)
        )

        // Check if some of the exercise return dates have passed
        const hasLateExercises = week.exercises.some(exercise => 
            !completedExerciseIds.has(exercise.idexercise) &&
            new Date(exercise.end_time) < now
        )

        // Return the correct icon
        if (areExercisesDone) {
            return <i className="fa-regular fa-circle-check ps-3 pe-3 pt-1"></i>
        }

        if (hasLateExercises) {
            return <i className="fa-solid fa-circle-exclamation ps-3 pe-3 pt-1" style={{ color: "#00F3FB" }}></i>
        }

        return <i className="fa-regular fa-circle ps-3 pe-3 pt-1"></i>
    }
    return (
        <div className={`d-flex justify-content-between ${chosenWeek.idweek === week.idweek ? "nav-link student-sidebar-item active" : "nav-link student-sidebar-item"}`} key={week.idweek} data-bs-toggle="tab" onClick={() => setChosenWeek(week)}>
            {week.week_name}
            {getIcon()}
        </div> 
    )
  }

  const availablePeople = [
    "Aino Aalto",
    "Eero Ekholm",
    "Ilona Iivonen",
    "Kaisa Korhonen",
    "Laura Leinonen",
    "Mikko Mäkelä",
    "Olli Oksanen",
    "Sanna Saarinen",
  ];

  const lateStudents = ["Pertti Porkkana", "Martti Marja-Puuro", "Liisa lohikeitto"];

  const rosterStudents = [
    "Anni Aalto",
    "Martti Marja-Puuro",
    "Liisa Lohikeitto",
    "Pertti Porkkana",
    "Sofia Saario",
  ].sort((a, b) => a.localeCompare(b, "fi"));

  const questions = [
    { task: "Tehtävä 1", author: "Anonyymi" },
    { task: "Tehtävä 3", author: "Pertti Porkkana" },
    { task: "Tehtävä 5", author: "Anonyymi" },
  ];

  if (user.role === "teacher") {
  return (
    <div className="coursepage">
        <div className="topbar">
                <div className="topbar-left">
                        <div className="course-title">
                                <i className="fa-regular fa-circle-left back-icon" onClick={e => navigate("/home")}></i>
                                <h2 className="course-name">{courseName}</h2>

                        </div>  
                        <p className="course-description">{courseDescription}</p>
                </div>

                <div className="topbar-right">
                        <div className="course-people">

                                <i className="fa-solid fa-user-plus user-icon" onClick={() => { setShowAddStudent(true); setSearchTerm(""); }}></i>
                                <i className="fa-solid fa-user-group user-icon" onClick={() => setShowRoster(true)}></i>
                        </div>
                        <button className="edit-btn" onClick={e => navigate("/EditCourse")}>
                                Muokkaa kurssia 
                                <i className="fa-regular fa-pen-to-square pen"></i>
                        </button>
                </div>
            
        </div>
        <div className="divider"></div>
                <h2>Tehtävät</h2>

                        <div className="container weeks-container">
    <div className="row g-4">
        {/* Conditional rendering required for correct layout. */}
        {/* Layout for course with less than eight weeks */}
        {weeks.length < 9 ?
            (
                <>
                {/* Check if the amount of courses is odd in order to render the correct column width (8/12 if odd, 12/12 if even) */}
                <div className={`${weeks.length % 2 === 1 ? "col-sm-8" : "col-sm"}`}> {/* Left column */}
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                        {weeks.map((week, index) => {
                            {/* Render box, if the amount of courses is even, or the week is not the last in case the amount of weeks is odd */}
                            if((weeks.length % 2 === 0) || (weeks.length % 2 === 1 && index !== weeks.length - 1) || (weeks.length === 1)) {
                                return(
                                <div className="col" key={week.idweek}>
                                    <div className="week-box">
                                        <i className="fa-solid fa-ellipsis-vertical week-menu"></i>
                                        <h3 className="week-title">{week.week_name}</h3>
                                        {week.exercises && week.exercises.length > 0 ? (
                                            week.exercises.map(exercise => (
                                                <div key={exercise.idexercise} className="week-task">
                                                    <div className="week-task-label">Tehtävä:</div>
                                                    <div className="week-task-title">{exercise.exercise_name}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-tasks-message">Ei tehtäviä</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        })}
                    </div>
                </div> 
                {(weeks.length % 2 === 1 && weeks.length !== 1) && (
                    <div className="col-sm-4"> {/* Right column */}
                        <div className="col h-100" key={weeks[weeks.length - 1].idweek}>
                            <div className="week-box">
                                <i className="fa-solid fa-ellipsis-vertical week-menu"></i>
                                <h3 className="week-title">{weeks[weeks.length - 1]?.week_name}</h3>
                                {weeks[weeks.length - 1]?.exercises && weeks[weeks.length - 1]?.exercises.length > 0 ? (
                                    weeks[weeks.length - 1]?.exercises.map(exercise => (
                                        <div key={exercise.idexercise} className="week-task">
                                            <div className="week-task-label">Tehtävä:</div>
                                            <div className="week-task-title">{exercise.exercise_name}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-tasks-message">Ei tehtäviä</div>
                                )}
                            </div>
                        </div>
                    </div> 
                )}
                {weeks.length > 9 && (
                    <></>
                )}
                </>
            ) : (
                <>
                    {weeks.map((week, index) => {
                            {/* Render box, if the amount of courses is even, or the week is not the last in case the amount of weeks is odd */}
                                return(
                                <div className="col-md-4" key={week.idweek}>
                                    <div className="week-box">
                                        <i className="fa-solid fa-ellipsis-vertical week-menu"></i>
                                        <h3 className="week-title">{week.week_name}</h3>
                                        {week.exercises && week.exercises.length > 0 ? (
                                            week.exercises.map(exercise => (
                                                <div key={exercise.idexercise} className="week-task">
                                                    <div className="week-task-label">Tehtävä:</div>
                                                    <div className="week-task-title">{exercise.exercise_name}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-tasks-message">Ei tehtäviä</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        )}
                </>
            )

            /*return ( 
                <div
                    key={week.idweek}
                    className={`col-12 col-sm-6 col-md-6 col-lg-6 week-col ${isLastOdd ? "tall" : ""}`}
                >
                    <div className="week-box">

                        <i className="fa-solid fa-ellipsis-vertical week-menu"></i>

                        <h3 className="week-title">{week.week_name}</h3>

                        {week.exercises && week.exercises.length > 0 ? (
                            week.exercises.map(exercise => (
                                <div key={exercise.idexercise} className="week-task">
                                    <div className="week-task-label">{exercise.exercise_type === "exam" ? "Koe:" : "Tehtävä:"}</div>
                                    <div className="week-task-title">{exercise.exercise_name}</div>
                                </div>
                            ))
                        ) : (
                            <div className="no-tasks-message">Ei tehtäviä</div>
                        )}

                    </div>
                </div>
            );*/
        }

    </div>
</div>
                    
        <div className="divider"></div>

        <div className="progress-section">
            <div className="progress-container">
                <h3 className="progress-title">Oppilaiden yhteisedistys</h3>
                <div className="progress-bar-wrapper">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '60%' }}></div>
                    </div>
                    <span className="progress-percentage">60%</span>
                </div>
            </div>
        </div>



        <div className="content-row">
            <div className="behind-schedule-section">
                <h3 className="section-title">Jäljessä aikataulussa</h3>
                <div className="student-list">
                    {lateStudents.length === 0 ? (
                        <p className="empty-message">Ei oppilaita</p>
                    ) : (
                        lateStudents.map((student, index) => (
                            <div key={index} className="student-item">
                                {student}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="questions-section">
                <h3 className="section-title">Kysymyksiä kurssitehtävistä</h3>
                <div className="question-list">
                    {questions.length === 0 ? (
                        <p className="empty-message">Ei kysymyksiä</p>
                    ) : (
                        questions.map((question, index) => (
                            <div key={index} className="question-item">
                                <span className="question-task">{question.task}</span>
                                <span className="question-author">{question.author}</span>
                                <i 
                                    className="fa-solid fa-caret-right question-arrow" 
                                    onClick={() => navigate("/TaskQuestions")}
                                ></i>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {showRoster && (
            <div className="modal-overlay">
                <div className="modal-dialog">
                    <div className="modal-header">
                        <h3>Kurssin oppilaat</h3>
                        <button type="button" className="modal-close" onClick={() => setShowRoster(false)}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="roster-list">
                            {rosterStudents.map((student, index) => (
                                <div key={index} className="roster-row">
                                    <span className="roster-name">{student}</span>
                                    <button type="button" className="roster-remove">Poista</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showAddStudent && (
            <div className="modal-overlay">
                <div className="modal-dialog">
                    <div className="modal-header">
                        <h3>Lisää kurssilainen</h3>
                        <button type="button" className="modal-close" onClick={() => setShowAddStudent(false)}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="modal-body">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Hae henkilöä..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm.trim().length === 0 ? (
                            <p className="empty-message">Aloita kirjoittamalla nimi</p>
                        ) : (
                            <div className="search-results">
                                {availablePeople.filter(person => person.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                                    <p className="empty-message">Ei löytyviä henkilöitä</p>
                                ) : (
                                    availablePeople
                                        .filter(person => person.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((person, index) => (
                                            <div key={index} className="search-row">
                                                <span className="search-name">{person}</span>
                                                <button type="button" className="search-add-button">+</button>
                                            </div>
                                        ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  );}
  if (user.role === "student"){
    return (
        <div className="coursepage d-flex flex-column min-vh-100">
            { /* Topbar */}
            <div className="d-flex flex-column flex-md-row">
                <div className="flex">
                    { /* Title and description */}
                    <div className="course-title">
                        <i className="fa-regular fa-circle-left back-icon" onClick={e => navigate("/home")}></i>
                        <div className="student-course-titles d-block">
                            <h2 className="text-truncate">{courseName}</h2>
                            <h3 className="course-description-student text-truncate">{courseDescription}</h3>
                        </div>
                    </div>
                </div>
                { /* Progress bar for course's exercises */}
                <div className="flex-grow-1">
                    <div className="progress-section">
                        <div className="progress-container-student">
                            <div className="progress-bar-wrapper-student">
                                <div className="progress-bar-student">
                                    <div 
                                        className="progress-fill-student" 
                                        style={{
                                            width: `${
                                                Math.floor(
                                                    (
                                                        (studentExerciseResults?.filter(r => r.complete_time != null).length) || 0 / 
                                                        (courseExercises?.length || 1)
                                                    ) * 100) 
                                                || 0 }%`
                                            }}
                                            ></div>
                                </div>
                                <span className="progress-percentage-student">
                                    {Math.floor(
                                        (
                                            (studentExerciseResults?.filter(r => r.complete_time != null).length) || 0 / 
                                            (courseExercises?.length || 1)
                                        ) * 100) || 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                    { /* Collapsible button */}
                        <button className="btn edit-btn d-md-none" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                            {sidebarCollapsed ? <i className="fa-solid fa-bars"></i> : <i className="fa-solid fa-xmark"></i>}
                        </button>
                </div>
            </div>
            <div className="divider"></div>
            {/* Page content */}
            <div className="d-flex flex-grow-1">
                {/* Navigation left-side */}
                <div className={`position-relative student-left-side-sidebar ${sidebarCollapsed ? "d-none" : "d-flex"} d-md-flex`}>
                        { /* Sidebar itself */}
                        <div className={`nav flex flex-column nav-tabs student-sidebar ${sidebarCollapsed ? "d-none" : "d-flex"} d-md-flex`} role="tablist">
                            <h3>Viikot</h3>
                            {weeks.map((week, index) => {
                                return (
                                    <StudentWeekBox week={week} />
                                )
                            })}
                        </div>
                </div>
                
                {/* Course week material */}
                <div className="flex-fill ps-4 student-page-content">
                    {/* Add week description here if it exists */}
                    {chosenWeek.week_description && 
                    <>
                        <h4>Viikon kuvaus</h4>
                        <p>{chosenWeek.week_description}</p>
                    </>
                    }
                </div>
                {/* Right side content */}
            
                <div className={`flex ${chosenWeek?.exercises?.length > 0 ? "" : "disabled-div"}`}>
                    <div 
                        onMouseEnter={() => chosenWeek?.exercises?.length === 0 && setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        style={{position: "relative"}}
                    >
                    <h3 className="d-inline p-2 exercises" onClick={() => {
                        if (chosenWeek.exercises.length === 0) return

                        const chosenWeeksExerciseIds = new Set(
                            chosenWeek.exercises?.map(exercise => exercise.idexercise)
                        )
                        
                        const filteredStudentExerciseResults = studentExerciseResults.filter(result =>
                            chosenWeeksExerciseIds.has(result.idexercise)
                        )
                        
                        navigate(`/WeeksExercises/${chosenWeek.idweek}`, {state: { idcourse: courseId, week: chosenWeek, exerciseresults: filteredStudentExerciseResults}})}}>
                        Tehtäviin
                    </h3>
                    <i className="d-inline fa-solid fa-arrow-right"></i>
                    {chosenWeek?.exercises?.length === 0 && showTooltip && (
                        <div className="student-tooltip">
                            Viikolla ei ole tehtäviä.
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    )
  }
}

export default CoursePage;