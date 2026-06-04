import React from "react";
import "./styles/home.css";
import { useNavigate } from "react-router-dom"

function TaskOverview() {
  const navigate = useNavigate();


  return (
    <div className="body">
        <div className="container">
            <h1>Tarkastele kurssia</h1>
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/")}>
                    Takaisin
            </button>
            
        </div>

    </div>
  );
}

export default TaskOverview;