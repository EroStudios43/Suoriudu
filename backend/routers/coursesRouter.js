import { Router } from "express"
import { getUsersCourses, 
    createCourse, 
    getCourseById, 
    getCourseByName, 
    insertUserIntoCourse, 
    getUnattendedCoursesByName, 
    getCourseMembers, 
    addCourseMember, 
    removeCourseMember, 
    updateCourse, 
    deleteCourse, 
    getExerciseSubmissions,
    getUsersExercises, 
    getUsersExerciseAnswers, 
    etUsersExercisesAndResults, 
    getUserTasksAndAnswersForExercise, 
    getUsersTasksAndAnswersForWeek, 
    getUsersExerciseWithTasks, 
    getWeeksExercises, 
    insertExerciseResult, 
    insertTaskResult, 
    insertUserExerciseAndTaskResults } from "../controllers/coursesController.js"
import { auth } from '../helpers/auth.js'

const router = Router()

router.get("/myCourses",auth, getUsersCourses)
router.get("/courseName", auth, getUnattendedCoursesByName)
router.get("/:courseId/members", auth, getCourseMembers)
router.get("/:courseId/exercises/:exerciseId/submissions", auth, getExerciseSubmissions)
router.get("/userExercisesAndAnswers", auth, getUsersExercisesAndResults)
router.get("/userTasksAndAnswersWeek", auth, getUsersTasksAndAnswersForWeek)
router.get("/userExerciseDataAndTasks", auth, getUsersExerciseWithTasks)
router.get("/weekExercises", auth, getWeeksExercises)
router.get("/:courseId", auth, getCourseById)
router.post("/addExerciseAndTaskResults", auth, insertUserExerciseAndTaskResults)
router.post("/addUserOnCourse", auth, insertUserIntoCourse)
router.post("/:courseId/members", auth, addCourseMember)
router.put("/:courseId", auth, updateCourse)
router.delete("/:courseId/members/:userId", auth, removeCourseMember)
router.delete("/:courseId", auth, deleteCourse)
router.post("/", auth, createCourse)

export default router