import React from "react";
import "./styles/home.css";
import "./styles/login.css";
import { useNavigate } from "react-router-dom"

function CoursePage() {
  const navigate = useNavigate();


  return (
    <div className="body">
        <div className="container">
            <h1>Kurssin nimi</h1>
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/home")}>
                    Takaisin
            </button>

            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/CreateTask")}>
                    Luo uusi tehtävä
            </button>

            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/CreateExam")}>
                    Luo uusi testi
            </button>
            
        </div>

    </div>
  );
}

export default CoursePage;