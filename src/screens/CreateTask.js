import React, {useState, useEffect} from "react";
import "./styles/createTask.css";
import { useNavigate } from "react-router-dom"
import { useLocation } from "react-router-dom";

function CreateTask() {
  const navigate = useNavigate();
  const location = useLocation();

  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
  const weekIndex = location.state?.weekIndex;

  const [startTime, setStartTime] = useState(location.state?.defaultStartTime || "");
  const [endTime, setEndTime] = useState(location.state?.defaultEndTime || "");

  const editMode = location.state?.editMode;
  const editExercise = location.state?.exercise;

  const [tasks, setTasks] = useState([
    {
      instructions: "",
      type: null,
      choiceMode: "single",
      options: ["", ""],
      correctAnswers: [],
      answer: ""
    }
  ]);   

  useEffect(() => {
    if (editExercise) {
      setTaskName(editExercise.exercise_name || "");
      setTaskDescription(editExercise.exercise_description || "");
      setStartTime(editExercise.start_time || "");
      setEndTime(editExercise.end_time || "");
      setAllowLateSubmissions(!!editExercise.allow_late_submissions);

      if (editExercise.tasks) {
        setTasks(editExercise.tasks);
      }
    }
  }, []);


  const addOption = (taskIndex) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;

        return {
          ...task,
          options: [...task.options, ""]
        };
      })
    );
  };

  const updateOption = (taskIndex, optionIndex, value) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;

        const newOptions = [...task.options];
        newOptions[optionIndex] = value;

        return {
          ...task,
          options: newOptions
        };
      })
    );
  };

  const toggleCorrectAnswer = (taskIndex, optionIndex) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;

        let newAnswers;

        if (task.choiceMode === "single") {
          newAnswers = [optionIndex];
        } else {
          newAnswers = task.correctAnswers.includes(optionIndex)
            ? task.correctAnswers.filter(i => i !== optionIndex)
            : [...task.correctAnswers, optionIndex];
        }

        return {
          ...task,
          correctAnswers: newAnswers
        };
      })
    );
  };
  const addTask = () => {
    setTasks(prev => [
      ...prev,
      {
        instructions: "",
        type: null,
        choiceMode: "single",
        options: ["", ""],
        correctAnswers: [],
        answer: ""
      }
    ]);
  }

  const updateTask = (index, newTask) => {
    const updated = [...tasks];
    updated[index] = newTask;
    setTasks(updated);
  };


  const deleteTask = (taskIndex) => {
    setTasks(prev => prev.filter((_, i) => i !== taskIndex));
  };

  const deleteOption = (taskIndex, optionIndex) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;
        const newOptions = task.options.filter((_, idx) => idx !== optionIndex);
        const newCorrectAnswers = task.correctAnswers.filter(idx => idx !== optionIndex);
        return {...task, options: newOptions, correctAnswers: newCorrectAnswers};
      })
    );
  };

  // create task to spesific week
  const createTask = () => {
    if (!validateExercise()) return;

    const exercise = {
      id: editExercise?.id || Date.now(),
      exercise_name: taskName, 
      exercise_description: taskDescription, 
      allow_late_submissions: allowLateSubmissions ? 1 : 0, 
      exercise_type: "task",
      start_time: startTime, 
      end_time: endTime,
      tasks
    };


    const saved = JSON.parse(localStorage.getItem("draftExercises")) || {};

    if (!saved[weekIndex]) {
      saved[weekIndex] = [];
    }
    if (editMode){
      saved[weekIndex] = saved[weekIndex].map(ex => ex.id === editExercise.id ? exercise : ex)
    }
    else {
      saved[weekIndex].push(exercise);
    }

    localStorage.setItem("draftExercises", JSON.stringify(saved));

    navigate(-1);
  };

  const validateExercise = () => {
    if (!taskName.trim()) {
      alert("Nimi on pakollinen");
      return false;
    }

    if (!startTime || !endTime) {
      alert("Aloitus- ja lopetusaika ovat pakolliset");
      return false;
    }

    if (tasks.length < 1) {
      alert("Tehtävässä pitää olla vähintään yksi tehtävä");
      return false;
    }

    for (const task of tasks) {
      if (!task.instructions?.trim()) {
        alert("Kaikilla tehtävillä täytyy olla tehtävänanto");
        return false;
      }
      if (!task.type) {
        alert("Valitse jokaiselle tehtävälle tehtävätyyppi");
        return false;
      }

      if (task.type === "choice") {
        if (!task.options || task.options.length < 2) {
          alert("Valintatehtävässä pitää olla vähintään 2 vaihtoehtoa");
          return false;
        }

      if (task.options.some(o => !o.trim())) {
        alert("Valintatehtävän vaihtoehdot eivät saa olla tyhjiä");
        return false;
      }

      if (!task.correctAnswers || task.correctAnswers.length === 0) {
        alert("Valitse vähintään yksi oikea vastaus");
        return false;
      }
    }

    if (task.type === "essay" || task.type === "coding" || task.type === "drawing") {
      // answer voi olla vapaaehtoinen -> ei validointia
      continue;
    }
  }

  return true;
};

  return (
    <div className="task-page">
      <div className="task-paper">
        <div className="task-header">
          <i className="fa-regular fa-circle-left back-arrow" onClick={e => navigate(-1)}></i>
          <h1>Takaisin kurssin luontiin</h1>

        </div>
        <div className="task-content">
          <input
            type="text"
            placeholder="Syötä nimi..."
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="task-input"
          />    
          <input
            type="text"
            placeholder="Kuvaus.."
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            className="task-input"
          /> 
        </div>
        <div className="divider"></div>

        <div className="task-time-section">
          <h2 className="task-time-title">Tehtävän suoritusaika</h2>
          <p className="task-time-label">Tehtävän tekoaika on automaattisesti asetettu alkamaan kyseisen viikon maanantaina ja sulkeutumaan sunnuntaina. Tässä voit muokata aikaa manu-aalisesti.</p>
          
          <div className="task-time-row">
            <div className="task-time-column">
              <label className="task-time-label">Aseta aloitusaika*</label>
              <input 
                type="datetime-local" 
                className="task-time-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="task-time-column">
              <label className="task-time-label">Aseta sulkeutumisaika*</label>
              <input type="datetime-local" className="task-time-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
            </div>

            <div className="late-submissions">
              <label>
                <input
                  type="checkbox"
                  checked={allowLateSubmissions}
                  onChange={(e) =>
                    setAllowLateSubmissions(
                      e.target.checked
                    )
                  }
                />
                Salli myöhästyneet palautukset
              </label>
            </div>

          </div>          
        </div>
        <div className="divider"></div>

        {tasks.map((task, taskIndex) => (

          <div key={taskIndex} className="single-task-section">
            <h3 className="task-time-title">Tehtävä {taskIndex + 1}</h3>
            <div className="task-delete" onClick={() => deleteTask(taskIndex)}>
              <i class="fa-solid fa-x"></i>
            </div>
            <input
              type="text"
              placeholder="Kirjoita tähän tehtävänanto.."
              value={task.instructions}
              onChange={(e) => {const updatedTask ={
                  ...task, 
                  instructions: e.target.value}
                  updateTask(taskIndex, updatedTask);
                }} 
              className="task-instructions-input"
            /> 
            <div className="task-type-header">
              <p className="task-time-label">
                Valitse tehtävän tyyppi
                {task.type && (
                  <button
                    className="edit-type-btn"
                    onClick={() => updateTask(taskIndex, {...task, type: null})}
                  >
                    Muokkaa
                  </button>
                )}
              </p>
            </div>

            {!task.type && (
              <div className="task-type-grid">
                <button onClick={() => updateTask(taskIndex, {...task, type: "choice", choiceMode: "single", options: ["", ""], correctAnswers: []})}>
                  Valinta
                </button>

                <button onClick={() => updateTask(taskIndex, {...task, type: "essay"})}>
                  Essee
                </button>

                <button onClick={() => updateTask(taskIndex, {...task, type: "coding"})}>
                  Ohjelmointi
                </button>

                <button onClick={() => updateTask(taskIndex, {...task, type: "drawing"})}>
                  Piirto
                </button>
              </div>
            )}
          
     

            {task.type === "choice" && (
              <div className="choice-editor">

                <div className="choice-mode">
                  <button
                    className={task.choiceMode === "single" ? "active" : ""}
                    onClick={() => {
                      updateTask(taskIndex, {...task, choiceMode: "single", correctAnswers: []});
                      
                    }}
                  >
                    Yksi oikea
                  </button>

                  <button
                    className={task.choiceMode === "multiple" ? "active" : ""}
                    onClick={() => {
                      updateTask(taskIndex, {...task, choiceMode: "multiple", correctAnswers: []});
                    }}
                  >
                    Monivalinta
                  </button>
                </div>

                <div className="options-grid">
                  {task.options.map((option, index) => (
                    <div key={`${taskIndex}-${index}`} className="option-card">

                      <input
                        type="text"
                        placeholder={`Vaihtoehto ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(taskIndex, index, e.target.value)}
                      />
                      <button className="delete-option-btn" onClick={() => deleteOption(taskIndex, index)}>
                        ✕
                      </button>

                      <label>
                        <input
                          type={task.choiceMode === "single" ? "radio" : "checkbox"}
                          checked={task.correctAnswers.includes(index)}
                          onChange={() => toggleCorrectAnswer(taskIndex, index)}
                        />
                        Oikea vastaus
                      </label>

                    </div>
                  ))}
                
                </div>
                <div className="add-option-wrapper">
                  <button className="add-option-btn" onClick={() => addOption(taskIndex)}>
                    + Lisää vaihtoehto
                  </button>
                </div>

              </div>
            )}

            {task.type === "essay" && (
              <textarea
                className="large-answer-input"
                placeholder="Kirjoita essee-tehtävän vastauskentän ohjeet..."
                value={task.answer}
                onChange={(e) => {
                  const updatedTask = {
                    ...task,
                    answer: e.target.value
                  };
                  updateTask(taskIndex, updatedTask);
                }}
              />
            )}

            {task.type === "coding" && (
              <textarea
                className="large-answer-input"
                placeholder="Kirjoita ohjelmointitehtävän kuvaus..."
                value={task.answer}
                onChange={(e) => {
                  const updatedTask = {
                    ...task,
                    answer: e.target.value
                  };
                  updateTask(taskIndex, updatedTask);
                }}
              />
            )}

            {task.type === "drawing" && (
              <textarea
                className="large-answer-input"
                placeholder="Kirjoita piirto-tehtävän kuvaus..."
                value={task.answer}
                onChange={(e) => {
                  const updatedTask = {
                    ...task,
                    answer: e.target.value
                  };
                  updateTask(taskIndex, updatedTask);
                }}
              />
            )}

            <div className="divider"></div>

        </div>

      ))}
      <div className="task-bottom-actions">
        <button className="add-task-btn" onClick={addTask}>
          + Lisää tehtävä
        </button>

        <button className="save-btn" onClick={createTask}>
          Tallenna
        </button>
      </div>

      </div>
    </div>
  );
}

export default CreateTask;