import { Router } from "express"
import { getUsersCourses, createCourse, getCourseById, getCourseByName, insertUserIntoCourse, getUnattendedCoursesByName, getUsersExercises, getUsersExerciseAnswers, getUsersExercisesAndResults, getUserTasksAndAnswersForExercise, getUsersTasksAndAnswersForWeek, getUsersExerciseWithTasks, getWeeksExercises, insertExerciseResult, insertUserExerciseAndTaskResults, getStudentsCompletedExerciseAndTasks, getUserExerciseData, getExamPasswordForValidation, getUsersExerciseComments, insertUserTaskComment } from "../controllers/coursesController.js"
import { auth } from '../helpers/auth.js'

const router = Router()

router.get("/myCourses",auth, getUsersCourses)
router.get("/courseName", auth, getUnattendedCoursesByName)
router.get("/userExercisesAndAnswers", auth, getUsersExercisesAndResults)
router.get("/userTasksAndAnswersWeek", auth, getUsersTasksAndAnswersForWeek)
router.get("/userExerciseDataAndTasks", auth, getUsersExerciseWithTasks)
router.get("/weekExercises", auth, getWeeksExercises)
router.get("/completedExercises", auth, getStudentsCompletedExerciseAndTasks)
router.get("/exercisedata", auth, getUserExerciseData)
router.get("/getUserExerciseComments", auth, getUsersExerciseComments)
router.get("/:courseId", auth, getCourseById)
router.post("/addExerciseAndTaskResults", auth, insertUserExerciseAndTaskResults)
router.post("/validateExamPassword", auth, getExamPasswordForValidation)
router.post("/addUserOnCourse", auth, insertUserIntoCourse)
router.post("/insertTaskComment/student", auth, insertUserTaskComment)
// Add a separate function to add a teacher comment, since the student's version 
// only let's inserts through if the user owns the taskresult
//router.post("/insertTaskComment/teacher", auth, insertTaskCommentTeacher)
router.post("/", auth, createCourse)

export default router