import React, {useState} from "react";
import "./calendar.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
 
function Calendar({ selectedDate = new Date(), onDateSelect, exams = [] }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const today = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const firstDayOfMonth = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Adjusting Monday as the first day
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const monthYearString = currentDate.toLocaleString("default", { month: "long", year: "numeric" });


    const dates = []

    for (let i = firstDayOfMonth; i > 0; i--) {
        dates.push(
            <div key={`prev-${i}`} className="date inactive">
                {prevMonthDays - i + 1}
            </div>
        );
    }

    for(let i = 1; i <= totalDays; i++) {
        const date = new Date(currentYear, currentMonth, i);

        const isSelected  = selectedDate && date.toDateString() === selectedDate.toDateString();

        const isToday = date.toDateString() === today.toDateString()

        const hasExam = exams.some(e => {
            if (!e?.start_time) return false;
            const dt = new Date(e.start_time);
            return dt.toDateString() === date.toDateString();
        });

        const classNames = ["date", isSelected ? "selected" : "", isToday ? "today" : "", hasExam ? "exam" : ""].filter(Boolean).join(" ");

        dates.push(
            <div key={i} className={classNames} onClick={() => onDateSelect(date)}>
                <span className="date-number">{i}</span>
            </div>
        );
    }



    const prevMonth = () => {
        setCurrentDate(
        new Date(currentYear, currentMonth - 1, 1)
        );
    };

    const nextMonth = () => {
        setCurrentDate(
        new Date(currentYear, currentMonth + 1, 1)
        );
    };


  return (

    <div className="calendar">
        <div className="calendar-header">
            <button id="prev-month" onClick={prevMonth}>
                <i className="fa-solid fa-chevron-left arrow-icon"></i>
            </button>

            <div className="month-year" id="month-year">{monthYearString}</div>

            <button id="next-month" onClick={nextMonth}>
                <i className="fa-solid fa-chevron-right arrow-icon"></i>
            </button>
        </div>
        <div className="calendar-days">
            <div className="day">Mon</div>
            <div className="day">Tue</div>
            <div className="day">Wed</div>
            <div className="day">Thu</div>
            <div className="day">Fri</div>
            <div className="day">Sat</div>
            <div className="day">Sun</div>
        </div>
        <div className="calendar-dates" id="dates">
            {dates}
        </div>
    </div>
    
  );
}

export default Calendar;