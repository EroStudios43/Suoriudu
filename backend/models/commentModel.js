import pool from "../helpers/database.js"

const selectUsersExerciseComments = async (idexercise, iduser) => {
  const [rows] = await pool.promise().query(
    `SELECT * 
    FROM taskcomments
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


const selectTeacherQuestion = async (taskResultId) => {
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

        FROM taskresults tr INNER JOIN task t ON t.idtask = tr.idtask
        INNER JOIN exercises e ON e.idexercise = t.idexercise
        INNER JOIN weeks w ON w.idweek = e.idweek
        INNER JOIN courses c ON c.idcourse = w.idcourse
        INNER JOIN users student ON student.iduser = tr.iduser
        WHERE tr.idtaskresult = ?
        `,
        [taskResultId]
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
            tc.comment_read,
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
        SELECT *
        FROM (
            SELECT
                tc.idtaskcomments,
                tc.comment,
                tc.public,
                tc.anonymous,
                tc.comment_read,
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
                commenter.lastname AS commenter_lastname,

                ROW_NUMBER() OVER (
                    PARTITION BY tr.idtaskresult
                    ORDER BY
                        tc.timestamp_of_message DESC,
                        tc.idtaskcomments DESC
                ) AS row_num,

                MAX(
                    CASE
                        WHEN tc.comment_read = 0
                            AND commenter.iduser <> ?
                        THEN 1
                        ELSE 0
                    END
                ) OVER (
                    PARTITION BY tr.idtaskresult
                ) AS has_unread

            FROM taskcomments tc
            INNER JOIN taskresults tr ON tr.idtaskresult = tc.idtaskresult
            INNER JOIN task t ON t.idtask = tr.idtask
            INNER JOIN exercises e ON e.idexercise = t.idexercise
            INNER JOIN weeks w ON w.idweek = e.idweek
            INNER JOIN courses c ON c.idcourse = w.idcourse
            INNER JOIN coursemembers cm ON cm.idcourse = c.idcourse AND cm.iduser = ?
            INNER JOIN users student ON student.iduser = tr.iduser
            INNER JOIN users commenter ON commenter.iduser = tc.idcommentor
            WHERE LOWER(COALESCE(cm.userrole, '')) = 'teacher'
        ) AS latest_questions

        WHERE row_num = 1

        ORDER BY
            has_unread DESC,
            timestamp_of_message DESC
        `,
        [teacherId, teacherId]
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

const markTaskCommentsAsRead = async (taskResultId, teacherId) => {
    const [result] = await pool.promise().query(
        `
        UPDATE taskcomments tc
        INNER JOIN taskresults tr
            ON tr.idtaskresult = tc.idtaskresult
        SET tc.comment_read = 1
        WHERE tc.idtaskresult = ?
          AND tc.idcommentor = tr.iduser
        `,
        [taskResultId]
    );

    return result;
};



const selectUnreadTeacherQuestions = async (teacherId) => {
    const [rows] = await pool.promise().query(
        `
        SELECT COUNT(DISTINCT tc.idtaskresult) AS unreadCount
        FROM taskcomments tc

        INNER JOIN taskresults tr ON tr.idtaskresult = tc.idtaskresult
        INNER JOIN task t ON t.idtask = tr.idtask
        INNER JOIN exercises e ON e.idexercise = t.idexercise
        INNER JOIN weeks w ON w.idweek = e.idweek
        INNER JOIN courses c ON c.idcourse = w.idcourse
        INNER JOIN coursemembers cm ON cm.idcourse = c.idcourse AND cm.iduser = ?
        INNER JOIN users commenter ON commenter.iduser = tc.idcommentor
        WHERE LOWER(COALESCE(cm.userrole, '')) = 'teacher'
          AND tc.comment_read = 0
          AND commenter.iduser <> ?
        `,
        [teacherId, teacherId]
    );

    return Number(rows[0]?.unreadCount || 0);
};

export { selectUsersExerciseComments, insertTaskComment, selectTaskComments, selectTeacherQuestions, selectTeacherQuestion, checkTeacherTaskResult, markTaskCommentsAsRead, selectUnreadTeacherQuestions }