import React from "react";
import "./styles/home.css";
import { useNavigate } from "react-router-dom"

function CreateExam() {
  const navigate = useNavigate();

  return (
    <div className="body">
        <div className="container">
            <h1>Luo koe</h1>
            <button className="btn btn-link text-decoration-none task-back-button" onClick={() => navigate(-1)}>
                    Takaisin
            </button>
            
        </div>

    </div>
  );
}

export default CreateExam;