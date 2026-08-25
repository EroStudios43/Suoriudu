import pool from "../helpers/database.js";

export const appendAiNoteToExerciseResult = async (iduser, idexercise, newNote) => {
  const [rows] = await pool.promise().query(
    `SELECT idexerciseresult, ai_notes 
     FROM exerciseresults 
     WHERE iduser = ? AND idexercise = ? 
     ORDER BY starting_time DESC 
     LIMIT 1`,
    [iduser, idexercise]
  );

  let incomingEvents = [];
  try {
    incomingEvents = typeof newNote === "string" ? JSON.parse(newNote) : newNote;
    if (!Array.isArray(incomingEvents)) {
      incomingEvents = [incomingEvents];
    }
  } catch (e) {
    incomingEvents = [{ timestamp: new Date().toISOString(), cause: newNote }];
  }

  if (rows.length > 0) {
    let existingEvents = [];

    if (rows[0].ai_notes) {
      try {
        existingEvents = JSON.parse(rows[0].ai_notes);
        if (!Array.isArray(existingEvents)) {
          existingEvents = [];
        }
      } catch (e) {
        existingEvents = [];
      }
    }

    const combinedEvents = [...existingEvents, ...incomingEvents];
    const updatedNotes = JSON.stringify(combinedEvents);

    await pool.promise().query(
      `UPDATE exerciseresults 
       SET ai_notes = ? 
       WHERE idexerciseresult = ?`,
      [updatedNotes, rows[0].idexerciseresult]
    );

    return { idexerciseresult: rows[0].idexerciseresult, status: "updated" };
  } else {
    const initialNotes = JSON.stringify(incomingEvents);

    const [result] = await pool.promise().query(
      `INSERT INTO exerciseresults (iduser, idexercise, starting_time, ai_notes) 
       VALUES (?, ?, NOW(), ?)`,
      [iduser, idexercise, initialNotes]
    );

    return { idexerciseresult: result.insertId, status: "created" };
  }
};