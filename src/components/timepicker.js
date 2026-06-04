import React, { useState, useEffect } from "react";
import { StaticTimePicker } from "@mui/x-date-pickers/StaticTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "../components/timepicker.css";

function Timepicker({ value, onChange, open, onClose }) {
  const [tempValue, setTempValue] = useState(dayjs(value));
  const [view, setView] = useState("hours");

  useEffect(() => {
    setTempValue(dayjs(value));
    setView("hours");
  }, [value]);

  if (!open) return null;

  const handleDone = () => {
    if (view === "hours") {
      setView("minutes");
      return;
    }

    onChange(tempValue.toDate());
    onClose();
  };

  return (
    <div className="timepopup">
      <div className="timepicker-header">
        <div className="timepicker-value">{tempValue.format("HH:mm")}</div>
        <div className="timepicker-step">
          {view === "hours"
            ? "Valitse tunnit ja paina Jatka."
            : "Valitse minuutit ja paina Valmis."}
        </div>
      </div>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <StaticTimePicker
          ampm={false}
          views={["hours", "minutes"]}
          view={view}
          onViewChange={(newView) => {
            if (view === "hours" && newView === "minutes") {
              return;
            }
            setView(newView);
          }}
          value={tempValue}
          onChange={(newValue) => {
            if (!newValue) return;
            setTempValue(newValue);
          }}
          displayStaticWrapperAs="desktop"
          slotProps={{
            toolbar: { hidden: true },
            actionBar: { sx: { display: "none" } },
          }}
        />
      </LocalizationProvider>

      <div className="actions">
        <button
          className="cancel-btn"
          onClick={() => {
            setView("hours");
            onClose();
          }}
        >
          Peruuta
        </button>

        <button className="done-btn" onClick={handleDone}>
          {view === "hours" ? "Jatka" : "Valmis"}
        </button>
      </div>
    </div>
  );
}
export default Timepicker;