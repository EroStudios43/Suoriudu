import React, {useState, useEffect} from "react";
import "./styles/createCourse.css";
import { useNavigate } from "react-router-dom"

function CreateCourse() {
  const navigate = useNavigate();
  const [courseName, setCourseName] = useState(localStorage.getItem("courseName") || "Anna kurssille nimi");


  useEffect(() => {
      localStorage.setItem("courseName", courseName);
    }, [courseName]);

  return (
    <div className="createCourse-container">
      <div className="topbar">
            <input
              type="text"
              placeholder="Kurssin nimi..."
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="course-input"
            />     

            <div className="topbar-right">
                <button className="icon-button">
                    <i className="fa-solid fa-user-plus"></i>
                </button>

            </div>

        </div>

        <div className="divider"></div>

        <div className="container">
            <h1>Luo kurssi</h1>
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate("/home")}>
                    Takaisin
            </button>
            
        </div>

    </div>
  );
}

export default CreateCourse;