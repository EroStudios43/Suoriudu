import {selectExerciseResultAiNotes, updateExerciseResultAiNotes} from '../models/aiNoteModel.js'
import {selectUserCourseById} from '../models/coursesModel.js'
import {checkExerciseResultOwnership} from '../models/exercisesModel.js'
import jwt from 'jsonwebtoken'

const updateUserAiNotes = async (req, res, next) => {
  try {

    console.log("UPDATE AI NOTES CONTROLLER REACHED")
    console.log(new Date().toISOString())
    console.log(req.body)

    // Check that the user is authorized (has token and it's correct)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new Error("Unauthorized"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Get parameters from the request
    const iduser = Number(req.user.iduser)
    const idexercise = Number(req.body.idexercise)
    const idcourse = Number(req.body.idcourse)
    const ai_notes = req.body.ai_notes

    // Check that all the values are valid
    if (!iduser || Number.isNaN(iduser)) {
        return next(new Error("User id is not valid"))
    }

    if (!idexercise || Number.isNaN(idexercise)) {
        return next(new Error("Exercise id is not valid"))
    }

    if (!idcourse || Number.isNaN(idcourse)) {
        return next(new Error("Course id is not valid"))
    }

    if (!ai_notes) {
        return next(new Error("Ai_notes is not valid"))
    }

    // Check that the user is attended on the course itself
    const attendedCourse = await selectUserCourseById(iduser, idcourse)

    if(!attendedCourse[0]) {
        return res.status(404).json({error: "Course not found"})
    }

    // If ok fetch previous ai_notes values
    const aiNotesRows = await selectExerciseResultAiNotes(idexercise, iduser)

    // Edit the object and add the new observation

    let newAiNotes = []

    const aiNotesFromDb = aiNotesRows[0]?.ai_notes

    if (aiNotesFromDb) {
        newAiNotes = JSON.parse(aiNotesFromDb)
    }

    newAiNotes.push({
        timestamp: new Date().toISOString(),
        cause: ai_notes
    })

    const aiNotesForDatabase = JSON.stringify(newAiNotes)

    await updateExerciseResultAiNotes(idexercise, iduser, aiNotesForDatabase)

    return res.status(200).json({
        message: "Received"
    })
  } catch (error) {
    return next(error)
  }
}

export {updateUserAiNotes}