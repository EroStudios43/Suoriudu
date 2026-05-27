import React from "react";
import "./styles/welcome.css";
import { useNavigate } from "react-router-dom"

function WelcomePage() {
  const navigate = useNavigate();


  return (
    <div className="body">
        <div className="container">
            <h1>Kokelas</h1>
            <p>Tehtävä ja koe palvelu</p>

            <div className="buttons">
                <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/home")}>
                    Opettajat
                </button>

                <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/login")}>
                    Oppilaat
                </button>
            </div>
            
        </div>
        <div>
            <svg
            className="waves"
            viewBox="0 24 150 28"
            preserveAspectRatio="none"
            shape-rendering="auto"
            >
            <defs>
                <path
                id="gentle-wave"
                d="M-160 42c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                />
            </defs>
            <g className="parallax">
                <use href="#gentle-wave" x="48" y="0" fill="#20294A" />
                <use href="#gentle-wave" x="48" y="3" fill="#2B385B" />
                <use href="#gentle-wave" x="48" y="5" fill="#525D7D" />
                <use href="#gentle-wave" x="48" y="7" fill="#979DAD" />
            </g>
            </svg>

            </div>
    </div>
  );
}

export default WelcomePage;