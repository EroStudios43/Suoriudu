import pool from "../helpers/database.js"

const selectExerciseResultAiNotes = async (idexercise, iduser) => {
  const [rows] = await pool.promise().query(
    `SELECT exerciseresults.ai_notes
    FROM exerciseresults
    WHERE iduser = ?
      AND idexercise = ?
      AND complete_time IS NULL`, 
      [iduser, idexercise]
  )
  return rows
}

const updateExerciseResultAiNotes = async (idexercise, iduser, ai_notes) => {
  const [result] = await pool.promise().query(
    `UPDATE exerciseresults
    SET ai_notes = ?
    WHERE iduser = ?
      AND idexercise = ?
      AND complete_time IS NULL`,
      [ai_notes, iduser, idexercise]
  )
  return result
}

export {selectExerciseResultAiNotes, updateExerciseResultAiNotes}