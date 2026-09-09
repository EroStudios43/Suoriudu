import React, {useState, useEffect, useRef} from "react";
import axios from "axios";
import "./styles/createTask.css";
import { useNavigate } from "react-router-dom"
import { useLocation } from "react-router-dom";
import { useUser } from "../context/useUser.js";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { useTheme } from "../context/ThemeContext.js";
import DrawingBoard from "../components/DrawingBoard.js";
import DrawingReview from "../components/DrawingReview.js";
import AiChat from "../components/AiChat.js";



const url = process.env.REACT_APP_API_URL;

function CreateExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [examName, setExamName] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
  const weekIndex = location.state?.weekIndex;

  const [startTime, setStartTime] = useState(location.state?.defaultStartTime || "");
  const [endTime, setEndTime] = useState(location.state?.defaultEndTime || "");
  const [examDuration, setExamDuration] = useState("");

  const editMode = location.state?.editMode;
  const editExercise = location.state?.exercise;
  const source = location.state?.source;
  const courseId = location.state?.courseId;
  const initialFormRef = useRef(null);

  const { isDarkMode, toggleTheme } = useTheme();
  const [drawingStates, setDrawingStates] = useState({});
  const drawingRefs = useRef({});


  const [tasks, setTasks] = useState([
    {
      instructions: "",
      type: null,
      choiceMode: "single",
      options: ["", ""],
      correctAnswers: [],
      answer: "",
      points: 1
    }
  ]);   

  useEffect(() => {
    if (editExercise) {
      setExamName(editExercise.exercise_name || "");
      setExamDescription(editExercise.exercise_description || "");
      setStartTime(toDateTimeLocal(editExercise.start_time || ""));
      setEndTime(toDateTimeLocal(editExercise.end_time || ""));
      setAllowLateSubmissions(!!editExercise.allow_late_submissions);
      setExamDuration(editExercise.max_time || "");

      if (editExercise.tasks) {
        setTasks(editExercise.tasks);
      }
    }
    initialFormRef.current = {
      taskName: editExercise?.exercise_name || "",
      taskDescription: editExercise?.exercise_description || "",
      allowLateSubmissions: !!editExercise?.allow_late_submissions,
      startTime: toDateTimeLocal(editExercise?.start_time) || "",
      endTime: toDateTimeLocal(editExercise?.end_time) || "",
      tasks: editExercise?.tasks || [],
    };
  }, [editExercise]);

  


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
        answer: "",
        points: 1
      }
    ]);
  }

  const updateTask = (index, newTask) => {
    const updated = [...tasks];
    updated[index] = newTask;
    setTasks(updated);
  };

  const applyAiTasks = ({ name, description, tasks: generatedTasks }) => {
    if (name) setExamName(name);
    if (description) setExamDescription(description);
    setTasks(generatedTasks);
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

  const handleStartTimeChange = (value) => {
    setStartTime(value);

    if (!value) return;

    const start = new Date(value);

    // auto +2h
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    setEndTime(formatDateTimeLocal(end));

    // duration = 2h automatically
    setExamDuration("02:00");
  };

  const formatDateTimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const toDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleEndTimeChange = (value) => {
    setEndTime(value);

    if (!startTime) return;

    const start = new Date(startTime);
    const end = new Date(value);

    if (end <= start) {
      alert("Lopetusaika ei voi olla ennen aloitusaikaa");
      return;
    }

    const diff = end - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / 60000);

    setExamDuration(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    );
  };

  const availableDuration = () => {
    if (!startTime || !endTime) return "00:00";

    return calculateDuration(startTime, endTime);
  };

  const calculateDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);

    if (diff <= 0) return "00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / 60000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const handleDurationChange = (value) => {
    if (!startTime || !endTime) {
      setExamDuration(value);
      return;
    }

    const available = new Date(endTime) - new Date(startTime);
    const availableMinutes = available / 60000;

    const [h, m] = value.split(":").map(Number);
    const durationMinutes = h * 60 + m;

    if (durationMinutes > availableMinutes) {
      alert("Suoritusaika ei voi olla pidempi kuin kokeen aukioloaika.");
      return;
    }
    
    setExamDuration(value);
  };

  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  // create task to spesific week
  const createTask = async () => {
    if (!validateExercise()) return;

    const tasksToSave = tasks.map((task, taskIndex) => {
      if (task.type !== "drawing") return task;

      const drawingJson = drawingRefs.current[taskIndex]?.();
      return drawingJson ? { ...task, answer: drawingJson } : task;
    });


    const exercise = {
      id: editExercise?.id || Date.now(),
      exercise_name: examName, 
      exercise_description: examDescription, 
      allow_late_submissions: 0, 
      exercise_type: "exam",
      start_time: startTime, 
      end_time: endTime,
      max_time: examDuration,
      tasks: tasksToSave,
    };

    console.log(exercise.exercise_type)
    if (source === "weekOverview" && weekIndex && courseId && user?.access_token) {
        try {
          const payload = {
            idweek: weekIndex,
            exercise_name: examName,
            exercise_description: examDescription,
            exercise_type: "exam",
            start_time: startTime,
            end_time: endTime,
            allow_late_submissions: allowLateSubmissions ? 1 : 0,
            max_time: examDuration,
            tasks: normalizeTasksForBackend(tasksToSave),
          };

          const response = await axios.post(
            `${url}/courses/${courseId}/exercises`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${user.access_token}`,
              },
            }
          );

          // Palataan WeekOverviewiin.
          
          navigate(-1);

          return;

        } catch (error) {
          console.error(
            "Failed to create exercise:",
            error.response?.data || error.message
          );

          alert("Tehtävän luominen epäonnistui.");
          return;
        }
      }

    if (source === "teacherExam" && editMode && editExercise?.idexercise && courseId && user?.access_token) {
      try {
        await axios.put(
          `${url}/courses/${courseId}/exercises/${editExercise.idexercise}`,
          {
            exercise_name: examName,
            exercise_description: examDescription,
            allow_late_submissions: allowLateSubmissions ? 1 : 0,
            start_time: startTime,
            end_time: endTime,
            max_time: examDuration,
            tasks: normalizeTasksForBackend(tasksToSave),
          },
          { headers: { Authorization: `Bearer ${user.access_token}` } }
        );

        const updatedExercise = {
            ...editExercise,
            exercise_name: examName,
            exercise_description: examDescription,
            start_time: startTime,
            end_time: endTime,
            max_time: examDuration,
            allow_late_submissions: allowLateSubmissions ? 1 : 0,
            tasks: normalizeTasksForBackend(tasksToSave)
        };

        const currentWeek = location.state?.week || {};
        const updatedWeek = {
          ...currentWeek,
          exercises: Array.isArray(currentWeek.exercises)
            ? currentWeek.exercises.map((exercise) =>
                exercise.idexercise === updatedExercise.idexercise ? updatedExercise : exercise
              )
            : [updatedExercise]
        };

      navigate("/StartExamPage", {
        replace: true,
        state: { courseId, exercise: updatedExercise }
      });

      return;
    } catch (error) {
      console.error("Failed to update exam", error);
      alert("Kokeen päivittäminen epäonnistui.");
      return;
    }
  }


    const saved = JSON.parse(localStorage.getItem("draftExercises")) || {};

    if (!saved[weekIndex]) {
      saved[weekIndex] = [];
    }
    if (editMode) {
      saved[weekIndex] = saved[weekIndex].map(ex => ex.id === editExercise.id ? exercise : ex );
    } else {
      saved[weekIndex].push(exercise);
    }
    localStorage.setItem("draftExercises", JSON.stringify(saved));

    navigate(-1);
  };

  const normalizeTasksForBackend = (tasksToNormalize = tasks) => tasksToNormalize.map((task) => {
    if (task.type === "choice") {
      return {
        tasktype: task.choiceMode === "multiple" ? "multiple_choice" : "single_choice",
        question: task.instructions || "",
        answer: JSON.stringify({
          choiceMode: task.choiceMode || "single",
          options: task.options || ["", ""],
          correctAnswers: task.correctAnswers || []
        }),
        points: task.points ?? null
      };
    }

    if (task.type === "coding") {
      return {
        tasktype: task.type,
        question: task.instructions || "",
        answer: JSON.stringify({
          starterCode: task.starterCode,
          testCases: task.testCases,
        }),
        points: task.points ?? null
      }
    }

    return {
      tasktype: task.type || "essay",
      question: task.instructions || "",
      answer: task.answer || "",
      points: task.points ?? null
    };
  });

  const validateExercise = () => {
    if (!examName.trim()) {
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

    const availableMinutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
    const durationMinutes = toMinutes(examDuration);

    if (isNaN(availableMinutes) || isNaN(durationMinutes)) {
      alert("Aloitus- ja lopetusaika sekä kesto täytyy olla asetettu");
      return;
    }

    if (durationMinutes > availableMinutes) {
      alert("Suoritusaika ei voi olla pidempi kuin kokeen aukioloaika.");
      return;
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
        // answer voi olla vapaaehtoinen → ei validointia
        continue;
      }
    }

    return true;
  };

  const normalizeTaskFromBackend = (task) => {
    if (!task) return {
      instructions: "",
      type: null,
      choiceMode: "single",
      options: ["", ""],
      correctAnswers: [],
      answer: "",
      points: 1
    };

    if (task.tasktype === "single_choice" || task.tasktype === "multiple_choice") {
      let parsed = {};
      try {
        parsed = typeof task.answer === "string" ? JSON.parse(task.answer) : (task.answer || {});
      } catch {
        parsed = {};
      }

      return {
        instructions: task.question || "",
        type: "choice",
        choiceMode: task.tasktype === "multiple_choice" ? "multiple" : "single",
        options: parsed.options || ["", ""],
        correctAnswers: parsed.correctAnswers || [],
        answer: "",
        points: task.points ?? 1
      };
    }

    if (task.type === "coding") {
      let parsedCodeData = JSON.parse(task.answer)

      return {
        instructions: task.instructions || task.question || "",
        type: task.type,
        starterCode: parsedCodeData.starterCode,
        testCases: parsedCodeData.testCases,
        points: task.points ?? 1
      }
    }

    return {
      instructions: task.question || "",
      type: task.tasktype || "essay",
      choiceMode: "single",
      options: ["", ""],
      correctAnswers: [],
      answer: task.answer || "",
      points: task.points ?? 1
    };
  };

  const addTestcase = (taskIndex) => {
    setTasks(prev => 
      prev.map((task, i) => {
        if (i !== taskIndex) return task

        if (task?.testCases) {
          return {
            ...task,
            testCases: [...task.testCases, {}]
          }
        } else {
          return {
            ...task,
            testCases: [{}]
          }
        }
        
      })
    )
  }

  const deleteTestcase = (taskIndex, testcaseIndex) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;
        const newTestcases = task.testCases.filter((_, idx) => idx !== testcaseIndex);
        return {...task, testCases: newTestcases};
      })
    );
  };

  const addTestcaseInput = (taskIndex, testcaseIndex) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;

        // Get the test cases from the task
        const testCases = task.testCases || []

        // Update the input if the test case exists
        if (testCases[testcaseIndex]) {
          // Make a new variable for test cases that are updated
          const updatedTestCases = [...testCases]

          // Update the test case with the index we want to update
          updatedTestCases[testcaseIndex] = {
            ...updatedTestCases[testcaseIndex],
            input: [...(updatedTestCases[testcaseIndex].input || []), ""]
          }

          return { ...task, testCases: updatedTestCases }
        }

        // If test case doesn't exist, return task
        return task
      })
    );
  }

  const deleteTestcaseInput = (taskIndex, testcaseIndex, testcaseInputIndex) => {
    setTasks(prev =>
      prev.map((task, i) => {
        if (i !== taskIndex) return task;

        // Get the test cases from the task
        const testCases = task.testCases || []

        // Update the input if the test case exists
        if (testCases[testcaseIndex]) {
          // Make a new variable for test cases that are updated
          const updatedTestCases = [...testCases]

          // Update the test case with the index we want to update
          updatedTestCases[testcaseIndex] = {
            ...updatedTestCases[testcaseIndex],
            input: [...(updatedTestCases[testcaseIndex].input.filter((_, idx) => idx !== testcaseInputIndex))]
          }

          return { ...task, testCases: updatedTestCases }
        }

        // If test case doesn't exist, return task
        return task
      })
    );
  }

  const updateTestcaseInput = (taskIndex, testcaseIndex, testcaseInputIndex, value) => [
    setTasks(prev => 
      prev.map((task, i) => {
        if (i !== taskIndex) return task
        // Get the test cases from the task
        const testCases = task.testCases || []

        // Update the input if the test case exists
        if (testCases[testcaseIndex]) {
          // Make a new variable for test cases that are updated
          const updatedTestCases = [...testCases]

          // Get the test case's input options
          const newInputs = [...testCases[testcaseIndex].input]
          newInputs[testcaseInputIndex] = detectDatatype(value)

          // Update the inputs into the updatedTestCases
          updatedTestCases[testcaseIndex] = {
            ...updatedTestCases[testcaseIndex],
            input: newInputs
          }

          return { ...task, testCases: updatedTestCases }
        }
      })
    )
  ]

  const updateTestcaseFunctionname = (taskIndex, testcaseIndex, value) => {
    setTasks(prev => 
      prev.map((task, i) => {
        if (i !== taskIndex) return task

        // Get the test cases from the task
        const testCases = task.testCases || []

        const updatedTestcases = [...testCases]

        updatedTestcases[testcaseIndex] = {
          ...updatedTestcases[testcaseIndex],
          functionName: value
        }

        return { ...task, testCases: updatedTestcases}
      })
    )
  }

  const updateTestcaseOutput = (taskIndex, testcaseIndex, value) => {
    setTasks(prev => 
      prev.map((task, i) => {
        if (i !== taskIndex) return task

        // Get the test cases from the task
        const testCases = task.testCases || []

        const updatedTestcases = [...testCases]

        updatedTestcases[testcaseIndex] = {
          ...updatedTestcases[testcaseIndex],
          expectedOutput: detectDatatype(value)
        }

        return { ...task, testCases: updatedTestcases}
      })
    )
  }

  const detectDatatype = (value) => {
    // Empty input
    if (value.trim() === "") return ""

    // Number with regex
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    // Null value
    if (value === "null") return null

    // JSON objects and arrays
    if (value.startsWith("{") || value.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch {
        // If JSON is invalid, just make it string
      }
    }

    // String (default)
    return value
  }

  return (
    <div className={`task-page ${isDarkMode ? '' : 'light-theme'}`}>
      <div className="task-paper">
        <div className="task-header">
          <i className="fa-regular fa-circle-left back-arrow" onClick={e => navigate(-1)}></i>
          <h1>Takaisin kurssin luontiin</h1>

        </div>
        <div className="task-content">
          <input
            type="text"
            placeholder="Syötä nimi..."
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="task-input"
          />    
          <input
            type="text"
            placeholder="Kuvaus.."
            value={examDescription}
            onChange={(e) => setExamDescription(e.target.value)}
            className="task-input"
          /> 
        </div>
        <div className="divider"></div>

        <div className="task-time-section">
          <h2 className="task-time-title">Tehtävän suoritusaika</h2>
          <p className="task-time-label">Aseta tässä kokeen avaus- ja sulkemisaika, sekä kokeen maksimi suoritus aika.</p>
          
          <div className="task-time-row">
            <div className="task-time-column">
              <label className="task-time-label">Aseta aloitusaika*</label>
              <input 
                type="datetime-local" 
                className="task-time-input"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            </div>
            <div className="task-time-column">
              <label className="task-time-label">Aseta sulkeutumisaika*</label>
              <input type="datetime-local" className="task-time-input"
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                    />
            </div>

            <div className="task-time-column">
              <label>Aseta maksimi kokeen teko aika*</label>
                <input
                  type="time"
                  value={examDuration}
                  max={startTime && endTime ? availableDuration() : ""}
                  onChange={(e) => handleDurationChange(e.target.value)}
                />
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

                <button onClick={() => updateTask(taskIndex, {...task, type: "coding", testCases: [{functionName: "", input: [""], expectedOutput: ""}]})}>
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

            <div className="pointsBox">
              <label className="task-time-label" style={{ margin: 0 }}>Maksimipistemäärä</label>
              <input
                type="number"
                min="0"
                value={task.points ?? 1}
                onChange={(e) => updateTask(taskIndex, { ...task, points: Number(e.target.value) })}
                className="points-input"
              />
            </div>

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
              <>
              {console.log(task)}
                <br />
                <p><b>Opiskelijalle annettava esimerkkikoodi</b></p>
                <CodeMirror 
                  value={task?.starterCode}
                  extensions={[javascript()]}
                  onChange={(value) => {
                    console.log(task)
                    const updatedTask = {
                      ...task,
                      starterCode: value
                    }
                    updateTask(taskIndex, updatedTask)
                  }}
                />
                <br />
                <div className="row g-2">
                  {task?.testCases && task?.testCases.map((testcase, index) => (
                    <div key={`${taskIndex}-${index}`} className="col-12 option-card">
                      <h5>Testitapaus {index + 1}</h5>
                      <input 
                        type="text" 
                        placeholder="Testattavan funktion nimi: esim. add, subtract"
                        value={testcase?.functionName}
                        className="form-control"
                        onChange={(e) => updateTestcaseFunctionname(taskIndex, index, e.target.value)}
                      />
                      <p><b>Funktion testattavat input-arvot (parametrit)</b></p>
                      <div className="row row-cols-4 gy-2 gx-1">
                        {testcase?.input && testcase?.input.map((input, inputIndex) => (
                          <div className="col">
                            <div>
                              <input 
                                type="text"
                                placeholder={`Input-arvo ${inputIndex + 1}:`}
                                value={input}
                                className="form-control d-inline"
                                onChange={(e) => updateTestcaseInput(taskIndex, index, inputIndex, e.target.value)}
                              />
                              <button className="delete-option-btn d-inline" onClick={() => deleteTestcaseInput(taskIndex, index, inputIndex)}>
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="add-option-wrapper">
                        <button className="add-option-btn" onClick={() => addTestcaseInput(taskIndex, index)}>+ Lisää funktion input-arvo</button>
                      </div>
                      <p><b>Funktion odotettu output-arvo</b></p>
                      <input 
                        type="text" 
                        placeholder="Output-arvo"
                        value={testcase?.expectedOutput}
                        className="form-control"
                        onChange={(e) => updateTestcaseOutput(taskIndex, index, e.target.value)}
                      />
                      <br />
                      <button className="delete-option-btn" onClick={() => deleteTestcase(taskIndex, index)}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-option-wrapper">
                  <button
                    className="add-option-btn"
                    onClick={() => addTestcase(taskIndex)}
                  >
                  + Lisää testitapaus
                  </button>
                </div>
              </>
            )}

            {task.type === "drawing" && (
              <div className="mb-3">
                <label className="form-label d-block">Piirra pohja / esimerkkipiirros (valinnainen):</label>
                <DrawingBoard
                  onRegisterGetJson={(getJson) => {
                    drawingRefs.current[taskIndex] = getJson;
                  }}
                  lines={drawingStates[taskIndex]?.lines || []}
                  setLines={(newLines) => {
                    setDrawingStates((prev) => {
                      const currentTaskState = prev[taskIndex] || {};
                      const currentLines = Array.isArray(currentTaskState.lines)
                        ? currentTaskState.lines
                        : [];
                      const updatedLines = typeof newLines === "function"
                        ? newLines(currentLines)
                        : newLines;

                      return {
                        ...prev,
                        [taskIndex]: {
                          ...currentTaskState,
                          lines: updatedLines
                        }
                      };
                    });
                  }}
                  onSave={(json) => updateTask(taskIndex, { ...task, answer: json })}
                />

                {task.answer && (
                  <div className="mt-3">
                    <p className="fw-bold">Tallennettu mallipiirros esikatselussa:</p>
                    <DrawingReview json={task.answer} />
                  </div>
                )}
              </div>
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
      <AiChat onTasksGenerated={applyAiTasks} />
    </div>
  );
}

export default CreateExam;