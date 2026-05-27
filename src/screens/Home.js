import React, {useState} from "react";
import "./styles/home.css";
import { useNavigate } from "react-router-dom"
import Calendar from "../components/calendar.js";
import '@fortawesome/fontawesome-free/css/all.min.css';


function Home() {
    const navigate = useNavigate();

    const courses = [
    { name: "Kurssi 1" },
    { name: "Kurssi 2" },
    { name: "Kurssi 3" },
    { name: "Kurssi 4" },
    { name: "Kurssi 5" },
    { name: "Kurssi 6" },
    ];

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


  return (
    <div className="home-container">
        <div className="topbar">
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/")}>
                Takaisin
            </button>
            <h1 className="welcome-text">
                Moikka Sinä!*
            </h1>       

            <div className="topbar-right">
                <button className="icon-button" onClick={e => navigate("/TaskQuestions")}>
                    <i className="fa-solid fa-envelope"></i>
                </button>

                <button className="icon-button" onClick={e => navigate("/Profile")}>
                    <i className="fa-solid fa-circle-user"></i>
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
            {courses.map((course, index) => (
                <div
                    key={index}
                    className={`course-card course-color-${index % 4}`}
                    >
                    <h2>{course.name}</h2>
                    <button className="course-arrow" onClick={() => navigate("/CoursePage")}>
                        <i class="fa-regular fa-circle-right arrow-icon"></i>
                    </button>
                </div>
            ))}

        </div>

    </div>
  );
}

export default Home;