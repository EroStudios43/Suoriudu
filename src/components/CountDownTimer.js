import React, { useEffect, useState } from "react";
import "./progressbartimer.css";

function CountdownTimer({ startTime, endTime }) {
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(100);

  const size = 150; 
  const trackWidth = 10; 
  const indicatorWidth = 10; 
  const indicatorCap = "round";
  const label = "loading..."
  const labelColor = `#333`
  const spinnerMode = false
  const spinnerSpeed = 1

  const center = size / 2; 
  const radius = center - (trackWidth > indicatorWidth ? trackWidth : indicatorWidth); 
  const dashArray = 2 * Math.PI * radius; 
  const dashOffset = dashArray * ((100 - progress) / 100);

  useEffect(() => {
    if (!startTime || !endTime) { 
      return; 
    }
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    const totalDuration = end - start;

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, end - now);

      setRemaining(diff);

      const percentage = totalDuration > 0 ? (diff / totalDuration) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, percentage)))

    }
    updateTimer();
    
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  // Millisekunnit -> HH:MM:SS
  const totalSeconds = Math.ceil(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${String(hours).padStart(2,"0")}:`+ `${String(minutes).padStart(2,"0")}:` + `${String(seconds).padStart(2,"0")}`;

  const getTimeColor = () => {
    if ( remaining <= 5*60*1000){
      return "#dc3545"
    }
    if (progress > 40) {
      return "#6752AD"
    }
    if (progress > 30) {
      return "#ffc107"
    }
    if (progress <= 10) {
      return "#D97706";
    } 
    return "#DC2626";

  }

  const indicatorColor = getTimeColor()
  const trackColor = `${indicatorColor}33`

  return (
    <div className="svg-pi-wrapper countdown-timer" style={{width: size, height: size}}>
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
  );
}

export default CountdownTimer;