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

const selectExerciseById = async (idexercise) => {
  const [rows] = await pool.promise().query(
    `SELECT * FROM exercises WHERE idexercise = ?`,
    [idexercise]
  )
  return rows
}

const selectWeekExerciseResults = async (idweek, iduser) => {
  const [rows] = await pool.promise().query(
    `SELECT 
      exerciseresults.idexerciseresult,
      exerciseresults.iduser,
      exerciseresults.idexercise,
      exerciseresults.starting_time,
      exerciseresults.complete_time
    FROM exercises
    INNER JOIN exerciseresults ON exerciseresults.idexercise = exercises.idexercise
      AND exerciseresults.iduser = ?
    WHERE exercises.idweek = ?`,
    [iduser, idweek]
  )
  return rows
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

// Select user's exercise data and task results, that haven't been returned yet.
// This is done so that the frontend get's the data from any exercises / tasks not returned yet.
const selectUsersUncompletedExerciseTasksAndResults = async (iduser, idexercise) => {
  const [rows] = await pool.promise().query(`
    SELECT 
      task.idtask,
      task.tasktype,
      task.question,
      task.answer,
      
      taskresults.idtaskresult,
      taskresults.iduser,
      taskresults.idexerciseresult,
      taskresults.answer AS student_answer,
      taskresults.points,
      taskresults.teacher_comment,

      exercises.*

      FROM task

      INNER JOIN exercises ON task.idexercise = exercises.idexercise

      INNER JOIN exerciseresults
        ON exerciseresults.idexercise = exercises.idexercise
        AND exerciseresults.iduser = ?
        AND exerciseresults.complete_time IS NULL

      LEFT JOIN taskresults ON taskresults.idtask = task.idtask
        AND taskresults.iduser = ?
        AND taskresults.idexerciseresult = exerciseresults.idexerciseresult
      
      WHERE task.idexercise = ?`,
    [iduser, iduser, idexercise]
  )
  return rows
}

const selectUserExerciseAndTaskResultsByExerciseId = async (idexercise, iduser) => {
  const [result] = await pool.promise().query(`
    SELECT 
      exercises.*,

      exerciseresults.idexerciseresult,
      exerciseresults.iduser,
      exerciseresults.starting_time,
      exerciseresults.complete_time,

      task.idtask,
      task.tasktype,
      task.question,
      task.answer,
      task.points,
      
      taskresults.idtaskresult,
      taskresults.answer AS student_answer,
      taskresults.points AS student_points,
      taskresults.teacher_comment

      FROM exercises

      INNER JOIN exerciseresults
        ON exerciseresults.idexercise = exercises.idexercise
        AND exerciseresults.iduser = ?
        AND exerciseresults.complete_time IS NOT NULL

      INNER JOIN task
        ON task.idexercise = exercises.idexercise

      LEFT JOIN taskresults
        ON taskresults.idtask = task.idtask
        AND taskresults.idexerciseresult = exerciseresults.idexerciseresult

      WHERE exercises.idexercise = ?
    `,
    [iduser, idexercise]
  )
  return result
}

const selectUserExerciseData = async (idexercise, iduser) => {
  const [result] = await pool.promise().query(
    `SELECT
      exercises.idexercise,
      exercises.idweek,
      exercises.exercise_name,
      exercises.exercise_description,
      exercises.exercise_type,
      exercises.start_time,
      exercises.end_time,
      exercises.allow_late_submissions,
      exercises.max_time,
      exercises.active_monitors,
      exercises.exam_duration,
      
      exerciseresults.idexerciseresult,
      exerciseresults.starting_time,
      exerciseresults.complete_time
      
      FROM exercises
      
      INNER JOIN exerciseresults
        ON exercises.idexercise = exerciseresults.idexercise
        AND exerciseresults.iduser = ?
      
      WHERE exercises.idexercise = ?`,
      [iduser, idexercise]
  )
  return result
}

const insertTaskResult = async (idtask, iduser, idexerciseresult, answer, points, teacher_comment) => {
  const [result] = await pool.promise().query(
    `INSERT INTO taskresults 
      (idtask, iduser, idexerciseresult, answer, points, teacher_comment)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [idtask, iduser, idexerciseresult, answer, points, teacher_comment]
  )
  return result
}

const insertExerciseResult = async (iduser, idexercise, starting_time, complete_time, ai_notes) => {
  const [result] = await pool.promise().query(
    `INSERT INTO exerciseresults
      (iduser, idexercise, starting_time, complete_time, ai_notes)
    VALUES (?, ?, ?, ?, ?)`,
    [iduser, idexercise, starting_time, complete_time, ai_notes]
  )
  return result
}

const updateExerciseResult = async (idexerciseresult, data) => {
  // All the fields aren't updated every time, so we have to check which ones are included in the data variable.
  const fields = []
  const values = []

  if (data.iduser !== undefined) {
    fields.push("iduser = ?")
    values.push(data.iduser)
  }

  if (data.idexercise !== undefined) {
    fields.push("idexercise = ?")
    values.push(data.idexercise)
  }

  if (data.starting_time !== undefined) {
    fields.push("starting_time = ?")
    values.push(data.starting_time)
  }

  if (data.complete_time !== undefined) {
    fields.push("complete_time = ?")
    values.push(data.complete_time)
  }

  if (data.ai_notes !== undefined) {
    fields.push("ai_notes = ?")
    values.push(data.ai_notes)
  }

  if (fields.length === 0) return null

  // Add the idexerciseresult to the values
  values.push(idexerciseresult)

  const [result] = await pool.promise().query(
    `UPDATE exerciseresults
    SET ${fields.join(", ")}
    WHERE idexerciseresult = ?
    `,
    values
  )
  return result
}

const updateTaskResult = async (idtaskresult, data) => {

  // All the fields aren't updated every time, so we have to check which ones are included in the data variable.
  const fields = []
  const values = []

  if (data.idtask !== undefined) {
    fields.push("idtask = ?")
    values.push(data.idtask)
  }

  if (data.iduser !== undefined) {
    fields.push("iduser = ?")
    values.push(data.iduser)
  }

  if (data.idexerciseresult !== undefined) {
    fields.push("idexerciseresult = ?")
    values.push(data.idexerciseresult)
  }

  if (data.answer !== undefined) {
    fields.push("answer = ?")
    values.push(data.answer)
  }

  if (data.points !== undefined) {
    fields.push("points = ?")
    values.push(data.points)
  }

  if (data.teacher_comment !== undefined) {
    fields.push("teacher_comment = ?")
    values.push(data.teacher_comment)
  }

  if (fields.length === 0) return null

  // Add the idexerciseresult to the values
  values.push(idtaskresult)

  const [result] = await pool.promise().query(
    `UPDATE taskresults
    SET ${fields.join(", ")}
    WHERE idtaskresult = ?
    `,
    values
  )
  return result
}

// Select task result with ID
const selectTaskResult = async (idtaskresult) => {
  const [rows] = await pool.promise().query(
    `SELECT * FROM taskresults WHERE idtaskresult = ?`, [idtaskresult]
  )
  return rows
}

// Select exercise result with ID
const selectExerciseResult = async (idexerciseresult) => {
  const [rows] = await pool.promise().query(
    `SELECT * FROM exerciseresults WHERE idexerciseresult = ?`, [idexerciseresult]
  )
  return rows
}

// Select unfinished exercise result with USER ID and EXERCISE ID
const selectUnfinishedExerciseResult = async (idexercise, iduser) => {
  const [rows] = await pool.promise().query(
    `SELECT idexerciseresult, starting_time FROM exerciseresults WHERE idexercise = ? AND iduser = ? AND complete_time IS NULL LIMIT 1`, [idexercise, iduser]
  )
  return rows
}

// Either insert a bunch of new taskresults, or update if a result already exists for an unfinished attempt
const insertOrUpdateTaskResult = async (entries, idexerciseresult, iduser) => {
  // If there are no entries, return empty
  if (!entries.length) return

  // Change the entries into a form where they can be put straight to the query
  const values = entries.map(([idtask, answer]) => [
    idexerciseresult,
    Number(idtask),
    iduser,
    JSON.stringify(answer)
  ])

  const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ')
  const flatValues = values.flat()

  // Flatten the values
  const [rows] = await pool.promise().query(
    `INSERT INTO taskresults (idexerciseresult, idtask, iduser, answer)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      answer = VALUES(answer)`,
      flatValues
  )
  return rows
}

// Get the exam password for the wanted exercise
const selectExamPasswordForValidation = async (idexercise, iduser) => {
  const [rows] = await pool.promise().query(
    `SELECT exercises.exam_password_student
    FROM exercises
    INNER JOIN weeks
      ON exercises.idweek = weeks.idweek
    INNER JOIN courses
      ON weeks.idcourse = courses.idcourse
    INNER JOIN coursemembers
      ON coursemembers.idcourse = courses.idcourse
      AND coursemembers.iduser = ?
    WHERE exercises.idexercise = ?
    `,
    [iduser, idexercise]
  )
  
  return rows
}

// Used for checking if an user already has a task result for a particular task in an exercise attempt
const selectExistingTaskResultId = async (iduser, idtask, idexerciseresult) => {
  const [rows] = await pool.promise().query(
    `SELECT taskresults.idtaskresult
    FROM taskresults
    WHERE idtask = ?
      AND iduser = ?
      AND idexerciseresult = ?
    LIMIT 1`,
    [idtask, iduser, idexerciseresult]
  )
  return rows
}

const checkExerciseResultOwnership = async (iduser, idexerciseresult) => {
  const [rows] = await pool.promise().query(
    `SELECT idexerciseresult
    FROM exerciseresults
    WHERE idexerciseresult = ?
      AND iduser = ?`,
      [idexerciseresult, iduser]
  )
  return rows
}

export { insertExercise, insertTask, selectWeekExercises, selectAllExerciseTasks, selectUsersExerciseTaskResults, selectUsersTasksAndResultsForWeek, selectUsersUncompletedExerciseTasksAndResults, selectUserExerciseAndTaskResultsByExerciseId, insertTaskResult, insertExerciseResult, updateExerciseResult, updateTaskResult, selectTaskResult, selectExerciseResult, selectUnfinishedExerciseResult, insertOrUpdateTaskResult, selectWeekExerciseResults, selectUserExerciseData, selectExamPasswordForValidation, selectExerciseById, selectExistingTaskResultId, checkExerciseResultOwnership };