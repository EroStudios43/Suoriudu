import React from "react";
import "./styles/welcome.css";
import { useNavigate } from "react-router-dom"

function WelcomePage() {
  const navigate = useNavigate();


  return (
    <div className="container container-welcomepage">
        <h1>Kokelas</h1>
        <p>Tehtävä ja koe palvelu</p>

            <div className="buttons">
                <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/login")}>
                    Opettajat
                </button>

            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/login")}>
                Oppilaat
            </button>
        </div>
        
    </div>
  );
}

export default WelcomePage;