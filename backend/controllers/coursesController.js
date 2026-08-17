import { selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, selectUnattendedCoursesByName, selectCourseByName, insertWeek, selectCourseWeeks, selectUserCourseById, selectAllExercisesFromCourse, selectUsersExerciseResultsFromCourse } from '../models/coursesModel.js'
import { insertExercise, insertTask, selectWeekExercises, selectAllExerciseTasks, selectUsersExerciseTaskResults, selectUsersTasksAndResultsForWeek, selectUsersUncompletedExerciseTasksAndResults, insertTaskResult, insertExerciseResult, updateExerciseResult, updateTaskResult, selectTaskResult, selectExerciseResult, selectUnfinishedExerciseResult, insertOrUpdateTaskResult, selectWeekExerciseResults, selectUserExerciseAndTaskResultsByExerciseId, selectUserExerciseData, selectExamPasswordForValidation, selectExerciseById } from '../models/exercisesModel.js'
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

        const courses = new Map()
        const exercises = new Map()
        const exerciseresults = new Map()

        result.forEach(row => {
            if (!courses.has(row.idcourse)) {
                courses.set(row.idcourse, {
                    idcourse: row.idcourse,
                    iduser: row.iduser,
                    userrole: row.userrole,
                    coursename: row.coursename,
                    course_description: row.course_description,
                    course_start_time: row.course_start_time,
                    course_end_time: row.course_end_time
                })
            }

            if (!exercises.has(row.idexercise)) {
                exercises.set(row.idexercise, {
                    idexercise: row.idexercise,
                    idcourse: row.idcourse,
                    start_time: row.start_time,
                    end_time: row.end_time,
                })
            }

            if(!exerciseresults.has(row.idexerciseresult)) {
                exerciseresults.set(row.idexerciseresult, {
                    idexerciseresult: row.idexerciseresult,
                    idexercise: row.idexercise,
                    idcourse: row.idcourse,
                    iduser: row.iduser,
                    starting_time: row.starting_time,
                    complete_time: row.complete_time
                })
            }
        })

        return res.status(200).json({courses: Array.from(courses.values()), exercises: Array.from(exercises.values()), exerciseresults: Array.from(exerciseresults.values())});
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

// Get course by name, previously used in student screen's "search for courses" -form
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
            return next(new Error("Week id is not valid"))
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

const getUsersExerciseWithTasks = async (req, res, next) => {
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


        // Check that user id, course id, and week id are valid
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

        // Check that if the exercise end_time has passed, and the allow_late_submissions
        const exercisedata = await selectExerciseById(idexercise)

        if (new Date(exercisedata[0].end_time) < new Date() && exercisedata[0].allow_late_submissions === false) {
            console.log("Exercise expired. Returning error 403.")
            return res.status(403).json({message: "Exercise return date has passed and late submissions are not allowed."})
        }

        // Check if a new exerciseResult for needs to be created (exercise opened for the first time)
        const unfinishedExerciseRows = await selectUnfinishedExerciseResult(idexercise, iduser)
        console.log(unfinishedExerciseRows[0])
        const now = unfinishedExerciseRows[0]?.starting_time

        if (!(unfinishedExerciseRows.length > 0)) {
            const now = new Date()
            await insertExerciseResult(iduser, idexercise, now, null, null)
        }

        // Get user's exercise data along with all exercise's tasks and already submitted task results
        const rows = await selectUsersUncompletedExerciseTasksAndResults(iduser, idexercise)

        // Make the results into three arrays of 
        // -> exercise data
        // -> tasks
        // -> task results

        const exercise = rows.length > 0 ? {
            idexercise: rows[0].idexercise,
            idweek: rows[0].idweek,
            exercise_name: rows[0].exercise_name,
            exercise_description: rows[0].exercise_description,
            exercise_type: rows[0].exercise_type,
            start_time: rows[0].start_time,
            end_time: rows[0].end_time,
            allow_late_submissions: rows[0].allow_late_submissions,
            max_time: rows[0].max_time,
            active_monitors: rows[0].active_monitors,
            exam_password_student: rows[0].exam_password_student,
            exam_duration: rows[0].exam_duration      
        } : null

        const taskMap = new Map()
        const answerArray = []

        // Iterate over each row so we can update the task map, and add an answer to an array if there is one
        rows.forEach(row => {
            // Check if task map has the corresponding taskid already. If not, add the task along with its data.
            if (!taskMap.has(row.idtask)) {
                // Make sure that the actual correct answers aren't returned to the frontend
                let taskAnswer = null
                if (row.answer) {
                    try {
                        const parsedAnswer = JSON.parse(row.answer)

                        // Remove correct answers
                        delete parsedAnswer.correctAnswers
                        
                        taskAnswer = parsedAnswer
                    } catch (error) {
                        taskAnswer = null
                    }
                }

                taskMap.set(row.idtask, {
                    idtask: row.idtask,
                    idexercise: row.idexercise,
                    tasktype: row.tasktype,
                    question: row.question,
                    answer: taskAnswer
                })
            }

            // Get the possible answers from the row, and add them to the array
            if (row.idtaskresult !== null) {
                answerArray.push({
                    idtaskresult: row.idtaskresult,
                    idtask: row.idtask,
                    iduser: row.iduser,
                    idexerciseresult: row.idexerciseresult,
                    answer: row.student_answer,
                    points: row.points,
                    teacher_comment: row.teacher_comment
                })
            }
        })

        // Return the data as an object and two arrays
        return res.status(200).json({exercise: exercise, tasks: Array.from(taskMap.values()), answerArray, starting_time: now})
    } catch (error) {
        return next(error)
    }
}

const getWeeksExercises = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new Error("Unauthorized"));
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // Get parameters from the request
        const iduser = Number(req.query.iduser)
        const idweek = Number(req.query.idweek)
        const idcourse = Number(req.query.idcourse)

        // Check that user id and course id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idweek || Number.isNaN(idweek)) {
            return next(new Error("Week id is not valid"))
        }

        if (!idcourse || Number.isNaN(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        // Get the exercises for the week the user selected
        const exercises = await selectWeekExercises(idweek)
        const exerciseresults = await selectWeekExerciseResults(idweek, iduser)

        console.log(req.user)

        return res.status(200).json({exercises, exerciseresults})
    } catch (error) {
        return next(error)
    }
}

const getStudentsCompletedExerciseAndTasks = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = req.user.iduser
        const idexercise = Number(req.query.idexercise)


        // Check that user id, course id, and week id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idexercise || Number.isNaN(idexercise)) {
            return next(new Error("Exercise id is not valid"))
        }

        // Check if a new exerciseResult for needs to be created (exercise opened for the first time)
        const completeExerciseRows = await selectUserExerciseAndTaskResultsByExerciseId(idexercise, iduser)

        // Bring the exerciseresult, tasks, and task results to a data structure like the following:
        // -> exercise
        //      -> exerciseresult
        //          -> tasks
        //              -> task results

        const exercise = completeExerciseRows.length > 0 ? {
            idexercise: completeExerciseRows[0].idexercise,
            idweek: completeExerciseRows[0].idweek,
            exercise_name: completeExerciseRows[0].exercise_name,
            exercise_description: completeExerciseRows[0].exercise_description,
            exercise_type: completeExerciseRows[0].exercise_type,
            start_time: completeExerciseRows[0].start_time,
            end_time: completeExerciseRows[0].end_time,
            allow_late_submissions: completeExerciseRows[0].allow_late_submissions,
            max_time: completeExerciseRows[0].max_time,
            active_monitors: completeExerciseRows[0].active_monitors,
            exerciseresults: new Map()
        } : null

        // Iterate over each row so we can update the exercise object.
        completeExerciseRows.forEach(row => {
            // Add exerciseresult data to the exercise object exerciseresults set
            if (!exercise.exerciseresults.has(row.idexerciseresult)) {
                exercise.exerciseresults.set(row.idexerciseresult, {
                    idexerciseresult: row.idexerciseresult,
                    iduser: row.iduser,
                    starting_time: row.starting_time,
                    complete_time: row.complete_time,
                    tasks: new Map()
                })
            }

            // Get the exeriseresult object so that updating is easier
            const exerciseresult = exercise.exerciseresults.get(row.idexerciseresult)

            // Get the exerciseresult's tasks and student's answers.
            // Bring this data to a map
            if (!exerciseresult.tasks.has(row.idtask)) {
                exerciseresult.tasks.set(row.idtask, {
                    idtask: row.idtask,
                    idtaskresult: row.idtaskresult,
                    tasktype: row.tasktype,
                    question: row.question,
                    correct_answer: row.answer,
                    student_answer: row.student_answer,
                    full_points: row.points,
                    student_points: row.student_points,
                    teacher_comment: row.teacher_comment
                })
            }
        })

        // Convert the maps to arrays for json return
        exercise.exerciseresults = [...exercise.exerciseresults.values()].map(er => ({
            ...er,
            tasks: [...er.tasks.values()]
        }))

        // Return the data as an object and two arrays
        return res.status(200).json({exercise: exercise || []})
    } catch (error) {
        return next(error)
    }
}

// Get user exercise and exerciseresult data by exerciseid
const getUserExerciseData = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = req.user.iduser
        const idexercise = Number(req.query.idexercise)


        // Check that user id, course id, and week id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idexercise || Number.isNaN(idexercise)) {
            return next(new Error("Exercise id is not valid"))
        }

        // Get exercise data and possible exerciseresults
        const exercisedata = await selectUserExerciseData(idexercise, iduser)
        console.log(exercisedata[0])

        // Return the data as an object
        return res.status(200).json({exercise: exercisedata[0] || []})
    } catch (error) {
        return next(error)
    }
}

const getExamPasswordForValidation = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization
        if (!authHeader){
            return next(new Error("Unauthorized"))
        }

        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)

        // Get parameters from the request
        const iduser = req.user.iduser
        const idexercise = Number(req.body.idexercise)
        const allowAi = Boolean(req.body.allowAi)
        const studentPass = req.body.studentPass

        // Check that user id, course id, and week id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idexercise || Number.isNaN(idexercise)) {
            return next(new Error("Exercise id is not valid"))
        }

        if (!allowAi || typeof allowAi !== "boolean") {
            return next(new Error("AllowAi is not valid."))
        }

        if (!studentPass || studentPass.length <= 0) {
            return next(new Error("Exam password cannot be empty"))
        }

        const passResponse = await selectExamPasswordForValidation(idexercise, iduser)
        
        const examPassFromDb = passResponse[0].exam_password_student

        if (examPassFromDb === studentPass) {
            // Return match true if password is correct
            return res.status(200).json({match: true})
        } else {
            return res.status(403).json({match: false})
        }

        // Return the data as an object
        return res.status(200).json({})

    } catch (error) {
        return next(error)
    }
}

// Insert exerciseresult (no task results etc.). Can be used to insert the starting time, or edit already existing records.
const insertUserExerciseResult = async (req, res, next) => {
    try {
        
    } catch (e) {
        return next(e)
    }
}

// Insert taskresult
const insertUserTaskResult = async (req, res, next) => {
    try {
        
    } catch (e) {
        return next(e)
    }
}

// Insert the exerciseresult and all the exercises taskresults at once.
const insertUserExerciseAndTaskResults = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new Error("Unauthorized"));
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // Get parameters from the request
        const iduser = req.user.iduser
        const idexercise = req.body.idexercise
        const taskResults = req.body.taskResults

        console.log(req.body)

        // Check that if the exercise end_time has passed, and the allow_late_submissions
        // Also allow the submits after 5 minutes after the initial closing time, so we take bad internet connections etc. into account.
        const exercisedata = await selectExerciseById(idexercise)

        const endTime = new Date(exercisedata[0].end_time)
        const gracePeriodMillis = 5 * 60 * 1000
        const finalEndTime = endTime + gracePeriodMillis
        const now = Date.now()

        if (now > finalEndTime && exercisedata[0].allow_late_submissions === false) {
            console.log("Exercise expired. Returning error 403.")
            return res.status(403).json({message: "Exercise return date has passed and late submissions are not allowed."})
        }

        // Check if the user already has an unfinished exerciseresult with the specified idexercise
        const unfinishedExerciseRows = await selectUnfinishedExerciseResult(idexercise, iduser)

        if (unfinishedExerciseRows.length === 0) {
            // If no record yet, throw error
            throw new Error("No active exercise attempt found")
        } else if (unfinishedExerciseRows.length > 0) {
            // If it exists, update the existing record
            const idexerciseresult = unfinishedExerciseRows[0].idexerciseresult
            console.log("Unfinished Exercise Result Id:", idexerciseresult)

            // Change the taskresults into a form where they can be used in the sql query
            // No mapping with single values here, since running everything in one sql query is more efficient
            const entries = Object.entries(taskResults)
            const taskInsertResult = await insertOrUpdateTaskResult(entries, idexerciseresult, iduser)

            // Get the current date so we can update the exerciseresult complete_time row
            const now = new Date()
            const res = await updateExerciseResult(idexerciseresult, {complete_time: now})
        }

        return res.status(200).json({message: "Exercise and task results updated successfully"})
    } catch (e) {
        return next(e)
    }
}

export { getUsersCourses, createCourse, getCourseById, getCourseByName, insertUserIntoCourse, getUnattendedCoursesByName, getUsersExercises, getUsersExerciseAnswers, getUsersExercisesAndResults, getUserTasksAndAnswersForExercise, getUsersTasksAndAnswersForWeek, getUsersExerciseWithTasks, getWeeksExercises, insertExerciseResult, insertTaskResult, insertUserExerciseAndTaskResults, getStudentsCompletedExerciseAndTasks, getUserExerciseData, getExamPasswordForValidation }