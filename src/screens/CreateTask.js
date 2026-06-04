import React from "react";
import "./styles/createTask.css";
import { useNavigate } from "react-router-dom"

function CreateTask() {
  const navigate = useNavigate();

  return (
    <div className="task-page">
      <div className="task-paper">
        <h1>Luo tehtävä</h1>
        <button className="btn btn-link text-decoration-none task-back-button" onClick={() => navigate(-1)}>
          Takaisin
        </button>
      </div>
    </div>
  );
}

export default CreateTask;