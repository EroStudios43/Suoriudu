import React, {useState, useEffect, useCallback} from "react";
import "./styles/home.css";
import { useNavigate, useLocation } from "react-router-dom"
import Calendar from "../components/calendar.js";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useUser } from "../context/useUser.js";
import axios from "axios";

const url = process.env.REACT_APP_API_URL;

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const {user, updateToken, signOut} = useUser()
    const [courses, setCourses] = useState([]);
    const [refresh, setRefresh] = useState(0);

    // The variables for student course searching
    const [studentCourseSearch, setStudentCourseSearch] = useState("")
    const [studentCourseSearchResults, setStudentCourseSearchResults] = useState([])
    const [showStudentCourseSearch, setShowStudentCourseSearch] = useState(false)

    // The variables for the box for adding student to course
    const [showJoinCourseBox, setShowJoinCourseBox] = useState(false)
    const [studentChosenCourse, setStudentChosenCourse] = useState()

    // The variables for student course search result pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const resultsPerPage = 5

    // Some pagination logic
    const indexOfLastCourse = currentPage * resultsPerPage
    const indexOfFirstCourse = indexOfLastCourse - resultsPerPage
    const currentResults = studentCourseSearchResults.slice(indexOfFirstCourse, indexOfLastCourse);

    const logout = () => {
      signOut()
      localStorage.clear();
      navigate("/")
    }

    useEffect(() => {
        console.log("USER CHANGED:", user);
    }, [user]);
        

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [exams, setExams] = useState([]);


    const formatDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selected = new Date(date);
        selected.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const formattedDate = date.toLocaleDateString("fi-FI", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
        });

        if (selected.getTime() === today.getTime()) {
            return `Tänään  ${formattedDate}`;
        }

        if (selected.getTime() === tomorrow.getTime()) {
            return `Huomenna  ${formattedDate}`;
        }

        if (selected.getTime() === yesterday.getTime()) {
            return `Eilen  ${formattedDate}`;
        }
        
        const lowercaseDate = date.toLocaleDateString("fi-FI", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        return String(lowercaseDate).charAt(0).toUpperCase() + String(lowercaseDate).slice(1)
    };

    // A function for allowing enter-presses to the student view's search courses functionality (changed to form submit in general)
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            console.log(!studentCourseSearch)
            if (!studentCourseSearch) {
                setShowStudentCourseSearch(false)
                return
            } else {
                searchForCoursesByName()
                setShowStudentCourseSearch(true)
            }
        }
    }
    // Handle the search courses-function of student view
    const searchForCoursesByName = async () => {
        // Check that the course name exists
        if(!studentCourseSearch) {
            return
        }

        console.log("SEARCHING FOR " + studentCourseSearch)

        try {
            const response = await axios.get(
                url + "/courses/courseName",
                {
                    params: { coursename: studentCourseSearch, iduser: user.id},
                    headers: { Authorization: "Bearer " + user.access_token}
                }
            );

            // Set pagination data to correct
            setStudentCourseSearchResults(response.data)
            setTotalPages(Math.ceil(response.data.length / resultsPerPage))

        } catch (e) {
            console.log(e)
        }
    }

    const addStudentToCourse = async () => {
        // Adding student to course
        console.log("Send a request for backend to bring student to course " + studentChosenCourse.coursename)

        // Frontend validation to prevent unnecessary traffic to backend
        const idCourse = studentChosenCourse.idcourse
        const idUser = user.id
        const errors = {}

        // Check if token is valid
        if (!user || !user.access_token) {
            console.log("NO TOKEN YET", user);
            return;
        }

        // Check if idcourse is valid
        if (!Number.isInteger(idCourse)) {
            errors.course = "Course id is invalid"
        }

        // Check if idUser is valid
        if (!Number.isInteger(idUser)) {
            errors.course = "User id is invalid"
        }

        console.log(errors)

        if (Object.keys(errors).length > 0) {
            return
        }

        // If ok, send request to backend
        try {
            const data = {iduser: idUser, idcourse: idCourse}

            const response = await axios.post(
                url + "/courses/addUserOnCourse", 
                data,
                { headers: { Authorization: "Bearer " + user.access_token }}
            );

            setRefresh(prev => prev + 1)
            setShowJoinCourseBox(false)
        } catch (e) {
   
        }
    }
        

    useEffect(() => {
        if (location.state?.refresh) {
            setRefresh(prev => prev + 1);
        }
    }, [location.state])

    
    useEffect(() => {
        if (!user || !user.access_token) {
            console.log("NO TOKEN YET", user);
            return;
        }

        const getCourses = async () => {
            try {
                console.log("CALLING API");

                const response = await axios.get(
                    url + "/courses/myCourses",
                    { headers: { Authorization: "Bearer " + user.access_token } }
                );

                console.log(response)

                // Update token
                updateToken(response)

                console.log("COURSES RESPONSE:", response.data);
                setCourses(response.data);

                // Fetch exams for each course
                try {
                    const examList = [];
                    for (const c of response.data) {
                        try {
                            const resp = await axios.get(url + "/courses/" + c.idcourse, { headers: { Authorization: "Bearer " + user.access_token } });
                            const weeks = resp.data.weeks || [];
                            for (const w of weeks) {
                                const exercises = w.exercises || [];
                                for (const ex of exercises) {
                                    if (ex.exercise_type === "exam") {
                                        examList.push({
                                            idcourse: c.idcourse,
                                            coursename: c.coursename,
                                            idexercise: ex.idexercise,
                                            examname: ex.exercise_name,
                                            start_time: ex.start_time,
                                            end_time: ex.end_time
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to fetch course details for exams', c.idcourse, e.message || e);
                        }
                    }
                    setExams(examList);
                } catch (e) {
                    console.error('Failed to collect exams', e);
                }

            } catch (error) {
                console.error("API ERROR:", error.response?.data || error.message);
            }
        };

        getCourses();
    }, [user?.access_token, refresh]);

  if (user.role === "teacher"){
    return (
        <div className="home-container">
            <div className="topbar">
                <h1 className="welcome-text">
                    Hei {user.firstname} {user.lastname}!
                </h1>       

                <div className="topbar-right-icons">
                    <button className="icon-button" onClick={e => navigate("/TaskQuestions")}>
                        <i className="fa-solid fa-envelope"></i>
                    </button>

                    <button className="icon-button" onClick={e => navigate("/Profile")}>
                        <i className="fa-solid fa-circle-user"></i>
                    </button>

                    <button className="icon-button" onClick={e => logout()}>
                        <i className="fa-solid fa-sign-out-alt"></i>
                    </button>

                </div>
            </div>

            <div className="divider"></div>
            <p className="info-text">
                Tehtävät ja kokeet 
            </p>

            <div className="calendar-content">
                
                <div className="left-side">
                            
                                        <div className="info-card">
                                                <h2>{formatDate(selectedDate)}</h2>
                                                <div className="exam-list">
                                                    {exams.filter(ex => {
                                                            if (!ex.start_time) return false;
                                                            const dt = new Date(ex.start_time);
                                                            const sel = new Date(selectedDate);
                                                            return dt.toDateString() === sel.toDateString();
                                                    }).length === 0 ? (
                                                        <p>Päivälle ei ole tehty kokeita.</p>
                                                    ) : (
                                                        exams.filter(ex => {
                                                                if (!ex.start_time) return false;
                                                                const dt = new Date(ex.start_time);
                                                                const sel = new Date(selectedDate);
                                                                return dt.toDateString() === sel.toDateString();
                                                            }).map((ex) => (
                                                                <div className="exam-row" key={ex.idexercise}>
                                                                    <i className="fa-solid fa-graduation-cap hat"></i>
                                                                    {
                                                                        (() => {
                                                                            const start = ex.start_time ? new Date(ex.start_time).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                                                                            const end = ex.end_time ? new Date(ex.end_time).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                                                                            return <div className="exam-time">{start}{end ? `-${end}` : ''}</div>;
                                                                        })()
                                                                    }
                                                                    <div className="exam-course">{ex.coursename}</div>
                                                                    <div className="exam-name">{ex.examname}</div>
                                                                    <button className="exam-next">
                                                                        <i className="fa-solid fa-caret-right"></i>
                                                                    </button>
                                                                </div>
                                                            ))
                                                    )}
                                                </div>
                                        </div>

                    <button className="marathon-btn" onClick={e => navigate("/TaskEvaluation")}>
                            <p>Arviointimaratoni</p>
                            <p className="info-marathon">
                                Arvioi anonyymisti opiskelijoiden tehtäviä satunnaisessa järjestyksessä 
                                valitsemaltasi kurssilta!
                            </p>
                    </button>
                </div>

                <div className="right-side">
                    <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} exams={exams} />
                </div>
            </div>

            <div className="courses-header">
                <h1>Kurssit</h1>

                <button className="create-course-btn" onClick={e => navigate("/CreateCourse")}>
                    <i className="fa-solid fa-plus"></i>
                </button>
            </div>

            <div className="courses-content">
                {courses && courses.length > 0 ? (
                    courses.map((course, index) => (
                        <div
                            key={index}
                            className={`course-card course-color-${index % 4}`}
                            >
                            <h2>{course.coursename}</h2>
                            <button className="course-arrow" onClick={() => navigate(`/CoursePage/${course.idcourse}`)}>
                                <i className="fa-regular fa-circle-right arrow-icon"></i>
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-courses">Et ole luonut vielä yhtään kurssia</p>
                )}

            </div>

        </div>
    );
  } else if (user.role === "student") {
    return(
    <div className="container-fluid home-container">
        <div className="topbar">
            <h1 className="welcome-text">
                Hei {user.firstname} {user.lastname}!
            </h1>       

            <div className="topbar-right-icons">
                <button className="icon-button" onClick={e => navigate("/Profile")}>
                    <i className="fa-solid fa-circle-user"></i>
                </button>

                <button className="icon-button" onClick={e => logout()}>
                    <i className="fa-solid fa-sign-out-alt"></i>
                </button>

            </div>
        </div>

        <div className="divider"></div>

        <p className="info-text">
            Tehtävät ja kokeet 
        </p>

        <div className="row">
            
            {/* Today's exercises box */}
            <div className="col-md m-2">   
                <h2>{formatDate(selectedDate)}</h2>    
                <div className="info-card">
                    {exams.filter((ex) => {
                        if (!ex.start_time) return false;
                        const dt = new Date(ex.start_time);
                        const sel = new Date(selectedDate);
                        return dt.toDateString() === sel.toDateString();
                    }).length === 0 ? (
                        <p>Päivälle ei ole tehty kokeita.</p>
                    ) : (
                        exams.filter((ex) => {
                            if (!ex.start_time) return false;
                            const dt = new Date(ex.start_time);
                            const sel = new Date(selectedDate);
                            return dt.toDateString() === sel.toDateString();
                        }).map((ex) => {
                            const start = ex.start_time ? new Date(ex.start_time).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                            const end = ex.end_time ? new Date(ex.end_time).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                            return (
                                <div className="exam-row" key={ex.idexercise}>
                                    <i className="fa-solid fa-graduation-cap hat"></i>
                                    <div className="exam-time">{start}{end ? `-${end}` : ''}</div>
                                    <div className="exam-course">{ex.coursename}</div>
                                    <div className="exam-name">{ex.examname}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Tomorrow's exercises box */}
            <div className="col-md m-2">
                <h2>{formatDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}</h2>
                <div className="info-card">
                    {exams.filter((ex) => {
                        if (!ex.start_time) return false;
                        const dt = new Date(ex.start_time);
                        const tom = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
                        return dt.toDateString() === tom.toDateString();
                    }).length === 0 ? (
                        <p>Päivälle ei ole tehty kokeita.</p>
                    ) : (
                        exams.filter((ex) => {
                            if (!ex.start_time) return false;
                            const dt = new Date(ex.start_time);
                            const tom = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
                            return dt.toDateString() === tom.toDateString();
                        }).map((ex) => {
                            const start = ex.start_time ? new Date(ex.start_time).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                            const end = ex.end_time ? new Date(ex.end_time).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                            return (
                                <div className="exam-row" key={ex.idexercise}>
                                    <i className="fa-solid fa-graduation-cap hat"></i>
                                    <div className="exam-time">{start}{end ? `-${end}` : ''}</div>
                                    <div className="exam-course">{ex.coursename}</div>
                                    <div className="exam-name">{ex.examname}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* The calendar component */}
            <div className="col-md">
                <h2>Kalenteri</h2>
                <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} exams={exams} />
                <br />
                
                <h2>Tulossa</h2>
                <div className="info-card">
                    <p>Tähän tulee myöhemmin backendistä tietoa</p>
                    <br />
                    <br />
                    <br />
                </div>
            </div>
        </div>

        { /* The courses section */}
        <div className="divider"></div>

        { /* The search for courses-functionality */}
        <div className="row">
            <div className="col-6 col-sm-7 col-md-9"><h1>Kurssit</h1></div> 
            <div className="col-6 col-sm-5 col-md-3 student-add-courses-form align-self-center">
                <form onSubmit={(e) => {
                    e.preventDefault()
                    searchForCoursesByName()
                }}>
                    <div className="d-flex align-items-center position-relative w-100">
                        <i className="fa-solid fa-bars me-2" onClick={() => {if (studentCourseSearch) setShowStudentCourseSearch(!showStudentCourseSearch)}}></i>
                        <input 
                            id="courseSearch"
                            name="courseSearch"
                            value={studentCourseSearch}
                            onChange={(e) => setStudentCourseSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="form-control me-2 student-add-courses-input"
                            placeholder="Lisää kursseja"
                        />
                        <button className="btn" type="button" onClick={() => {searchForCoursesByName(); studentCourseSearch ? setShowStudentCourseSearch(true) : setShowStudentCourseSearch(false)}}>
                            <i className="fa-solid fa-magnifying-glass pointer-cursor"></i>
                        </button>
                        { /* Displaying the results of student's course name search */}
                        { showStudentCourseSearch && (
                                <div className="position-absolute top-100 start-0 w-100 rounded shadow mt-1 student-course-search-results" style={{zIndex: 5}}>
                                    { /* Pagination */}
                                    {currentResults.length > 0 ? 
                                        <nav className="mt-3">
                                            <ul className="pagination justify-content-center student-course-search-pagination">
                                                <li className={`page-item ${currentPage === 1 && "disabled"}`}>
                                                    <button type="button" className="page-link" onClick={() => setCurrentPage(p => p - 1)}>
                                                        <i className="fa-solid fa-angle-left pointer-cursor"></i>
                                                    </button>
                                                </li>

                                                {[...Array(totalPages)].map((_, i) => (
                                                <li key={i} className={`page-item ${currentPage === i + 1 && "active"}`}>
                                                    <button type="button" className="page-link" onClick={() => setCurrentPage(i + 1)}>
                                                    {i + 1}
                                                    </button>
                                                </li>
                                                ))}

                                                <li className={`page-item ${currentPage === totalPages && "disabled"}`}>
                                                    <button type="button" className="page-link" onClick={() => setCurrentPage(p => p + 1)}>
                                                        <i className="fa-solid fa-angle-right pointer-cursor"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav> : <></>
                                    }
                                    
                                    { /* Results */}
                                    {currentResults?.map((course) => (
                                        <div key={course.idcourse} className="p-2 border-bottom student-course-search-result" onClick={() => {setShowJoinCourseBox(true); setStudentChosenCourse(course)}}>
                                            {course.coursename}
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                        
                    </div>
                </form>
            </div>
        </div>

        {/* The section for showing all the courses the student is enrolled on */} 

        {/* Bring all the courses the student is part of here. */}  
        {/* If the course is not dividable by 2, make a new row */}
        <div className="row justify-content-evenly">
            {courses && courses.length > 0 ? (
                courses.map((course, index) => (
                    <div
                        key={index}
                        className={`course-card-student col-md-5 m-2 course-color-${index % 4}`}
                        onClick={() => navigate(`/CoursePage/${course.idcourse}`)}
                        >
                        <div className="text-truncate">
                            <h2 className="text-truncate">{course.coursename}</h2>
                            <p className="text-truncate">{course.course_description}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="no-courses">Et ole liittynyt vielä yhdellekään kurssille.</p>
            )}

        </div>
        { /* Show the hovering box here, the styles are the same used on coursepage, and can be found from coursePage.css */}
        {showJoinCourseBox && (
            <div className="modal-overlay">
                <div className="modal-dialog">
                    <div className="modal-header">
                        <h3>{studentChosenCourse.coursename}</h3>
                        <button type="button" className="modal-close" onClick={() => {setShowJoinCourseBox(false); setStudentChosenCourse()}}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="modal-body">
                        <h4>Kurssin kuvaus</h4>
                        <p>{studentChosenCourse.course_description}</p>
                        <br />
                        {studentChosenCourse.course_start_time ? (
                            <>
                                <h4>Kurssin aikaväli</h4>
                                <p>{studentChosenCourse.course_start_time} - {studentChosenCourse.course_end_time}</p>
                            </>
                        ) : (
                            <>
                                <h5>Kurssilla ei ole erikseen määriteltyä aikaväliä.</h5>
                            </>
                        )}
                        <br />
                        <div className="text-end">
                            <button type="button" className="btn edit-btn" onClick={() => addStudentToCourse()}>Liity kurssille</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
    );
  }
}

