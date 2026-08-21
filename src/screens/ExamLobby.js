import React, { useState, useEffect, useCallback } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";

import katsekuva1 from "../pictures/katsekuva1.png"
import katsekuva2 from "../pictures/katsekuva2.png"
import valilehtikuva1 from "../pictures/valilehtikuva1.png"
import valilehtikuva2 from "../pictures/valilehtikuva2.png"
import selainkuva1 from "../pictures/selainkuva1.png"
import selainkuva2 from "../pictures/selainkuva2.png"

const url = process.env.REACT_APP_API_URL

function ExamLobby () {
  // Variables for navigation and getting some values from previous page
  const navigate = useNavigate();
  const location = useLocation();

  // Variables from the previous page and user from useUser
  const { idexercise } = useParams()
  const { user, updateToken } = useUser()
  const [ idcourse, setIdCourse ] = useState(location.state?.idcourse || "")
  const [ idweek, setIdWeek ] = useState(location.state?.idweek)

  // Variable for storing exercise data
  const [ exercisedata, setExercisedata ] = useState({})

  // Variable for user permission for AI checking
  const [ allowAi, setAllowAi ] = useState(false)

  // Variables for exam form
  const [ studentPass, setStudentPass ] = useState("")
  const [ passwordValid, setPasswordValid ] = useState(true)

  const fetchExerciseData = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet")
      return null
    }

    // Check that the other needed variables are defined
    if (!idexercise) {
      console.log("Needed variables missing from request")
      return null
    }

    // Create the request to backend
    try {
      const response = await axios.get(
        url + "/courses/exercisedata",
        {
          params: {idexercise: idexercise},
          headers: { Authorization: "Bearer " + user.access_token},
          signal
        }
      )
      console.log(response.data)
      setExercisedata(response.data.exercise)
      updateToken(response)
      return response.data
    } catch (error) {
      console.log("Error fetching exercise results: ", error.response?.data || error.message)
      if (error.status === 404) {
        console.log("Course not found. Navigating to home page.")
      }
    } 

  }, [idweek, user?.access_token])

  const { data, loading, error } = useFetchData(fetchExerciseData)

  const handleSubmit = async () => {
    try {
      // Check that user has access token
      if (!user || !user.access_token) {
        console.log("No user or token yet")
        return null
      }

      // Check that the other needed variables are defined
      if (!idexercise) {
        console.log("Needed variables missing from request")
        return null
      }

      if (!allowAi) {
        console.log("Allow AI must be checked in order to do the exam.")
        return null
      }

      if (studentPass.length <= 0 || !studentPass) {
        console.log("No password given")
        return null
      }

      const postData = {
        idexercise: idexercise,
        allowAi: allowAi,
        studentPass: studentPass
      }

      const response = await axios.post(url + "/courses/validateExamPassword", postData, {headers: {Authorization: "Bearer " + user.access_token}})

      console.log(response.data.match)
      if(response.data?.match) {
        setPasswordValid(true)
        navigate(`/TestQuestions/${idexercise}`, {state: { idweek: idweek, idcourse: idcourse, examCodeMatch: response.data?.match }})
      } else {
        // Alert for wrong exam password
        setPasswordValid(false)
      }

    } catch (error) {
      console.log("Error while checking exam code: ", error)
      // Alert for wrong exam password
      setPasswordValid(false)
    }
  }

  if (user.role === "student" || user.role === "teacher"){
    return (
      <div className="container-fluid coursepage d-flex flex-column min-vh-100 exercises-container">
          { /* Topbar */}
          <div className="d-flex flex-column flex-md-row">
            <div className="flex">
              { /* Title and description */}
              <div className="course-title">
                <i className="fa-regular fa-circle-left back-icon d-inline" onClick={e => navigate(`/WeeksExercises/${location.state.idweek}`, {state: {idcourse: idcourse}})}></i>
                <div className="student-course-titles d-block">
                  <h1 className="text-truncate">{exercisedata?.exercise_name}</h1>
                  <h3 className="course-description-student text-truncate">{exercisedata?.exercise_description}</h3>
                  <span className="d-block"><small className="text-secondary">
                    {new Date(exercisedata.start_time).toLocaleString("fi-FI", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - 
                    {new Date(exercisedata.end_time).toLocaleString("fi-FI", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small></span>
                  <span className="d-block">
                    <small className="text-secondary">
                      Suoritusaika: {exercisedata?.max_time || "Ei määritelty"}
                    </small>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <br />
          <br />
          <div className="d-flex justify-content-center">
            <div className="ms-3 p-2 border-secondary border-3 border-end text-center">
              <img className="warning-picture d-inline me-2" src={katsekuva1} alt="Kuva katsekontaktista näyttöön" />
              <img className="warning-picture d-inline mt-2 mt-lg-0" src={katsekuva2} alt="Kuva pään käännöstä" />
              <p className="text-white warning-text mt-1 text-start">Pidä katseesi omassa näytössä. <br /> Pään kääntö aiheuttaa merkinnän.</p>
            </div>
            <div className="p-2 border-secondary border-3 border-end text-center">
              <img className="warning-picture d-inline me-2" src={valilehtikuva1} alt="Kuva oikeasta välilehdestä" />
              <img className="warning-picture d-inline mt-2 mt-lg-0" src={valilehtikuva2} alt="Kuva välilehden vaihdosta" />
              <p className="text-white warning-text mt-1 text-start">Välilehden vaihtaminen aiheuttaa merkinnän.</p>
            </div>
            <div className="me-3 p-2  text-center">
              <img className="warning-picture d-inline me-2" src={selainkuva1} alt="Kuva koeselaimesta" />
              <img className="warning-picture d-inline mt-2 mt-lg-0" src={selainkuva2} alt="Kuva selaimen tai ikkunan vaihdosta" />
              <p className="text-white warning-text mt-1 text-start">Ikkunan vaihtaminen aiheuttaa merkinnän.</p>
            </div>
          </div>
          <br />
          <br />
          <br />
          <div className="row">
            <div className="col-md-2" />
            <div className="col-md-4">
              <div className="student-allow-ai-box d-flex">
                <input type="checkbox" className="form-check-input me-3" id="student-allow-ai-check" onClick={() => setAllowAi(!allowAi)}/>
                <label htmlFor="student-allow-ai-check">Ymmärrän, että kokeeni aikana käytetään tekoälyä välilehtien ja katseen seurantaan. Välilehtiäsi tai kamerakuvaasi ei tallenneta.</label>
              </div>
            </div>
            <div className="col-md-4">
              <form noValidate onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="exam-password"></label>
                <input type="password" className={`form-control p-2 ${!passwordValid ? "is-invalid" : "mb-4"}`} id="exam-password" value={studentPass} placeholder="Syötä kokeen koodi" onChange={e => setStudentPass(e.target.value)}/>
                <div className="invalid-feedback mb-2">Kokeen koodi virheellinen</div>
                <div className="d-grid">
                  <button type="button" className="btn btn-exam rounded-3 p-2 mt-1" onClick={() => handleSubmit()} disabled={(allowAi && studentPass.length > 0) ? false : true}>Kokeeseen</button>
                </div>
              </form>
            </div>
            <div className="col-md-2" />
          </div>
      </div>
    );
  }
}

export default ExamLobby