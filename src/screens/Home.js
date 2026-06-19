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

    const logout = () => {
      signOut()
      localStorage.clear();
      navigate("/")
    }

    useEffect(() => {
        console.log("USER CHANGED:", user);
    }, [user]);
        

    const [selectedDate, setSelectedDate] = useState(new Date());


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

            console.log("COURSES RESPONSE:", response.data);
            setCourses(response.data);

        } catch (error) {
            console.error("API ERROR:", error.response?.data || error.message);
        }
    };

    getCourses();
}, [user, refresh]);

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
                        <p>Tänne tulee myöhemmin backendistä tietoa.</p>
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
                    <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate}/>
                </div>
            </div>

            <div className="courses-header">
                <h1>Kurssit</h1>

                <button className="create-course-btn" onClick={e => navigate("/CreateCourse")}>
                    <i class="fa-solid fa-plus"></i>
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
                                <i class="fa-regular fa-circle-right arrow-icon"></i>
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
                <h2>{formatDate(new Date())}</h2>    
                <div className="info-card">
                    <p>Tänne tulee myöhemmin backendistä tietoa.</p>
                </div>
            </div>

            {/* Tomorrow's exercises box */}
            <div className="col-md m-2">
                <h2>
                    { /* Getting tomorrow's date in order for the formatDate function to return
                     the right information. If the date is changed from the calendar, 
                     change it to that date. */}

                    {formatDate(
                        (() => {
                        const d = new Date();
                        if (d.getDate() === selectedDate.getDate()) {
                            d.setDate(d.getDate() + 1);
                            return d;
                        } else {
                            return selectedDate
                        }
                        })()
                    )}
                </h2>  
                <div className="info-card">
                    <p>Tänne tulee myöhemmin backendistä tietoa.</p>
                </div>
            </div>

            {/* The calendar component */}
            <div className="col-md">
                <h2>Kalenteri</h2>
                <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate}/>
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

        <div className="row">
            <div className="col-6 col-sm-7 col-md-9"><h1>Kurssit</h1></div> 
            <div className="col-6 col-sm-5 col-md-3 student-add-courses-input align-self-center">
                <form>
                    <div className="row">
                        <div className="col-2 col-sm-1 align-self-center">
                            <i className="fa-solid fa-bars"></i>
                        </div>
                        <div className="col-8 col-sm-9 align-self-center">
                            <input 
                                id="courseSearch"
                                name="courseSearch"
                                className="form-control"
                                placeholder="Lisää kursseja"
                            />
                        </div>
                        <div className="col-2 col-sm-1 align-self-center">
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </div>
                    </div>
                </form>
            </div>
        </div>

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
                            <h2>{course.coursename}</h2>
                            <p>{course.course_description}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="no-courses">Et ole liittynyt vielä yhdellekään kurssille.</p>
            )}

        </div>

    </div>
    );
  }
}

