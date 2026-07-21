import React, { useState, useEffect, useCallback } from "react";
import "./styles/exercises.css";
import { useUser } from "../context/useUser.js";
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios";
import useFetchData from "../hooks/fetchHookWithNavState.js";

const url = process.env.REACT_APP_API_URL;

function TaskQuestions() {
  // Variables for navigation and getting some values from previous page
  const navigate = useNavigate();
  const location = useLocation();

  // Variables from the previous page and user from useUser
  const { idexercise } = useParams()
  const { user, updateToken } = useUser()
  const [ idcourse, setIdCourse ] = useState(location.state?.idcourse || "")

  // Data for tasks and exercise
  const [ tasks, setTasks ] = useState([])
  const [ taskResults, setTaskResults ] = useState([])
  const [ exercisedata, setExercisedata ] = useState({})

  const fetchUserExerciseAndTaskData = useCallback(async (signal) => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      return null
    }

    // Check that the other variables are defined
    if (!idcourse || !idexercise) {
      console.log("Variables not set yet")
      return null
    }

    try {
      const response = await axios.get(
        url + "/courses/userExerciseDataAndTasks",
        {
          params: {iduser: user.id, idcourse: idcourse, idexercise: idexercise},
          headers: { Authorization: "Bearer " + user.access_token},
          signal
        }
      )

      console.log(response.data)
      return response.data
      
    } catch (error) {
      console.log("Error fetching exercise data:", error.response?.data || error.message)
      if (error.status === 404) {
        console.log("Course not found. Navigating to home page.")
      }
    }
  }, [user?.id, user?.access_token, idexercise])

  const { data, loading, error } = useFetchData(fetchUserExerciseAndTaskData)

  useEffect(() => {
    // Check that user has access token
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      return;
    }

    // Fallback in case the course id is not set in state
    // Needed in the back-button.
    if (!location.state?.idcourse) {
      // Add fallback code here, not done yet
      console.log("Fetch data manually with id")
    }

    console.log(data)

  }, [user?.access_token, idexercise])

  return (
    <div className="body">
        <div className="container">
            <h1>Kysymykset</h1>
            <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={e => navigate(`/WeeksExercises/${location.state.idweek}`)}>
                    Takaisin
            </button>
            
        </div>

    </div>
  );
}

export default TaskQuestions;