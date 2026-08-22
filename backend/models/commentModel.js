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

export { selectUsersExerciseComments, insertTaskComment, updateCommentReadStatus }