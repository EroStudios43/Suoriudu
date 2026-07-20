import { selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, selectUnattendedCoursesByName, selectCourseByName, insertWeek, selectCourseWeeks, selectUserCourseById, selectAllExercisesFromCourse, selectUsersExerciseResultsFromCourse } from '../models/coursesModel.js'
import { insertExercise, insertTask, selectWeekExercises, selectAllExerciseTasks, selectUsersExerciseTaskResults, selectUsersTasksAndResultsForWeek } from '../models/exercisesModel.js'
import { emptyOrRows } from '../helpers/utils.js'
import { selectUserByEmail } from '../models/userModel.js'
import jwt from 'jsonwebtoken'

const getUsersCourses = async(req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new Error("Unauthorized"));
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const email = decoded.email;

        const userRows = await selectUserByEmail(email);
        if (!userRows.length) {
            return next(new Error("User not found"));
        }

        const iduser = userRows[0].iduser;

        const result = await selectUsersCourses(iduser);
        return res.status(200).json(result || []);
    } catch (error) {
        return next(error)
    }
}

const createCourse = async (req, res, next) => {
    try {
        // Do not allow empty course name
        const { name, course_description, startDate, endDate, weeks } = req.body;
        if (!name.trim() || !name) {
            return res.status(400).json({ error: "Course name is required" });
        }

        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const userRows = await selectUserByEmail(decoded.email);
        if (!userRows.length) {
            return next(new Error("User not found"));
        }

        const iduser = userRows[0].iduser;

        const idcourse = await insertCourse(name, course_description);

        await insertCourseMember(iduser, idcourse, "teacher");


        for (const week of weeks) {
            const idweek = await insertWeek(idcourse,week.title,week.content);

            if (week.exercises) {
                for (const exercise of week.exercises) {
                    const normalizedExercise = {
                        exercise_name: exercise.exercise_name,
                        exercise_description: exercise.exercise_description,
                        exercise_type: exercise.exercise_type, // "task" tai "exam"
                        start_time: exercise.start_time,
                        end_time: exercise.end_time,
                        allow_late_submissions: exercise.allow_late_submissions ? 1 : 0,
                        max_time: exercise.exam_duration || null
                    };

                    const idexercise = await insertExercise(idweek, normalizedExercise);

                    if (exercise.tasks) {
                        

                        for (const task of exercise.tasks) {
                            const mapTaskType = (task) => {
                                if (task.type === "choice") {
                                    return task.choiceMode === "multiple"
                                        ? "multiple_choice"
                                        : "single_choice";
                                }
                                return task.type;
                            };

                            let answer;
                            const tasktype = mapTaskType(task);

                            if (tasktype === "single_choice" || tasktype === "multiple_choice") {
                                // For choice tasks, store the options and correct answers as JSON
                                answer = JSON.stringify({
                                    choiceMode: task.choiceMode,
                                    options: task.options,
                                    correctAnswers: task.correctAnswers
                                });
                            } else {
                                // For essay, coding, and drawing tasks, just store the answer text
                                answer = task.answer || "";
                            }

                            const mappedTask = {
                                tasktype: tasktype,
                                question: task.instructions || "",
                                answer: answer
                            };

                            await insertTask(idexercise, mappedTask);
                        }

                    }
                }
                }
            }

        return res.status(201).json({ idcourse });

    } catch (error) {
        return next(error)
    }
}

const getCourseById = async (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new Error("Unauthorized"));
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const {courseId } = req.params;
        const iduser = req.query?.iduser

        // Select user course, also check the attendance of the user so unauthorized access is denied
        const course = await selectUserCourseById(iduser, courseId)

        console.log(course[0])

        if(!course[0]){
            return res.status(404).json({error: "Course not found"})
        }
        const weeks = await selectCourseWeeks(courseId)
        //console.log("WEEKS:", weeks);

        for (const week of weeks) {
            const exercises = await selectWeekExercises(week.idweek)
            //console.log("EXERCISES FOR WEEK", week.idweek, exercises);
            week.exercises = exercises
        }
        return res.status(200).json({...course[0],weeks});
    } catch(error) {
        return next(error);
    }
}

// Get course by name, previously used in student screen's "seach for courses" -form
const getCourseByName = async (req, res, next) => {
    try {
        const coursename = req.query?.coursename

        // Checking if the searchable name is valid

        // Check if the name exists and is string
        if (!coursename || typeof coursename !== "string") {
            return res.status(400).json({error: "Course name required"})
        } 

        // Sanitize the course name
        const sanitizedCourseName = coursename.trim().toLowerCase()

        // If the name is valid and sanitized, send the request to the model
        const course = await selectCourseByName(sanitizedCourseName)
        
        return res.status(200).json(course || []);
    } catch(error) {
        return next(error)
    }
}

// Get student's unattendended courses by name, currently used in student screen's "search for courses" -form
const getUnattendedCoursesByName = async (req, res, next) => {
    try {
        const coursename = req.query?.coursename

        // Checking if the searchable name is valid
        if (!coursename || typeof coursename !== "string") {
            console.log("name")
            return res.status(400).json({error: "Course name is not valid"})
        }

        // Checking if the userid is valid
        const iduser = Number(req.query?.iduser)
        if (!Number.isInteger(iduser)) {
            return res.status(400).json({error: "User id is not valid"})
        }

        // Sanitize the course name
        const sanitizedCourseName = coursename.trim().toLowerCase()

        // If ok, send request forward to the model
        const course = await selectUnattendedCoursesByName(sanitizedCourseName, iduser)
        
        return res.status(200).json(course || []);
    } catch(error) {
        return next(error)
    }
}

// Insert user into course. Default here is inserting as a student.
const insertUserIntoCourse = async (req, res, next) => {
    try {
        const idcourse = Number(req.body?.idcourse)
        const iduser = Number(req.body?.iduser)

        // Check if idcourse is valid
        if (!Number.isInteger(idcourse)) {
            return res.status(400).json({error: "Course id not valid"})
        }

        // Check if iduser is valid
        if (!Number.isInteger(idcourse)) {
            return res.status(400).json({error: "User id not valid"})
        }

        // Check if course exists
        const courseFromDb = await selectCourseById(idcourse)
        if (!courseFromDb) {
            return res.status(404).json({error: "Course not found"})
        }

        // Check if user is already on the course
        const userOnCourse = await selectUserCourseById(iduser, idcourse)
        if (userOnCourse.length !== 0) {
            return res.status(400).json({error: "User already on course"})
        }

        const result = await insertCourseMember(iduser, idcourse, "student");
        return res.status(200).json(result || []);
    } catch (error)  {
        return next(error)
    }
}

// Select all the exercises of the course the user is attended on and currently looking
const getUsersExercises = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = req?.query.iduser
        const idcourse = req?.query.idcourse

        // Check that user id and course id are valid
        if (!iduser || !Number.isInteger(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idcourse || !Number.isInteger(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)
        console.log("Allexfetch")
        if(!attendedCourse[0]) {
            
            return res.status(404).json({error: "Course not found"})
        }

        // Get the exercises for the course the user has selected
        const exercises = selectAllExercisesFromCourse(idcourse)

        return res.status(200).json(exercises || [])

    } catch (error) {
        return next(error)
    }
}

const getUsersExerciseAnswers = async (req, res, next) => {
    try {
        // Chech that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization

        if (!authHeader) {
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = req?.query.iduser
        const idcourse = req?.query.idcourse

        // Check that the user id and course id are valid
        if (!iduser || !Number.isInteger(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idcourse || !Number.isInteger(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)
        console.log("Answersfetch")
        if (!attendedCourse[0]) {
            
            return res.status(404).json({error: "Course not found"})
        }

        // Get the done exercises for the course the user has selected
        const doneExercises = selectUsersExerciseResultsFromCourse(iduser, idcourse)

        return res.status(200).json(doneExercises || [])

    } catch (error) {
        return next(error)
    }
}

const getUsersExercisesAndResults = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = Number(req.query.iduser)
        const idcourse = Number(req.query.idcourse)

        // Check that user id and course id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idcourse || Number.isNaN(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        // Get the exercises for the course the user has selected
        const exercises = await selectAllExercisesFromCourse(idcourse)

        // Get the exercise results (user's answers) for the course the user has selected
        const exerciseResults = await selectUsersExerciseResultsFromCourse(iduser, idcourse)

        return res.status(200).json({exercises, exerciseResults})

    } catch (error) {
        return next(error)
    }
}

const getUserTasksAndAnswersForExercise = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = Number(req.query.iduser)
        const idcourse = Number(req.query.idcourse)
        const idexercise = Number(req.query.idexercise)

        // Check that user id, course id, and exerciseid are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idcourse || Number.isNaN(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        if (!idexercise || Number.isNaN(idexercise)) {
            return next(new Error("Exercise id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        // Get all task for the exercise
        const exerciseTasks = await selectAllExerciseTasks(idexercise)

        // Get all user's done tasks and answers
        const taskResults = await selectUsersExerciseTaskResults(iduser, idexercise)

        return res.status(200).json({exerciseTasks, taskResults})

    } catch (error) {
        return next(error)
    }
}

const getUsersTasksAndAnswersForWeek = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = Number(req.query.iduser)
        const idcourse = Number(req.query.idcourse)
        const idweek = Number(req.query.idweek)

        // Check that user id, course id, and week id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idcourse || Number.isNaN(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        if (!idweek || Number.isNaN(idweek)) {
            return next(new Error("Exercise id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        // Get user's week's tasks and answers
        const rows = await selectUsersTasksAndResultsForWeek(iduser, idweek)

        // Make the result into a map and an array that can be returned into the frontend
        // This is done to make the handling of the data easier in the frontend

        const taskMap = new Map()
        const answerArray = []

        // Iterate over each row so we can update the task map, and add an answer to an array if there is one
        rows.forEach(row => {
            // Check if task map has the corresponding taskid already. If not, add the task along with its data.
            if (!taskMap.has(row.idtask)) {
                taskMap.set(row.idtask, {
                    idtask: row.idtask,
                    idexercise: row.idexercise,
                    tasktype: row.tasktype,
                    question: row.question,
                })
            }

            // Get the possible answers from the row, and add them to the array
            if (row.idtaskresult !== null) {
                answerArray.push({
                    idtaskresult: row.idtaskresult,
                    idtask: row.idtask,
                    iduser: row.iduser,
                    answer: row.student_answer,
                    points: row.points,
                    teacher_comment: row.teacher_comment
                })
            }
        })

        // Return the data as two arrays
        return res.status(200).json({tasks: Array.from(taskMap.values()), answerArray})

    } catch (error) {
        return next(error)
    }
}

export { getUsersCourses, createCourse, getCourseById, getCourseByName, insertUserIntoCourse, getUnattendedCoursesByName, getUsersExercises, getUsersExerciseAnswers, getUsersExercisesAndResults, getUserTasksAndAnswersForExercise, getUsersTasksAndAnswersForWeek }