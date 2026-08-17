import { useEffect, useState } from "react"
import "./progressbartimer.css"

const ProgressBarTimer = ({ studentExamStartTime, exerciseEndTime, examDuration, fiveMinutesLeft, setFiveMinutesLeft, zeroTimeRemaining, setZeroTimeRemaining }) => {
  // Time remaining in the exam
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [progress, setProgress] = useState(100)

  // Variables for the progress circle
  const size = 150
  const trackWidth = 10
  const indicatorWidth = 10
  const indicatorCap = "round"
  const label = "loading..."
  const labelColor = `#333`
  const spinnerMode = false
  const spinnerSpeed = 1

  const center = size / 2,
        radius = center - (trackWidth > indicatorWidth ? trackWidth : indicatorWidth),
        dashArray = 2 * Math.PI * radius,
        dashOffset = dashArray * ((100 - progress) / 100)

  useEffect(() => {
    if (!studentExamStartTime || !exerciseEndTime) {
      return
    }

    const studentStart = new Date(studentExamStartTime).getTime()
    const exerciseEnd = new Date(exerciseEndTime).getTime()

    // Convert hours to milliseconds
    let [hours, minutes, seconds] = examDuration.split(":").map(Number)

    // Make sure that all of these are present. If not, set to 0.
    if (!hours || typeof hours === 'undefined') {
      hours = 0
    }

    if (!minutes || typeof minutes === 'undefined') {
      minutes = 0
    }

    if (!seconds || typeof seconds === 'undefined') {
      seconds = 0
    }

    const durationMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000

    // Student's end time
    const calculatedEndingTime = studentStart + durationMs

    // Get the real ending time by getting the minimum between the calculated time and the exam's end time
    const actualEndTime = Math.min(calculatedEndingTime, exerciseEnd)
    const actualDuration = actualEndTime - studentStart

    // Function for updating the timer itself
    const updateTimer = () => {
      const now = Date.now()
      const remainingTime = Math.max(0, actualEndTime - now)
      setTimeRemaining(remainingTime)
      
      // Check if remaining time is below 5 minutes, or zero.
      //   -> If < 5min, show warning on the exam page
      //   -> If < 0, show info on the exam page and submit answers
      // Variables themselves are set here, and the functionality is on the exam page itself

      if (remainingTime <= 5 * 60 * 1000 && remainingTime > 0 && !fiveMinutesLeft) {
        setFiveMinutesLeft(true)
      }

      if (remainingTime <= 0 && !zeroTimeRemaining) {
        setZeroTimeRemaining(true)
      }

      const remainingPercentage = actualDuration > 0 ? (remainingTime / actualDuration) * 100 : 0

      setProgress(Math.min(100, Math.max(0,remainingPercentage)))
    }

    updateTimer()

    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)

  }, [studentExamStartTime, exerciseEndTime, examDuration, fiveMinutesLeft, zeroTimeRemaining])

  // Convert ms => HH:MM:SS
  const totalSeconds = Math.ceil(timeRemaining / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const formattedTime = hours > 0 ?
    `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`

  // Function for changing the circle color with the remaining time
  const getTimerColor = (progress) => {
    // Set color to bs5 danger if less than five minutes are left
    if (timeRemaining <= 5 * 60 * 1000) {
      return "#dc3545"
    }

    // More than 40% of time remaining
    if (progress > 40) {
      return "#6752AD"
    }

    // Less than 40% but more than 20% of time remaining
    if (progress > 30) { 
      return "#ffc107"
    }

    if (progress > 10) {
      return "#D97706"
    }
    return "#DC2626"
  }

  const indicatorColor = getTimerColor(progress)
  const trackColor = `${indicatorColor}33`

  return (
    <>
      <div className="d-none d-md-block">
        <div className="svg-pi-wrapper" style={{width: size, height: size}}>
          <svg className="svg-pi" style={{width: size, height: size}}>
            <circle 
              className="svg-pi-track" 
              cx={center}
              cy={center}
              fill="transparent"
              r={radius}
              stroke={trackColor}
              strokeWidth={trackWidth}
            />
            <circle
              className={`svg-pi-indicator`}
              style={{ animationDuration: spinnerSpeed * 1000 }}
              cx={center}
              cy={center}
              fill="transparent"
              r={radius}
              stroke={indicatorColor}
              strokeWidth={indicatorWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap={indicatorCap}
            />
          </svg>
          <div className="svg-pi-label" style={{color: labelColor}}>
            <span className="svg-pi-label__progress">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>
      <div className="d-inline-block d-md-none ms-2" style={{color: labelColor}}>
        <span className="svg-pi-label__progress">
          {formattedTime}
        </span>
      </div>
    </>
  )
}

export default ProgressBarTimer