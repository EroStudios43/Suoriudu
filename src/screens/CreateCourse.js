import React, {useState, useEffect} from "react";
import "./styles/createCourse.css";
import { useNavigate } from "react-router-dom"
import Calendar from "../components/calendar.js";
import TimePicker from "../components/timepicker.js";


function CreateCourse() {
  const navigate = useNavigate();
  const [courseName, setCourseName] = useState(localStorage.getItem("courseName") || "Anna kurssille nimi..");
  const [courseDescription, setCourseDescription] = useState(localStorage.getItem("courseDescription") );

  const [startDate, setStartDate] = useState(() =>{
    const now = new Date();
    return now;
  });
  const [endDate, setEndDate] = useState(() =>{
    const future = new Date();
    future.setDate(future.getDate() + 49);
    return future;
  });


  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  const [startTime, setStartTime] = useState("12:00");

  useEffect(() => {
    localStorage.setItem("courseName", courseName);
    localStorage.setItem("courseDescription", courseDescription);
  }, [courseName, courseDescription]);

  const [weeks, setWeeks] = useState([{
    id: 1,
    title: "Viikko 1",
    expanded: true,
    content: ""
  }]);

  const handleAddWeek = () => {
    setWeeks((prevWeeks) => {
      const nextIndex = prevWeeks.length + 1;
      const nextWeek = {
        id: Date.now(),
        title: `Viikko ${nextIndex}`,
        expanded: true,
        content: ""
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
                <i className={`fa-solid ${week.expanded ? "fa-chevron-down" : "fa-chevron-right"} week-toggle-icon`} />
                <input
                  className="week-title-input"
                  value={week.title}
                  onChange={(e) => handleWeekTitleChange(index, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
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
                    <button className="week-button" onClick={() => navigate("/createTask")}>
                      Lisää tehtävä viikkoon +
                    </button>
                    <button className="week-button" onClick={() => navigate("/createExam")}>
                      Lisää koe viikkoon +
                    </button>
                  </div>
                </div>
              )}

              {index !== weeks.length - 1 && <div className="week-divider"></div>}
            </div>
          ))}
        </div>
    </div>
  );
}


export default CreateCourse;