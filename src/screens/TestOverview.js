import React from "react";
import "./styles/home.css";
import { useNavigate } from "react-router-dom"

function TestOverview() {
  const navigate = useNavigate();

  return (
    <div className="body">
        <div className="container">
            <h1>Tarkastele koetta</h1>
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate(-1)}>
                    Takaisin
            </button>
            
        </div>

    </div>
  );
}

export default TestOverview;