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
        return date.toLocaleDateString("fi-FI", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
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
                <p className="no-courses">et ole luonut vielä yhtään kurssia</p>
            )}

        </div>

    </div>
  );
}

