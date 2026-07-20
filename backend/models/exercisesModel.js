import pool from "../helpers/database.js";

const insertExercise = async (idweek,exercise) => {
  const [result] = await pool.promise().query(
    `INSERT INTO exercises(idweek, exercise_name, exercise_description, exercise_type, start_time,end_time, allow_late_submissions, exam_duration)VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [idweek, exercise.exercise_name, exercise.exercise_description, exercise.exercise_type, exercise.start_time, exercise.end_time, exercise.allow_late_submissions, exercise.max_time || null]
  );

  return result.insertId;
};

const insertTask = async (idexercise,task) => {
    const [result] = await pool.promise().query(
    `INSERT INTO task(idexercise,tasktype,question,answer)VALUES (?, ?, ?, ?)`,
    [idexercise,task.tasktype,task.question,task.answer]
  );

  return result.insertId;
};

const selectWeekExercises = async (idweek) => {
    const [rows] = await pool.promise().query(`SELECT * FROM exercises WHERE idweek = ? ORDER BY idexercise`,
        [idweek]
    );
    return rows;
}

const selectAllExerciseTasks = async (idexercise) => {
  const [rows]  = await pool.promise().query(
    `SELECT * FROM task WHERE idexercise = ?`, 
    [idexercise]);
  return rows;
}

const selectUsersExerciseTaskResults = async (iduser, idexercise) => {
  const [rows] = await pool.promise().query(`
    SELECT * 
    FROM taskresults
    INNER JOIN task ON taskresults.idtask = task.idtask
    WHERE taskresults.iduser = ?
      AND task.idexercise = ?`,
    [iduser, idexercise]
  );
  return rows;
}

const selectUsersTasksAndResultsForWeek = async (iduser, idweek) => {
  const [rows] = await pool.promise().query(`
    SELECT 
      task.idtask,
      task.idexercise,
      task.tasktype,
      task.question,

      taskresults.idtaskresult,
      taskresults.iduser,
      taskresults.answer AS student_answer,
      taskresults.points,
      taskresults.teacher_comment
    FROM task
    LEFT JOIN taskresults ON taskresults.idtask = task.idtask
      AND taskresults.iduser = ?
    INNER JOIN exercises ON task.idexercise = exercises.idexercise
    WHERE exercises.idweek = ?`,
    [iduser, idweek]
  );
  return rows
}


export { insertExercise, insertTask, selectWeekExercises, selectAllExerciseTasks, selectUsersExerciseTaskResults, selectUsersTasksAndResultsForWeek };