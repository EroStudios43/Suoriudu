import { selectExerciseForCourse, updateExercisePassword, insertExercise, deleteExercise, insertTask } from "../models/exercisesModel.js"


const generateExamPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const getTeacherExamOverview = async (req, res, next) => {
  try {
    const { courseId, exerciseId } = req.params;

    const exerciseRows = await selectExerciseForCourse(exerciseId, courseId);

    if (!exerciseRows.length) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    let exercise = exerciseRows[0];

    const now = new Date();
    const start = new Date(exercise.start_time);
    const end = new Date(exercise.end_time);

    let status = "before";
    if (now >= start && now <= end) status = "running";
    if (now > end) status = "ended";

    // automaattinen salasanan luonti kun koe alkaa
    if (status === "running" && !exercise.exam_password_student) {
      const code = generateExamPassword();
      await updateExercisePassword(exercise.idexercise, code);
      exercise.exam_password_student = code;
    }

    return res.status(200).json({
      exercise: {
        idexercise: exercise.idexercise,
        exercise_name: exercise.exercise_name,
        exercise_description: exercise.exercise_description,
        start_time: exercise.start_time,
        end_time: exercise.end_time,
        allow_late_submissions: exercise.allow_late_submissions,
        max_time: exercise.max_time,
        exam_password_student: exercise.exam_password_student,
      },
      status,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
};


const createExercise = async (req, res, next) => {
  try {
    const {
      idweek,
      exercise_name,
      exercise_description,
      exercise_type,
      start_time,
      end_time,
      allow_late_submissions,
      max_time,
      tasks
    } = req.body;

    if (!idweek || !exercise_name || !exercise_type) {
      return res.status(400).json({
        error: "idweek, exercise_name and exercise_type are required"
      });
    }

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        error: "tasks must be an array"
      });
    }

    const idexercise = await insertExercise(
      idweek,
      {
        exercise_name,
        exercise_description,
        exercise_type,
        start_time,
        end_time,
        allow_late_submissions,
        max_time,
      }
    );
    for (const task of tasks) {
      await insertTask(idexercise, task);
    }

    return res.status(201).json({
      idexercise,
      message: "Exercise created"
    });
  } catch (error) {
    next(error);
  }
};


const removeExercise = async (req, res, next) => {
  try {
    const { exerciseId } = req.params;

    const result = await deleteExercise(exerciseId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Exercise not found"
      });
    }

    return res.status(200).json({
      message: "Exercise deleted"
    });
  } catch (error) {
    next(error);
  }
};





export { getTeacherExamOverview, createExercise, removeExercise };