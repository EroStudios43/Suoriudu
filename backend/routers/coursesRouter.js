import { Router } from "express"
import { getUsersCourses, createCourse, getCourseById } from "../controllers/coursesController.js"
import { auth } from '../helpers/auth.js'

const router = Router()

router.get("/myCourses",auth, getUsersCourses)
router.get("/:courseId", auth, getCourseById)
router.post("/", auth, createCourse)

export default router