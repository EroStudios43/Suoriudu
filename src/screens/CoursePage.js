import React, { useState, useEffect } from "react";
import "./styles/coursePage.css";
import { useNavigate, useParams } from "react-router-dom"
import { useUser } from "../context/useUser.js";
import axios from "axios";

const url = process.env.REACT_APP_API_URL;

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useUser();
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [weeks, setWeeks] = useState([]);

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
          { headers: { Authorization: "Bearer " + user.access_token } }
        );
        console.log("FULL COURSE:", response.data);
        console.log("Course data response:", response.data);
        setCourseName(response.data.coursename || "");
        setCourseDescription(response.data.course_description || "");
        setWeeks(response.data.weeks || []);

      } catch (error) {
        console.error("Error fetching course data:", error.response?.data || error.message);
      }
    };

    getCourseData();
  }, [courseId, user]);

  useEffect(() => {
    console.log("WEEKS FROM API:", weeks);
    }, [weeks]);

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
                            if(weeks.length % 2 === 0 || (weeks.length % 2 === 1 && index !== weeks.length - 1)) {
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
                {weeks.length % 2 === 1 && (
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
                                    <div className="week-task-label">Tehtävä:</div>
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
  );
}

export default CoursePage;