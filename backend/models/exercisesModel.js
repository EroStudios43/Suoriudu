import pool from "../helpers/database.js";

const insertExercise = async (idweek,exercise) => {
  const [result] = await pool.promise().query(
    `INSERT INTO exercises(idweek, exercise_name, exercise_description, exercise_type, start_time,end_time, allow_late_submissions, max_time)VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [idweek, exercise.exercise_name, exercise.exercise_description, exercise.exercise_type, exercise.start_time, exercise.end_time, exercise.allow_late_submissions, exercise.max_time ?? null]
  );

  return result.insertId;
};

const insertTask = async (idexercise,task) => {
    const [result] = await pool.promise().query(
    `INSERT INTO task(idexercise,tasktype,question,answer,points)VALUES (?, ?, ?, ?, ?)`,
    [idexercise,task.tasktype,task.question,task.answer, task.points ?? null]
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
      
      LEFT JOIN exerciseresults
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

const updateExercise = async (idexercise, data) => {
  const fields = []
  const values = []

  if (data.exercise_name !== undefined) {
    fields.push("exercise_name = ?")
    values.push(data.exercise_name)
  }

  if (data.exercise_description !== undefined) {
    fields.push("exercise_description = ?")
    values.push(data.exercise_description)
  }

  if (data.start_time !== undefined) {
    fields.push("start_time = ?")
    values.push(data.start_time)
  }

  if (data.end_time !== undefined) {
    fields.push("end_time = ?")
    values.push(data.end_time)
  }

  if (data.allow_late_submissions !== undefined) {
    fields.push("allow_late_submissions = ?")
    values.push(data.allow_late_submissions)
  }
  if (data.max_time !== undefined) {
    fields.push("max_time = ?")
    values.push(data.max_time)
  }

  if (fields.length === 0) return null

  values.push(idexercise)

  const [result] = await pool.promise().query(
    `UPDATE exercises
     SET ${fields.join(", ")}
     WHERE idexercise = ?`,
    values
  )

  return result
}

const replaceExerciseTasks = async (idexercise, tasks = []) => {
  await pool.promise().query(
    `DELETE FROM task WHERE idexercise = ?`,
    [idexercise]
  )

  if (!tasks.length) return []

  const values = tasks.flatMap((task) => {
    const mappedTask = {
      tasktype: task.tasktype || task.type,
      question: task.question || task.instructions || "",
      answer: task.answer || ""
    }

    if (mappedTask.tasktype === "choice") {
      mappedTask.tasktype = task.choiceMode === "multiple" ? "multiple_choice" : "single_choice"
      mappedTask.answer = JSON.stringify({
        choiceMode: task.choiceMode || "single",
        options: task.options || ["", ""],
        correctAnswers: task.correctAnswers || []
      })
    }

    return [idexercise, mappedTask.tasktype, mappedTask.question, mappedTask.answer, task.points ?? null]
  })

  const placeholders = tasks.map(() => '(?, ?, ?, ?, ?)').join(', ')
  const [rows] = await pool.promise().query(
    `INSERT INTO task (idexercise, tasktype, question, answer, points) VALUES ${placeholders}`,
    values
  )

  return rows
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

  console.log("=== INSERT TASK RESULTS ===");
  console.log("entries:", entries);
  console.log("idexerciseresult:", idexerciseresult);
  console.log("iduser:", iduser);

  const values = entries.map(([idtask, answer]) => {
    const normalizedAnswer = typeof answer === 'string'
      ? answer
      : JSON.stringify(answer)

    return [
      idexerciseresult,
      Number(idtask),
      iduser,
      normalizedAnswer
    ]
  })

  const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ')
  const flatValues = values.flat()

  const [rows] = await pool.promise().query(
    `INSERT INTO taskresults (idexerciseresult, idtask, iduser, answer)
    VALUES ${placeholders}
    ON DUPLICATE KEY UPDATE
      answer = VALUES(answer)`,
      flatValues
  )
  return rows
}

  const selectExerciseForCourse = async (exerciseId, courseId) => {
    const [rows] = await pool.promise().query(
      "SELECT e.* FROM exercises e INNER JOIN weeks w ON w.idweek = e.idweek WHERE e.idexercise = ? AND w.idcourse = ?",
      [exerciseId, courseId]
    );
    return rows;
  };

  const updateExercisePassword = async (exerciseId, password) => {
    const [result] = await pool.promise().query(
      "UPDATE exercises SET exam_password_student = ? WHERE idexercise = ?", [password, exerciseId]
    );
    return result.affectedRows;
  };

  const selectExerciseDetailsForEdit = async (courseId, exerciseId) => {
    const [rows] = await pool.promise().query(
      `SELECT e.*
      FROM exercises e
      INNER JOIN weeks w ON w.idweek = e.idweek
      WHERE e.idexercise = ? AND w.idcourse = ?`,
      [exerciseId, courseId]
    );

    return rows;
  };

  const deleteExercise = async (idexercise) => {
    const [result] = await pool.promise().query(
      `DELETE FROM exercises
      WHERE idexercise = ?`,
      [idexercise]
    );

    return result;
  };

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

const selectTaskResultForReview = async (userId, exerciseId, taskId) => {
    const [rows] = await pool.promise().query(
        `SELECT tr.idtaskresult, tr.idexerciseresult
         FROM taskresults tr
         INNER JOIN task t ON t.idtask = tr.idtask
         WHERE tr.iduser = ?
           AND t.idexercise = ?
           AND tr.idtask = ?
         LIMIT 1`,
        [userId, exerciseId, taskId]
    );

    return rows;
};

const selectLatestExerciseResult = async (userId, exerciseId) => {
    const [rows] = await pool.promise().query(
        `SELECT idexerciseresult
         FROM exerciseresults
         WHERE iduser = ?
           AND idexercise = ?
         ORDER BY idexerciseresult DESC
         LIMIT 1`,
        [userId, exerciseId]
    );

    return rows;
};

const createTaskResultForReview = async (taskId, userId, exerciseResultId, points, teacherComment) => {
    const [result] = await pool.promise().query(
        `INSERT INTO taskresults (idtask, iduser, idexerciseresult, answer, points, teacher_comment) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            taskId,
            userId,
            exerciseResultId,
            "",
            points,
            teacherComment
        ]
    );

    return result;
  };

const selectStudentExerciseReviewExercise = async (exerciseId, courseId) => {
    const [rows] = await pool.promise().query(
        `SELECT e.*
         FROM exercises e
         INNER JOIN weeks w ON w.idweek = e.idweek
         WHERE e.idexercise = ?
         AND w.idcourse = ?`,
        [exerciseId, courseId]
    );

    return rows;
  };

  const selectStudentForExerciseReview = async (userId) => {
    const [rows] = await pool.promise().query(
        `SELECT iduser, firstname, lastname
         FROM users
         WHERE iduser = ?`,
        [userId]
    );

    return rows;
};

const selectStudentExerciseReviewTasks = async (userId, exerciseId) => {
    const [rows] = await pool.promise().query(
          `SELECT
            t.idtask,
            t.tasktype,
            t.question,
            t.answer AS task_answer,
            t.points,
            tr.teacher_comment,
            tr.idtaskresult,
            tr.answer AS student_answer,
            tr.points AS teacher_points,
            er.ai_notes
          FROM task t
          LEFT JOIN taskresults tr
            ON tr.idtask = t.idtask AND tr.iduser = ?
          LEFT JOIN exerciseresults er 
            ON er.idexercise = t.idexercise AND er.iduser = tr.iduser
          WHERE t.idexercise = ?
          ORDER BY t.idtask ASC`,
        [userId, exerciseId]
    );

    return rows;
};


export { deleteExercise, 
  selectExerciseDetailsForEdit, 
  selectExerciseForCourse, 
  updateExercisePassword, 
  insertExercise, 
  insertTask, 
  selectWeekExercises, 
  selectAllExerciseTasks, 
  selectUsersExerciseTaskResults, 
  selectUsersTasksAndResultsForWeek, 
  selectUsersUncompletedExerciseTasksAndResults, 
  selectUserExerciseAndTaskResultsByExerciseId,
  insertTaskResult, 
  insertExerciseResult, 
  updateExercise, 
  replaceExerciseTasks, 
  updateExerciseResult, 
  updateTaskResult, 
  selectTaskResult, 
  selectExerciseResult, 
  selectUnfinishedExerciseResult, 
  insertOrUpdateTaskResult, 
  selectWeekExerciseResults, 
  selectUserExerciseData, 
  selectExamPasswordForValidation, 
  selectExerciseById, 
  selectExistingTaskResultId, 
  checkExerciseResultOwnership, 
  selectTaskResultForReview, 
  selectLatestExerciseResult, 
  createTaskResultForReview ,
  selectStudentExerciseReviewExercise,
  selectStudentForExerciseReview,
  selectStudentExerciseReviewTasks,
  };
