import React, { useState, useEffect } from "react";
import "./styles/coursePage.css";
import { useNavigate, useParams } from "react-router-dom"
import { useUser } from "../context/useUser.js";
import axios from "axios";
import Calendar from "../components/calendar.js";
import Timepicker from "../components/timepicker.js";

const url = process.env.REACT_APP_API_URL;

function CoursePage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user, updateToken } = useUser();
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseStartDate, setCourseStartDate] = useState(new Date());
  const [courseEndDate, setCourseEndDate] = useState(new Date());
  const [editableName, setEditableName] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [editableStartDate, setEditableStartDate] = useState(new Date());
  const [editableEndDate, setEditableEndDate] = useState(new Date());
  const [showRoster, setShowRoster] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [weeks, setWeeks] = useState([]);
  const [courseMembers, setCourseMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lateStudents, setLateStudents] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0)
  const [courseNameLoaded, setCourseNameLoaded] = useState(false);

  const refreshCourseData = async () => {
    if (!user || !user.access_token || !courseId) {
      return;
    }

    setLoading(true);
    setCourseNameLoaded(false);
    try {
      const response = await axios.get(url + "/courses/" + courseId, {
        params: { iduser: user.id },
        headers: { Authorization: "Bearer " + user.access_token },
      });

      const nextStartDate = response.data.course_start_time ? new Date(response.data.course_start_time) : new Date();
      const nextEndDate = response.data.course_end_time ? new Date(response.data.course_end_time) : new Date();

      setCourseName(response.data.coursename || "");
      setCourseNameLoaded(true);
      setCourseDescription(response.data.course_description || "");
      setCourseStartDate(nextStartDate);
      setCourseEndDate(nextEndDate);
      setEditableName(response.data.coursename || "");
      setEditableDescription(response.data.course_description || "");
      setEditableStartDate(nextStartDate);
      setEditableEndDate(nextEndDate);
      setWeeks(response.data.weeks || []);
      setCourseMembers(response.data.members || []);

      if (user.role === "student") {
        setChosenWeek(response.data.weeks?.[0]);
      }
      updateToken(response)

    } catch (error) {
      console.error("Error fetching course data:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCourseData();
  }, [courseId]);

  useEffect(() => {
    if (!user || !user.access_token) {
      return;
    }

    const fetchAvailableUsers = async () => {
      try {
        const response = await axios.get(url + "/users", {
          headers: { Authorization: "Bearer " + user.access_token },
        });

        const enrolledIds = new Set((courseMembers || []).map((member) => member.iduser));
        const users = (response.data || []).filter(
          (person) => person.iduser !== user.id && !enrolledIds.has(person.iduser)
        );

        setAvailableUsers(users);
      } catch (error) {
        console.error("Error fetching users:", error.response?.data || error.message);
      }
    };

    fetchAvailableUsers();
  }, [user?.access_token, user?.id, courseMembers]);

  // Student sidebar (collapse not implemented yet)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [chosenWeek, setChosenWeek] = useState({})

  // Student exercise data
  const [studentExerciseResults, setStudentExerciseResults] = useState([])
  const [courseExercises, setCourseExercises] = useState([])

  // Tooltip
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!user || !user.access_token) {
      console.log("No user or token yet");
      return;
    }
    const getStudentExerciseData = async () => {
        try {
            // Only do this if the role of the user is student. Otherwise return.
            if (user.role === "student") {
                const response = await axios.get(
                    url + "/courses/userExercisesAndAnswers",
                    {
                        params: {iduser: user.id, idcourse: courseId},
                        headers: { Authorization: "Bearer " + user.access_token }
                    }
                );
                console.log(response.data)
                setStudentExerciseResults(response.data.exerciseResults)
                setCourseExercises(response.data.exercises)
            } else {
                return
            }
        } catch (error) {
            console.error("Error fetching student exercise data: ", error.response?.data || error.message)
        }
    }

    if (user.role === "student") {
        getStudentExerciseData();
    }
  }, [courseId, user?.access_token]);

  const handleOpenEditModal = () => {
    setEditableName(courseName);
    setEditableDescription(courseDescription);
    setEditableStartDate(courseStartDate);
    setEditableEndDate(courseEndDate);
    setShowEditModal(true);
  };

  useEffect(() => {
    if (!user?.access_token || courseMembers.length === 0 || weeks.length === 0) return;

    const calculateProgress = async () => {
      try {
        const allExercises = weeks.flatMap(week => week.exercises || []);

        if (allExercises.length === 0) {
          setOverallProgress(0);
          return;
        }

        const studentIds = courseMembers
          .filter(m => m.iduser !== user.id)
          .map(m => Number(m.iduser));

        let totalPossible = studentIds.length * allExercises.length;
        let totalSubmitted = 0;

        for (const exercise of allExercises) {
          const res = await axios.get(
            `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions`,
            { headers: { Authorization: `Bearer ${user.access_token}` } }
          );

          const submissions = [
            ...(res.data?.reviewed || []),
            ...(res.data?.unreviewed || [])
          ];

          const submittedIds = new Set(
            submissions
              .filter(s => s.submittedAt)
              .map(s => Number(s.iduser))
          );

          studentIds.forEach(id => {
            if (submittedIds.has(id)) {
              totalSubmitted += 1;
            }
          });
        }

        const percentage = Math.round((totalSubmitted / totalPossible) * 100);
        setOverallProgress(percentage);

      } catch (err) {
        console.error("Error calculating progress:", err);
        setOverallProgress(0);
      }
    };

    calculateProgress();
  }, [weeks, courseMembers, user?.access_token]);

  const handleSaveCourse = async () => {
    if (!courseId || !user?.access_token) {
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        url + "/courses/" + courseId,
        {
          coursename: editableName,
          course_description: editableDescription,
          course_start_time: editableStartDate.toISOString(),
          course_end_time: editableEndDate.toISOString(),
        },
        { headers: { Authorization: "Bearer " + user.access_token } }
      );

      await refreshCourseData();
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating course:", error.response?.data || error.message);
    } finally {
      setSaving(false);
    }
  };

  // The sidebar week box of student sidebar
  // Needs a fair amount of conditional rendering, so made it a component here
  const StudentWeekBox = ({ week }) => {
    const getIcon = () => {
      if (!week.exercises?.length) {
        return;
      }

      const now = new Date();
      const completedExerciseIds = new Set(
        studentExerciseResults?.filter((r) => r.complete_time != null).map((r) => r.idexercise)
      );
      const areExercisesDone = week.exercises?.every((exercise) => completedExerciseIds.has(exercise.idexercise));
      const hasLateExercises = week.exercises.some(
        (exercise) => !completedExerciseIds.has(exercise.idexercise) && new Date(exercise.end_time) < now
      );

      if (areExercisesDone) {
        return <i className="fa-regular fa-circle-check ps-3 pe-3 pt-1"></i>;
      }
      if (hasLateExercises) {
        return <i className="fa-solid fa-circle-exclamation ps-3 pe-3 pt-1" style={{ color: "#00F3FB" }}></i>;
      }
      return <i className="fa-regular fa-circle ps-3 pe-3 pt-1"></i>;
    };

    return (
      <div
        className={`d-flex justify-content-between ${
          chosenWeek.idweek === week.idweek ? "nav-link student-sidebar-item active" : "nav-link student-sidebar-item"
        }`}
        key={week.idweek}
        data-bs-toggle="tab"
        onClick={() => setChosenWeek(week)}
      >
        {week.week_name}
        {getIcon()}
      </div>
    );
  };


  const handleDeleteCourse = async () => {
    if (!courseId || !user?.access_token) {
      return;
    }

    const confirmed = window.confirm("Haluatko poistaa tämän kurssin ja kaikki siihen liittyvät tiedot?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(url + "/courses/" + courseId, {
        headers: { Authorization: "Bearer " + user.access_token },
      });
      navigate("/home", { state: { refresh: true } });
    } catch (error) {
      console.error("Error deleting course:", error.response?.data || error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMember = async (person) => {
    if (!courseId || !user?.access_token) {
      return;
    }

    try {
      await axios.post(
        url + "/courses/" + courseId + "/members",
        { iduser: person.iduser },
        { headers: { Authorization: "Bearer " + user.access_token } }
      );
      await refreshCourseData();
      setSearchTerm("");
    } catch (error) {
      console.error("Error adding course member:", error.response?.data || error.message);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!courseId || !user?.access_token) {
      return;
    }

    try {
      await axios.delete(url + "/courses/" + courseId + "/members/" + member.iduser, {
        headers: { Authorization: "Bearer " + user.access_token },
      });
      await refreshCourseData();
    } catch (error) {
      console.error("Error removing course member:", error.response?.data || error.message);
    }
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString("fi-FI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const questions = [
    { task: "Tehtävä 1", author: "Anonyymi" },
    { task: "Tehtävä 3", author: "Pertti Porkkana" },
    { task: "Tehtävä 5", author: "Anonyymi" },
  ];

  useEffect(() => {
    if (user?.role !== "teacher" || !user?.access_token || !courseId || courseMembers.length === 0 || weeks.length === 0) {
      setLateStudents([]);
      return;
    }

    const findLateStudents = async () => {
      try {
        const now = new Date();

        // Kaikki tehtävät, joiden palautusaika on mennyt.
        // Kokeita ei lasketa mukaan.
        const overdueExercises = weeks
          .flatMap((week) => week.exercises || [])
          .filter(
            (exercise) =>
              exercise.exercise_type !== "exam" &&
              exercise.end_time &&
              new Date(exercise.end_time) < now
          );

        if (overdueExercises.length === 0) {
          setLateStudents([]);
          return;
        }

        const lateStudentIds = new Set();

        // Haetaan jokaisen myöhässä olevan tehtävän palautukset
        for (const exercise of overdueExercises) {
          try {
            const response = await axios.get(
              `${url}/courses/${courseId}/exercises/${exercise.idexercise}/submissions`,
              {
                headers: {
                  Authorization: `Bearer ${user.access_token}`,
                },
              }
            );

          const submissions = [
          ...(response.data?.reviewed || []),
          ...(response.data?.unreviewed || [])
        ];

          const submittedStudentIds = new Set(
            submissions
              .filter((submission) => submission.submittedAt)
              .map((submission) => Number(submission.iduser))
          );

          courseMembers
            .filter((member) => member.iduser !== user.id)
            .forEach((member) => {
            const studentId = Number(member.iduser);

            if (!submittedStudentIds.has(studentId)) {
              lateStudentIds.add(studentId);
            }
          });
          } catch (error) {
            console.error(
              `Palautusten hakeminen epäonnistui tehtävälle ${exercise.idexercise}:`,
              error.response?.data || error.message
            );
          }
        }

        const lateStudentsList = courseMembers
          .filter(
            (member) =>
              member.iduser !== user.id &&
              lateStudentIds.has(member.iduser)
          )
          .sort((a, b) =>
            `${a.firstname} ${a.lastname}`.localeCompare(
              `${b.firstname} ${b.lastname}`,
              "fi"
            )
          );

        setLateStudents(lateStudentsList);
      } catch (error) {
        console.error("Myöhässä olevien oppilaiden haku epäonnistui:", error);
        setLateStudents([]);
      }
    };

    findLateStudents();
  }, [ user?.role, user?.access_token, user?.id, courseId, courseMembers, weeks, ]);


  const rosterStudents = [...courseMembers]
    .filter((member) => member.iduser !== user?.id)
    .sort((a, b) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`, "fi"));
  const filteredUsers = availableUsers.filter((person) =>
    `${person.firstname} ${person.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user.role === "teacher") {
    return (
    <div className="coursepage">
      <div className="topbar">
        <div className="topbar-left">
          <div className="course-title">
            <i className="fa-regular fa-circle-left back-icon" onClick={() => navigate("/home")}></i>
            <h2 className="course-name">{!courseNameLoaded ? "Ladataan..." : courseName}</h2>
          </div>
          <p className="course-description">{courseDescription}</p>
        </div>

        <div className="topbar-right">
          <div className="course-people">
            <i className="fa-solid fa-user-plus user-icon" onClick={() => { setShowAddStudent(true); setSearchTerm(""); }}></i>
            <i className="fa-solid fa-user-group user-icon" onClick={() => setShowRoster(true)}></i>
          </div>
          <button className="edit-btn" onClick={handleOpenEditModal}>
            Muokkaa kurssia
            <i className="fa-regular fa-pen-to-square pen"></i>
          </button>
        </div>
      </div>

      <div className="divider"></div>
        <h2>Tehtävät</h2>

      <div className="container weeks-container">
        <div className="row g-4">
          {weeks.length < 9 ? (
            <>
              <div className={`${weeks.length % 2 === 1 ? "col-sm-8" : "col-sm"}`}>
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                  {weeks.map((week, index) => {
                    if (weeks.length % 2 === 0 || (weeks.length % 2 === 1 && index !== weeks.length - 1)) {
                      return (
                        <div className="col" key={week.idweek}>
                          <div className="week-box">
                            <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate("/WeekOverview", { state: { courseId, week } })} />
                            <h3 className="week-title">{week.week_name}</h3>
                            {week.exercises && week.exercises.length > 0 ? (
                              week.exercises.map((exercise) => (
                                <div key={exercise.idexercise} className="week-task">
                                  <div className="week-task-label">{exercise.exercise_type === "exam" ? "Koe:" : "Tehtävä:"}</div>
                                  <div className="week-task-title">{exercise.exercise_name}</div>
                                </div>
                              ))
                            ) : (
                              <div className="no-tasks-message">Ei tehtäviä</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              {weeks.length % 2 === 1 && (
                <div className="col-sm-4">
                  <div className="col h-100" key={weeks[weeks.length - 1]?.idweek}>
                    <div className="week-box">
                      <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate("/WeekOverview", { state: { courseId, week: weeks[weeks.length - 1] } })} />
                      <h3 className="week-title">{weeks[weeks.length - 1]?.week_name}</h3>
                      {weeks[weeks.length - 1]?.exercises && weeks[weeks.length - 1]?.exercises.length > 0 ? (
                        weeks[weeks.length - 1]?.exercises.map((exercise) => (
                          <div key={exercise.idexercise} className="week-task">
                            <div className="week-task-label">{exercise.exercise_type === "exam" ? "Koe:" : "Tehtävä:"}</div>
                            <div className="week-task-title">{exercise.exercise_name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="no-tasks-message">Ei tehtäviä</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {weeks.map((week) => (
                <div className="col-md-4" key={week.idweek}>
                  <div className="week-box">
                    <i className="fa-solid fa-ellipsis-vertical week-menu" onClick={() => navigate("/WeekOverview", { state: { courseId, week } })} />
                    <h3 className="week-title">{week.week_name}</h3>
                    {week.exercises && week.exercises.length > 0 ? (
                      week.exercises.map((exercise) => (
                        <div key={exercise.idexercise} className="week-task">
                          <div className="week-task-label">{exercise.exercise_type === "exam" ? "Koe:" : "Tehtävä:"}</div>
                          <div className="week-task-title">{exercise.exercise_name}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-tasks-message">Ei tehtäviä</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="divider"></div>

      <div className="progress-section">
        <div className="progress-container">
          <h3 className="progress-title">Oppilaiden yhteisedistys</h3>
          <div className="progress-bar-wrapper">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${overallProgress}%` }}></div>
            </div>
            <span className="progress-percentage">{overallProgress}%</span>
          </div>
        </div>
      </div>

      <div className="content-row">
        <div className="behind-schedule-section">
          <h3 className="section-title">Jäljessä aikataulussa</h3>
          <div className="student-list">
            {lateStudents.length === 0 ? (
              <p className="empty-message">Ei oppilaita</p>
            ) : (
              lateStudents.map((student) => (
                <div key={student.iduser} className="student-item">
                  {student.firstname} {student.lastname}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="questions-section">
          <h3 className="section-title">Kysymyksiä kurssitehtävistä</h3>
          <div className="question-list">
            {questions.length === 0 ? (
              <p className="empty-message">Ei kysymyksiä</p>
            ) : (
              questions.map((question, index) => (
                <div key={index} className="question-item">
                  <span className="question-task">{question.task}</span>
                  <span className="question-author">{question.author}</span>
                  <i className="fa-solid fa-caret-right question-arrow" onClick={() => navigate("/TaskQuestions")}></i>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showRoster && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Kurssin oppilaat</h3>
              <button type="button" className="modal-close" onClick={() => setShowRoster(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="roster-list">
                {rosterStudents.length === 0 ? (
                  <p className="empty-message">Ei kurssilaisia vielä</p>
                ) : (
                  rosterStudents.map((student) => (
                    <div key={student.iduser} className="roster-row">
                      <span className="roster-name">{student.firstname} {student.lastname}</span>
                      <button type="button" className="roster-remove" onClick={() => handleRemoveMember(student)}>
                        Poista
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Lisää kurssilainen</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddStudent(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="search-input"
                placeholder="Hae henkilöä..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm.trim().length === 0 ? (
                <p className="empty-message">Aloita kirjoittamalla nimi</p>
              ) : (
                <div className="search-results">
                  {filteredUsers.length === 0 ? (
                    <p className="empty-message">Ei löytyviä henkilöitä</p>
                  ) : (
                    filteredUsers.map((person) => (
                      <div key={person.iduser} className="search-row">
                        <span className="search-name">{person.firstname} {person.lastname}</span>
                        <button type="button" className="search-add-button" onClick={() => handleAddMember(person)}>
                          +
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-dialog edit-modal-dialog">
            <div className="modal-header">
              <h3>Muokkaa kurssin tietoja</h3>
              <button type="button" className="modal-close" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body edit-modal-body">
              <label className="edit-field" htmlFor="course-name-input">
                <span>Kurssin nimi</span>
                <input id="course-name-input" value={editableName} onChange={(e) => setEditableName(e.target.value)} />
              </label>

              <label className="edit-field" htmlFor="course-description-input">
                <span>Kuvaus</span>
                <textarea id="course-description-input" rows="4" value={editableDescription} onChange={(e) => setEditableDescription(e.target.value)} />
              </label>

              <div className="edit-date-section">
                <div className="edit-date-block">
                  <span>Kurssin alkamispäivä</span>
                  <div className="edit-date-actions">
                    <button type="button" className="date-picker-btn" onClick={() => setShowStartCalendar(true)}>
                      {formatDateTime(editableStartDate)}
                    </button>
                    <button type="button" className="time-picker-btn" onClick={() => setShowStartTime(true)}>
                      Aseta aika
                    </button>
                  </div>
                  {showStartCalendar && (
                    <div className="inline-picker">
                      <Calendar selectedDate={editableStartDate} onDateSelect={(date) => {
                        const updated = new Date(date);
                        updated.setHours(editableStartDate.getHours(), editableStartDate.getMinutes());
                        setEditableStartDate(updated);
                        setShowStartCalendar(false);
                        setShowStartTime(true);
                      }} />
                    </div>
                  )}
                  <Timepicker
                    value={editableStartDate}
                    onChange={(date) => {
                      const updated = new Date(date);
                      updated.setFullYear(editableStartDate.getFullYear(), editableStartDate.getMonth(), editableStartDate.getDate());
                      setEditableStartDate(updated);
                    }}
                    open={showStartTime}
                    onClose={() => setShowStartTime(false)}
                  />
                </div>

                <div className="edit-date-block">
                  <span>Kurssin päättymispäivä</span>
                  <div className="edit-date-actions">
                    <button type="button" className="date-picker-btn" onClick={() => setShowEndCalendar(true)}>
                      {formatDateTime(editableEndDate)}
                    </button>
                    <button type="button" className="time-picker-btn" onClick={() => setShowEndTime(true)}>
                      Aseta aika
                    </button>
                  </div>
                  {showEndCalendar && (
                    <div className="inline-picker">
                      <Calendar selectedDate={editableEndDate} onDateSelect={(date) => {
                        const updated = new Date(date);
                        updated.setHours(editableEndDate.getHours(), editableEndDate.getMinutes());
                        setEditableEndDate(updated);
                        setShowEndCalendar(false);
                        setShowEndTime(true);
                      }} />
                    </div>
                  )}
                  <Timepicker
                    value={editableEndDate}
                    onChange={(date) => {
                      const updated = new Date(date);
                      updated.setFullYear(editableEndDate.getFullYear(), editableEndDate.getMonth(), editableEndDate.getDate());
                      setEditableEndDate(updated);
                    }}
                    open={showEndTime}
                    onClose={() => setShowEndTime(false)}
                  />
                </div>
              </div>

              <div className="edit-actions">
                <button type="button" className="delete-course-btn" onClick={handleDeleteCourse} disabled={deleting}>
                  {deleting ? "Poistetaan..." : "Poista kurssi"}
                </button>
                <button type="button" className="save-course-btn" onClick={handleSaveCourse} disabled={saving}>
                  {saving ? "Tallennetaan..." : "Tallenna muutokset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }
  if (user.role === "student"){
    return (
        <div className="coursepage d-flex flex-column min-vh-100">
            { /* Topbar */}
            <div className="d-flex flex-column flex-md-row">
                <div className="flex">
                    { /* Title and description */}
                    <div className="course-title">
                        <i className="fa-regular fa-circle-left back-icon" onClick={e => navigate("/home")}></i>
                        <div className="student-course-titles d-block">
                            <h2 className="text-truncate">{courseName}</h2>
                            <h3 className="course-description-student text-truncate">{courseDescription}</h3>
                        </div>
                    </div>
                </div>
                { /* Progress bar for course's exercises */}
                <div className="flex-grow-1">
                    <div className="progress-section">
                        <div className="progress-container-student">
                            <div className="progress-bar-wrapper-student">
                                <div className="progress-bar-student">
                                    <div 
                                        className="progress-fill-student" 
                                        style={{
                                            width: `${
                                                Math.floor(
                                                    (
                                                        (studentExerciseResults?.filter(r => r.complete_time != null).length) || 0 / 
                                                        (courseExercises?.length || 1)
                                                    ) * 100) 
                                                || 0 }%`
                                            }}
                                            ></div>
                                </div>
                                <span className="progress-percentage-student">
                                    {Math.floor(
                                        (
                                            (studentExerciseResults?.filter(r => r.complete_time != null).length) || 0 / 
                                            (courseExercises?.length || 1)
                                        ) * 100) || 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                    { /* Collapsible button */}
                        <button className="btn edit-btn d-md-none" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                            {sidebarCollapsed ? <i className="fa-solid fa-bars"></i> : <i className="fa-solid fa-xmark"></i>}
                        </button>
                </div>
            </div>
            <div className="divider"></div>
            {/* Page content */}
            <div className="d-flex flex-grow-1">
                {/* Navigation left-side */}
                <div className={`position-relative student-left-side-sidebar ${sidebarCollapsed ? "d-none" : "d-flex"} d-md-flex`}>
                        { /* Sidebar itself */}
                        <div className={`nav flex flex-column nav-tabs student-sidebar ${sidebarCollapsed ? "d-none" : "d-flex"} d-md-flex`} role="tablist">
                            <h3>Viikot</h3>
                            {weeks.map((week, index) => {
                                return (
                                    <StudentWeekBox week={week} />
                                )
                            })}
                        </div>
                </div>
                
                {/* Course week material */}
                <div className="flex-fill ps-4 student-page-content">
                    {/* Add week description here if it exists */}
                    {chosenWeek.week_description && 
                    <>
                        <h4>Viikon kuvaus</h4>
                        <p>{chosenWeek.week_description}</p>
                    </>
                    }
                </div>
                {/* Right side content */}
            
                <div className={`flex ${chosenWeek?.exercises?.length > 0 ? "" : "disabled-div"}`}>
                    <div 
                        onMouseEnter={() => chosenWeek?.exercises?.length === 0 && setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        style={{position: "relative"}}
                    >
                    <h3 className="d-inline p-2 exercises" onClick={() => {
                        if (chosenWeek.exercises.length === 0) return

                        const chosenWeeksExerciseIds = new Set(
                            chosenWeek.exercises?.map(exercise => exercise.idexercise)
                        )
                        
                        const filteredStudentExerciseResults = studentExerciseResults.filter(result =>
                            chosenWeeksExerciseIds.has(result.idexercise)
                        )
                        
                        navigate(`/WeeksExercises/${chosenWeek.idweek}`, {state: { idcourse: courseId, week: chosenWeek, exerciseresults: filteredStudentExerciseResults}})}}>
                        Tehtäviin
                    </h3>
                    <i className="d-inline fa-solid fa-arrow-right"></i>
                    {chosenWeek?.exercises?.length === 0 && showTooltip && (
                        <div className="student-tooltip">
                            Viikolla ei ole tehtäviä.
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    )
  }
}

export default CoursePage;