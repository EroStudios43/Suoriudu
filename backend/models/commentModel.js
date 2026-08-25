import pool from "../helpers/database.js"

const selectUsersExerciseComments = async (idexercise, iduser) => {
  const [rows] = await pool.promise().query(
    `SELECT 
      taskcomments.*,

      users.firstname,
      users.lastname,
      users.role
    FROM taskcomments
    INNER JOIN users
      ON taskcomments.idcommentor = users.iduser
    INNER JOIN taskresults
      ON taskcomments.idtaskresult = taskresults.idtaskresult
    INNER JOIN exerciseresults
      ON taskresults.idexerciseresult = exerciseresults.idexerciseresult
    WHERE exerciseresults.idexercise = ?
      AND exerciseresults.iduser = ?
    ORDER BY taskcomments.timestamp_of_message`,
    [idexercise, iduser]
  )
  return rows
}

const insertTaskComment = async(idtaskresult, idcommentor, publicComment, anonymous, comment, timestamp_of_message) => {
  const [rows] = await pool.promise().query(
    `INSERT INTO 
      taskcomments (idtaskresult, idcommentor, public, anonymous, comment, timestamp_of_message)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [idtaskresult, idcommentor, publicComment, anonymous, comment, timestamp_of_message]
  )
  return rows
}

const updateCommentReadStatus = async(idtaskcomments) => {
  const [rows] = await pool.promise().query(
    `UPDATE taskcomments SET comment_read = 1 WHERE idtaskcomments = ?`, [idtaskcomments]
  )
  return rows
}

const selectTeacherQuestion = async (courseId, exerciseId, userId, taskId) => {
    const [rows] = await pool.promise().query(
        `
        SELECT
            t.idtask,
            t.idexercise,
            t.tasktype,
            t.question,
            t.answer AS correct_answer,
            tr.idtaskresult,
            tr.iduser,
            tr.answer AS student_answer,
            tr.points,
            e.exercise_name,
            e.exercise_description,
            c.idcourse,
            c.coursename,
            student.firstname AS student_firstname,
            student.lastname AS student_lastname
        FROM task t
        INNER JOIN exercises e
            ON e.idexercise = t.idexercise
        INNER JOIN weeks w
            ON w.idweek = e.idweek
        INNER JOIN courses c
            ON c.idcourse = w.idcourse
        LEFT JOIN taskresults tr
            ON tr.idtask = t.idtask
            AND tr.iduser = ?
        LEFT JOIN users student
            ON student.iduser = ?
        WHERE w.idcourse = ?
          AND e.idexercise = ?
          AND t.idtask = ?
        `,
        [
            userId,
            userId,
            courseId,
            exerciseId,
            taskId
        ]
    );

    return rows;
};

const selectTaskComments = async (taskResultId) => {
    const [rows] = await pool.promise().query(
        `
        SELECT
            tc.idtaskcomments,
            tc.idtaskresult,
            tc.idcommentor,
            tc.public,
            tc.anonymous,
            tc.comment,
            tc.timestamp_of_message,
            u.firstname,
            u.lastname,
            u.role
        FROM taskcomments tc
        INNER JOIN users u
            ON u.iduser = tc.idcommentor
        WHERE tc.idtaskresult = ?
        ORDER BY tc.timestamp_of_message ASC,
            tc.idtaskcomments ASC
        `,
        [taskResultId]
    );

    return rows;
};



const selectTeacherQuestions = async (teacherId) => {
    const [rows] = await pool.promise().query(
        `
        SELECT
            tc.idtaskcomments,
            tc.comment,
            tc.public,
            tc.anonymous,
            tc.timestamp_of_message,
            tr.idtaskresult,
            tr.iduser AS student_id,
            tr.answer AS student_answer,
            t.idtask,
            t.question AS task_question,
            t.tasktype,
            e.idexercise,
            e.exercise_name,
            e.exercise_description,
            w.idweek,
            c.idcourse,
            c.coursename,
            student.firstname AS student_firstname,
            student.lastname AS student_lastname,
            commenter.firstname AS commenter_firstname,
            commenter.lastname AS commenter_lastname
        FROM taskcomments tc
        INNER JOIN taskresults tr
            ON tr.idtaskresult = tc.idtaskresult
        INNER JOIN task t
            ON t.idtask = tr.idtask
        INNER JOIN exercises e
            ON e.idexercise = t.idexercise
        INNER JOIN weeks w
            ON w.idweek = e.idweek
        INNER JOIN courses c
            ON c.idcourse = w.idcourse
        INNER JOIN coursemembers cm
            ON cm.idcourse = c.idcourse
            AND cm.iduser = ?
        INNER JOIN users student
            ON student.iduser = tr.iduser
        INNER JOIN users commenter
            ON commenter.iduser = tc.idcommentor
        WHERE LOWER(COALESCE(cm.userrole, '')) = 'teacher'
        ORDER BY tc.timestamp_of_message DESC
        `,
        [teacherId]
    );

    return rows;
};

const checkTeacherTaskResult = async (teacherId, taskResultId) => {
    const [rows] = await pool.promise().query(
        `
        SELECT tr.idtaskresult
        FROM taskresults tr
        INNER JOIN task t
            ON t.idtask = tr.idtask
        INNER JOIN exercises e
            ON e.idexercise = t.idexercise
        INNER JOIN weeks w
            ON w.idweek = e.idweek
        INNER JOIN coursemembers cm
            ON cm.idcourse = w.idcourse
        WHERE tr.idtaskresult = ?
          AND cm.iduser = ?
          AND LOWER(COALESCE(cm.userrole, '')) = 'teacher'
        `,
        [taskResultId, teacherId]
    );

    return rows;
};

export { selectUsersExerciseComments, insertTaskComment, updateCommentReadStatus, selectTaskComments, selectTeacherQuestions, selectTeacherQuestion, checkTeacherTaskResult }
