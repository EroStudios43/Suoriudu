import React from "react";
import "./styles/home.css";
import { useNavigate } from "react-router-dom"
import Calendar from "../components/calendar.js";
import '@fortawesome/fontawesome-free/css/all.min.css';


function Home() {
  const navigate = useNavigate();


  return (
    <div className="home-container">
        <div className="topbar">
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/")}>
                Takaisin
            </button>
            <h1 className="welcome-text">
                Hei Sinä!*
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

        <div className="calendar-content">
            <div className="left-side">
            
                <div className="info-card">
                    <h2>Tänään</h2>
                    <p>Tänne tulee myöhemmin backendistä tietoa.</p>
                </div>

                <button className="marathon-btn">
                        Arviointimaraton
                </button>
            </div>

            <div className="right-side">
                <Calendar />
            </div>
        </div>

        <div className="courses-header">
            <h1>Kurssit</h1>

            <button className="create-course-btn" onClick={e => navigate("/CreateCourse")}>
                <i class="fa-solid fa-plus"></i>
            </button>
        </div>

        <div className="courses-content">
            <div className="course-card">
                <h2>Kurssi 1</h2>
            </div>
            <div className="course-card">
                <h2>Kurssi 2</h2>
            </div>
            <div className="course-card">
                <h2>Kurssi 3</h2>
            </div>
            <div className="course-card">
                <h2>Kurssi 4</h2>
            </div>

        </div>

    </div>
  );
}

export default Home;