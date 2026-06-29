import React, {useState, useEffect} from "react";
import "./styles/createCourse.css";
import { useNavigate } from "react-router-dom"
import Calendar from "../components/calendar.js";
import TimePicker from "../components/timepicker.js";
import axios from "axios";
import { useUser } from "../context/useUser.js";

const url = process.env.REACT_APP_API_URL;


function CreateCourse() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [courseName, setCourseName] = useState(() => {return localStorage.getItem("draftcourseName") || "";});
  const [courseDescription, setCourseDescription] = useState(() => {return localStorage.getItem("draftcourseDescription") || "";});

  const [startDate, setStartDate] = useState(() =>{
    const saved = localStorage.getItem("draftcourseStartDate");
    return saved ? new Date(saved) : new Date();
  });
  const [endDate, setEndDate] = useState(() =>{
    const saved = localStorage.getItem("draftcourseEndDate");
    if (saved) {
      return new Date(saved);
    }
    const future = new Date();
    future.setDate(future.getDate() + 49);
    return future;
  });


  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  const [startTime, setStartTime] = useState("12:00");

  const [weeks, setWeeks] = useState(() => {
    const savedWeeks = localStorage.getItem("draftcourseWeeks");
    return savedWeeks ? JSON.parse(savedWeeks) :
    [{
      id: 1,
      title: "Viikko 1",
      expanded: true,
      content: "",
      exercises: []
    }];
  });


  //save info to localsrorage
  useEffect(() => {
    localStorage.setItem("draftcourseName", courseName);
  }, [courseName]);

  useEffect(() => {
    localStorage.setItem("draftcourseDescription", courseDescription);
  }, [courseDescription]);

  useEffect(() => {
    localStorage.setItem("draftcourseWeeks", JSON.stringify(weeks));
  }, [weeks]);

  useEffect(() => {
    localStorage.setItem("draftcourseStartDate", startDate.toISOString());
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem("draftcourseEndDate", endDate.toISOString());
  }, [endDate]);

  // get saved exercises as they are made
  useEffect(() => {
    const savedExercises = JSON.parse(localStorage.getItem("draftExercises")) || {};
    setWeeks(prev =>
      prev.map((week, index) => ({
        ...week,
        exercises: savedExercises[index] || []
      }))
    )

  }, [])

  const handleAddWeek = () => {
    setWeeks((prevWeeks) => {
      const nextIndex = prevWeeks.length + 1;
      const nextWeek = {
        id: Date.now(),
        title: `Viikko ${nextIndex}`,
        expanded: true,
        content: "",
        exercises: []
      };
      return prevWeeks.map((week) => ({ ...week, expanded: false })).concat(nextWeek);
    });
  };

  const toggleWeek = (index) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((week, idx) => ({
        ...week,
        expanded: idx === index ? !week.expanded : false,
      }))
    );
  };

  const handleWeekTitleChange = (index, value) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((week, idx) =>
        idx === index ? { ...week, title: value } : week
      )
    );
  };

  const handleWeekContentChange = (index, value) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((week, idx) =>
        idx === index ? { ...week, content: value } : week
      )
    );
  };

  const handleAddTask = (weekIndex) => {
    console.log(`Lisää tehtävä viikkoon ${weekIndex + 1}`);
  };

  const handleAddExam = (weekIndex) => {
    console.log(`Lisää koe viikkoon ${weekIndex + 1}`);
  };

  const handleStartDateChange = (date) => {
    const updatedStart = new Date(date);
    updatedStart.setHours(startDate.getHours(), startDate.getMinutes());
    setStartDate(updatedStart);

    const updatedEnd = new Date(updatedStart);
    updatedEnd.setDate(updatedEnd.getDate() + 49);
    setEndDate(updatedEnd);
    setShowStartCalendar(false)

    setShowStartTime(true);  
  };

  const handleEndDateChange = (date) => {
    const updatedEnd = new Date(date);
    updatedEnd.setHours(endDate.getHours(), endDate.getMinutes());
    setEndDate(updatedEnd);
    setShowEndCalendar(false)
    setShowEndTime(true);  
  }

  const handleStartTimeChange = (date) => {
    const updatedStart = new Date(date);

    setStartDate(updatedStart);

    const updatedEnd = new Date(updatedStart);
    updatedEnd.setDate(updatedEnd.getDate() + 49);

    setEndDate(updatedEnd);

    setShowStartTime(false);
  }

  const handleEndTimeChange = (date) => {
    const updatedEnd = new Date(date);
    setEndDate(updatedEnd);

    setShowEndTime(false);
  }

  const formatDateTime = (date) => {
    return date.toLocaleString("fi-FI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
  };



  const getWeekDates = (weekIndex) => {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + weekIndex * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6)
    return{
      start: weekStart,
      end: weekEnd
    }
  }

  const toDateTimeLocal = (date) => {
      if (!date) return "";

      const d = new Date(date);
      if (isNaN(d.getTime())) return "";

      const pad = (n) => String(n).padStart(2, "0");

      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };


  const deleteWeek = (weekId) => {
    setWeeks(prev => {
      // Poista viikko
      const updatedWeeks = prev.filter(w => w.id !== weekId);

      // Poista myös tehtävät oikealta viikolta
      const savedExercises = JSON.parse(localStorage.getItem("draftExercises")) || {};

      const newExercises = {};
      updatedWeeks.forEach((_, newIndex) => {
        // Mappaa tehtävät uudelleen järjestyksen mukaan
        newExercises[newIndex] = savedExercises[newIndex] || [];
      });

      localStorage.setItem("draftExercises", JSON.stringify(newExercises));

      return updatedWeeks;
    });
  };



  const handleDeleteExercise = (weekIndex, exerciseId) => {
    setWeeks(prev => {
      const updated = prev.map((week, idx) => {
        if (idx !== weekIndex) return week;

        return {
          ...week,
          exercises: week.exercises.filter(e => e.id !== exerciseId)
        };
      });

      // Päivitä myös localStorage
      const savedExercises = JSON.parse(localStorage.getItem("draftExercises")) || {};
      savedExercises[weekIndex] = savedExercises[weekIndex]?.filter(e => e.id !== exerciseId) || [];

      localStorage.setItem("draftExercises", JSON.stringify(savedExercises));

      return updated;
    });
  };

  // Save course to backend 
  const createCourse = async () => {


    if (!courseName.trim()) {
      alert("Kurssin nimi on pakollinen");
      return;
    }
    const courseObj = {
      name: courseName || "",
      course_description: courseDescription  || "",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      weeks: weeks.map(w => ({ title: w.title, content: w.content, exercises: w.exercises || [] }))
    };

    try {
      const res = await axios.post(url + "/courses", courseObj, { headers: {Authorization: "Bearer " + user.access_token }});
      console.log("Course created with ID:", res.data.idcourse);
      setCourseName("");
      setCourseDescription("");

      localStorage.removeItem("draftcourseName");
      localStorage.removeItem("draftcourseDescription");
      localStorage.removeItem("draftcourseWeeks");
      localStorage.removeItem("draftcourseStartDate");
      localStorage.removeItem("draftcourseEndDate");
      localStorage.removeItem("draftExercises");
      navigate("/home", {state: { refresh: true }});
    } catch (error) {
      console.error("Error creating course:", error);
    }
  }

  return (
    <div className="createCourse-container">
      <div className="topbar">
            <div className="topbar-left">
              <div className="logo">
                <i class="fa-regular fa-circle-left back-icon" onClick={e => navigate("/home")}></i>
                
                <input
                  type="text"
                  placeholder="Kurssin nimi..."
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="course-input"
                />    
                <i className="fa-solid fa-pen-to-square pen"></i>
              </div>
              <input
                type="text"
                placeholder="Kuvaus.."
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                className="course-input"
              /> 
            </div> 

            <div className="topbar-right">
                <button className="icon-button">
                    <i className="fa-solid fa-user-plus"></i>
                </button>

            </div>

        </div>

        <div className="divider"></div>

        <div className="date-container">
            <div className="date-box">

              <h3 className="date-title" >
                  Aloitus
              </h3>

              <p className="date-value" onClick={() => {setShowStartCalendar(true); setShowEndCalendar(false);}}> {formatDateTime(startDate)}</p>

              {showStartCalendar && (
                  <div className="popup">
                      <Calendar selectedDate={startDate} onDateSelect={handleStartDateChange}/>
                  </div>
              )}
              
              {showStartTime && (
                  <TimePicker
                    open={showStartTime}
                    value={startDate}
                    onChange={handleStartTimeChange}
                    onClose={() => setShowStartTime(false)}
                  />
              )}

            
            </div>

            <div className="date-box">

              <h3 className="date-title">
                  Lopetus
              </h3>

              <p className="date-value" onClick={() => {setShowEndCalendar(true); setShowStartCalendar(false);}}> {formatDateTime(endDate)} </p>

              {showEndCalendar && (
                  <div className="popup">
                      <Calendar selectedDate={endDate} onDateSelect={handleEndDateChange}/>
                  </div>
              )}

              {showEndTime && (
                <TimePicker
                  open={showEndTime}
                  value={endDate}
                  onChange={handleEndTimeChange}
                  onClose={() => setShowEndTime(false)}
                />
              )}

            </div>

        </div>
        <div className="weekscontainer">
          <div className="weeks-header">
            <button className="add-week-button" onClick={handleAddWeek}>
              Lisää viikkoja <i className="fa-solid fa-plus"></i>
            </button>
          </div>

          {weeks.map((week, index) => (
            <div className="week-card" key={week.id}>
              <div className="week-header" onClick={() => toggleWeek(index)}>
                <div className="week-header-left">
                  <i className={`fa-solid ${week.expanded ? "fa-chevron-down" : "fa-chevron-right"} week-toggle-icon`} />
                  <input
                    className="week-title-input"
                    value={week.title}
                    onChange={(e) => handleWeekTitleChange(index, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                 <i className="fa-solid fa-xmark week-delete-icon" onClick={(e) => {e.stopPropagation(); deleteWeek(week.id);}}
                />
              </div>

              {week.expanded && (
                <div className="week-body">
                  <textarea
                    className="week-textarea"
                    value={week.content}
                    onChange={(e) => handleWeekContentChange(index, e.target.value)}
                    placeholder="Lisää tähän viikko aineisto"
                  />

                  <div className="week-actions">
                    <button className="week-button" onClick={() => navigate("/createTask", {state: {weekIndex: index, defaultStartTime: toDateTimeLocal(getWeekDates(index).start), defaultEndTime: toDateTimeLocal(getWeekDates(index).end)}})}>
                      Lisää tehtävä viikkoon +
                    </button>
                    <button className="week-button" onClick={() => navigate("/createExam", { state: { weekIndex: index} })}>
                      Lisää koe viikkoon +
                    </button>
                  </div>

                  <div className="week-exercises">
                    <div className="tasks-section">
                      <h4>Tehtävät</h4>

                      {week.exercises
                        ?.filter(e => e.exercise_type === "task")
                        .map((exercise, i) => (
                          <div key={exercise.id} className="exercise-item task">
                            <span>{exercise.exercise_name}</span>
                            <div className="exercise-actions">
                              <i className="fa-solid fa-pen-to-square edit-icon" onClick={() => navigate("/createTask", {state: {weekIndex: index, editMode: true, exercise}})}/>
                              <i className="fa-solid fa-trash delete-icon" onClick={() => handleDeleteExercise(index, exercise.id)} />

                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="exams-section">
                      <h4>Kokeet</h4>

                      {week.exercises
                        ?.filter(e => e.exercise_type === "exam")
                        .map((exercise, i) => (
                          <div key={exercise.id} className="exercise-item exam">
                            <span>{exercise.exercise_name}</span>
                            <div className="exercise-actions">
                              <i className="fa-solid fa-pen-to-square edit-icon" onClick={() => navigate("/createExam", {state: {weekIndex: index, editMode: true, exercise}})}/>
                              <i className="fa-solid fa-trash delete-icon"onClick={() => handleDeleteExercise(index, exercise.id)}/>

                            </div>
                          </div>
                        ))}
                    </div>

                  </div>
                </div>
              )}

              {index !== weeks.length - 1 && <div className="week-divider"></div>}
            </div>
          ))}
        </div>
        <div className="create-course-footer">
          <button className="create-course-submit" onClick={createCourse}>
            Luo kurssi
          </button>
        </div>
    </div>
  );
}


export default CreateCourse;