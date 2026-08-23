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
    getStudentExerciseReview,
    saveStudentExerciseReview,
    updateExerciseAndTasks,
    getExerciseDetailsForEdit,
    getUsersExercises, 
    getUsersExerciseAnswers, 
    getUsersExercisesAndResults, 
    getUserTasksAndAnswersForExercise, 
    getUsersTasksAndAnswersForWeek, 
    getUsersExerciseWithTasks, 
    getWeeksExercises, 
    insertExerciseResult, 
    insertTaskResult, 
    insertUserExerciseAndTaskResults,
    getTeacherQuestion,
    getTeacherQuestions,
    getStudentsCompletedExerciseAndTasks, 
    getUserExerciseData, 
    getExamPasswordForValidation, 
    getUsersExerciseComments, 
    insertUserTaskComment,
    insertTeacherTaskComment,
    markTeacherQuestionAsRead,
    getUnreadTeacherQuestions
 } from "../controllers/coursesController.js"
import { getTeacherExamOverview, createExercise, removeExercise} from "../controllers/exercisesController.js"
import { auth } from '../helpers/auth.js'

const router = Router()

router.get("/myCourses",auth, getUsersCourses)
router.get("/courseName", auth, getUnattendedCoursesByName)
router.get("/:courseId/members", auth, getCourseMembers)
router.get("/:courseId/exercises/:exerciseId/submissions", auth, getExerciseSubmissions)
router.get("/:courseId/exercises/:exerciseId/submissions/:userId/review", auth, getStudentExerciseReview)
router.put("/:courseId/exercises/:exerciseId/submissions/:userId/review", auth, saveStudentExerciseReview)
router.get("/:courseId/exercises/:exerciseId/details", auth, getExerciseDetailsForEdit)
router.get("/userExercisesAndAnswers", auth, getUsersExercisesAndResults)
router.get("/userTasksAndAnswersWeek", auth, getUsersTasksAndAnswersForWeek)
router.get("/userExerciseDataAndTasks", auth, getUsersExerciseWithTasks)
router.get("/weekExercises", auth, getWeeksExercises)
router.get("/teacher/questions", auth, getTeacherQuestions)
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
router.post("/:courseId/members", auth, addCourseMember)
router.put("/:courseId", auth, updateCourse)
router.put("/:courseId/exercises/:exerciseId", auth, updateExerciseAndTasks)
router.delete("/:courseId/members/:userId", auth, removeCourseMember)
router.delete("/:courseId", auth, deleteCourse)
router.post("/", auth, createCourse)
router.get("/:courseId/exercises/:exerciseId/teacher-exam", auth, getTeacherExamOverview)
router.post("/:courseId/exercises", auth, createExercise)
router.delete("/:courseId/exercises/:exerciseId", auth, removeExercise)
router.get("/:courseId/exercises/:exerciseId/submissions/:userId/question/:taskId",auth,getTeacherQuestion)
router.post("/taskComments/teacher", auth, insertTeacherTaskComment)
router.put("/teacher/questions/:taskResultId/read", auth, markTeacherQuestionAsRead)
router.get("/teacher/questions/unread", auth, getUnreadTeacherQuestions);

export default router