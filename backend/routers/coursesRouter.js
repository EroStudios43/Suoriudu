import { Router } from "express"
import { getUsersCourses, createCourse, getCourseById, getCourseByName, insertUserIntoCourse, getUnattendedCoursesByName, getUsersExercises, getUsersExerciseAnswers, getUsersExercisesAndResults } from "../controllers/coursesController.js"
import { auth } from '../helpers/auth.js'

const router = Router()

router.get("/myCourses",auth, getUsersCourses)
router.get("/courseName", auth, getUnattendedCoursesByName)
router.get("/userExercisesAndAnswers", auth, getUsersExercisesAndResults)
router.get("/:courseId", auth, getCourseById)
router.post("/addUserOnCourse", auth, insertUserIntoCourse)
router.post("/", auth, createCourse)

export default router