import { selectTeacherQuestions, selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, selectUnattendedCoursesByName, selectCourseByName, insertWeek, selectCourseWeeks, selectUserCourseById, selectCourseMembers, selectAllExercisesFromCourse, selectUsersExerciseResultsFromCourse, deleteCourseById, updateCourseById, removeCourseMember as removeCourseMemberFromDb, selectTeacherQuestion, updateTeacherQuestionAnswer } from '../models/coursesModel.js'
import { insertExercise, insertTask, selectWeekExercises, selectAllExerciseTasks, selectUsersExerciseTaskResults, selectUsersTasksAndResultsForWeek, selectUsersUncompletedExerciseTasksAndResults, insertTaskResult, insertExerciseResult, updateExercise, replaceExerciseTasks, updateExerciseResult, updateTaskResult, selectTaskResult, selectExerciseResult, selectUnfinishedExerciseResult, insertOrUpdateTaskResult, selectExerciseDetailsForEdit, selectWeekExerciseResults, selectUserExerciseAndTaskResultsByExerciseId, selectUserExerciseData, selectExamPasswordForValidation, selectExerciseById, selectExistingTaskResultId, checkExerciseResultOwnership } from '../models/exercisesModel.js'
import { selectUsersExerciseComments, insertTaskComment, updateCommentReadStatus } from '../models/commentModel.js'
import { emptyOrRows } from '../helpers/utils.js'
import { isTeacherReviewed } from '../helpers/submissionStatus.js'
import { selectUserByEmail } from '../models/userModel.js'
import pool from '../helpers/database.js'
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
        const { name, course_description, startDate, endDate, weeks, students } = req.body;
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

        // If students were provided when creating the course, add them as students
        console.log('createCourse: students payload =', students);
        if (Array.isArray(students) && students.length) {
            for (const studentId of students) {
                const sid = Number(studentId);
                if (!Number.isInteger(sid)) {
                    console.warn('createCourse: invalid student id', studentId);
                    continue;
                }
                // don't add the creator again
                if (sid === iduser) continue;
                try {
                    const r = await insertCourseMember(sid, idcourse, "student");
                    console.log('createCourse: inserted student', sid, 'result:', r?.insertId || r);
                } catch (err) {
                    // ignore individual insert errors ( FK violation or duplicate)
                    console.warn('Failed to add student', sid, err.message || err);
                }
            }
        }

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
                        max_time: exercise.max_time
                    };
                    console.log (normalizedExercise.exercise_type);

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
                            console.log("COURSE TASK RECEIVED:", task);
                            console.log("COURSE TASK TYPE:", task.type);
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
                                question: task.question || task.instructions || "",
                                answer: answer,
                                points: task.points ?? null
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
        const rawIdUser = req.query?.iduser;
        const iduser = rawIdUser !== undefined && rawIdUser !== null && rawIdUser !== "" ? Number(rawIdUser) : null;

        const course = iduser !== null && Number.isInteger(iduser)
            ? await selectUserCourseById(iduser, courseId)
            : await selectCourseById(courseId)

        if (!course || (Array.isArray(course) && course.length === 0) || (!Array.isArray(course) && !course.idcourse)) {
            return res.status(404).json({error: "Course not found"})
        }

        const weeks = await selectCourseWeeks(courseId)
        const members = await selectCourseMembers(courseId)

        for (const week of weeks) {
            const exercises = await selectWeekExercises(week.idweek)
            week.exercises = exercises
        }

        const courseData = Array.isArray(course) ? course[0] : course;
        return res.status(200).json({...courseData, weeks, members});
    } catch(error) {
        return next(error);
    }
}

const getExerciseDetailsForEdit = async (req, res, next) => {
    try {
        const { courseId, exerciseId } = req.params;

         const exerciseRows = await selectExerciseDetailsForEdit(courseId, exerciseId);

        if (!exerciseRows.length) {
            return res.status(404).json({ error: "Exercise not found" });
        }

        const exercise = exerciseRows[0];
        const taskRows = await selectAllExerciseTasks(exerciseId);

        const tasks = taskRows.map((task) => {
            const mapped = {
                idtask: task.idtask,
                instructions: task.question || "",
                answer: task.answer || "",
                choiceMode: "single",
                options: ["", ""],
                correctAnswers: [],
                points: task.points ?? null,
            };

            if (task.tasktype === "single_choice" || task.tasktype === "multiple_choice") {
                mapped.type = "choice";
                mapped.choiceMode = task.tasktype === "multiple_choice" ? "multiple" : "single";

                try {
                    const parsedData = task.answer ? JSON.parse(task.answer) : {};
                    mapped.options = Array.isArray(parsedData.options) && parsedData.options.length ? parsedData.options : ["", ""];
                    mapped.correctAnswers = Array.isArray(parsedData.correctAnswers) ? parsedData.correctAnswers : [];
                } catch (error) {
                    mapped.options = ["", ""];
                    mapped.correctAnswers = [];
                }

                return mapped;
            }

            if (task.tasktype === "essay") mapped.type = "essay";
            else if (task.tasktype === "coding") mapped.type = "coding";
            else if (task.tasktype === "drawing") mapped.type = "drawing";
            else mapped.type = task.tasktype || "essay";

            return mapped;
        });

        return res.status(200).json({
            exercise: {
                idexercise: exercise.idexercise,
                idweek: exercise.idweek,
                exercise_name: exercise.exercise_name,
                exercise_description: exercise.exercise_description,
                exercise_type: exercise.exercise_type,
                start_time: exercise.start_time,
                end_time: exercise.end_time,
                allow_late_submissions: Boolean(exercise.allow_late_submissions),
                max_time: exercise.max_time,
                tasks,
            }
        });
    } catch (error) {
        return next(error);
    }
};

const parseChoicePayload = (value) => {
    if (!value || value === "") return { options: [], correctAnswers: [], selectedAnswer: [], selectedAnswers: [] };

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return { options: [], correctAnswers: [], selectedAnswer: parsed, selectedAnswers: parsed };
            }
            if (parsed && typeof parsed === "object") return parsed;
            return { options: [], correctAnswers: [], selectedAnswer: parsed, selectedAnswers: Array.isArray(parsed) ? parsed : [] };
        } catch (error) {
            return { options: [], correctAnswers: [], selectedAnswer: value, selectedAnswers: [] };
        }
    }

    if (Array.isArray(value)) {
        return { options: [], correctAnswers: [], selectedAnswer: value, selectedAnswers: value };
    }

    if (typeof value === "object") return value;

    return { options: [], correctAnswers: [], selectedAnswer: value, selectedAnswers: [] };
};

const normalizeChoiceSelection = (rawValue) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return [];

    if (Array.isArray(rawValue)) {
        return rawValue.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }

    if (typeof rawValue === "number") {
        return [rawValue];
    }

    if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
            }
            if (typeof parsed === "number") {
                return [parsed];
            }
            if (parsed && typeof parsed === "object") {
                if (Array.isArray(parsed.selectedAnswers)) {
                    return parsed.selectedAnswers.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
                }
                if (Array.isArray(parsed.selectedAnswer)) {
                    return parsed.selectedAnswer.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
                }
                if (parsed.selectedAnswer !== undefined && parsed.selectedAnswer !== null && parsed.selectedAnswer !== "") {
                    const selected = Number(parsed.selectedAnswer);
                    return Number.isNaN(selected) ? [] : [selected];
                }
            }
        } catch (error) {
            // ignore and continue with legacy conversions below
        }

        if (trimmed.includes(",")) {
            return trimmed.split(",")
                .map((item) => Number(item.trim()))
                .filter((item) => !Number.isNaN(item));
        }

        const number = Number(trimmed);
        return Number.isNaN(number) ? [] : [number];
    }

    const parsed = parseChoicePayload(rawValue);

    if (Array.isArray(parsed.selectedAnswers)) {
        return parsed.selectedAnswers.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }

    if (Array.isArray(parsed.selectedAnswer)) {
        return parsed.selectedAnswer.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }

    const selected = parsed.selectedAnswer ?? parsed.correctAnswers ?? [];
    if (Array.isArray(selected)) {
        return selected.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }

    if (typeof selected === "string" && selected.includes(",")) {
        return selected.split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => !Number.isNaN(item));
    }

    const number = Number(selected);
    return Number.isNaN(number) ? [] : [number];
};

const getChoiceAutoScore = (task) => {
    const correctAnswers = Array.isArray(task.correctAnswers) ? task.correctAnswers.map((item) => Number(item)) : [];
    const selectedAnswers = Array.isArray(task.studentSelectedAnswers) ? task.studentSelectedAnswers.map((item) => Number(item)) : [];
    const points = Number(task.points ?? 0);

    if (!correctAnswers.length) return 0;

    // Single correct answer -> full points if correct selected
    if (correctAnswers.length === 1) {
        return selectedAnswers.some((item) => correctAnswers.includes(item)) ? points || 0 : 0;
    }

    // Multiple correct answers -> divide maxPoints equally among correct options
    if (points && correctAnswers.length > 0) {
        const per = points / correctAnswers.length;
        const correctSelectedCount = selectedAnswers.filter((item) => correctAnswers.includes(item)).length;
        return Number((per * correctSelectedCount).toFixed(2));
    }

    // Fallback: count correct selections
    return selectedAnswers.filter((item) => correctAnswers.includes(item)).length;
};

const getStudentExerciseReview = async (req, res, next) => {
    try {
        const { courseId, exerciseId, userId } = req.params;

        const [exerciseRows] = await pool.promise().query(
            `SELECT e.*
            FROM exercises e
            INNER JOIN weeks w ON w.idweek = e.idweek
            WHERE e.idexercise = ? AND w.idcourse = ?`,
            [exerciseId, courseId]
        );

        if (!exerciseRows.length) {
            return res.status(404).json({ error: "Exercise not found" });
        }

        const [studentRows] = await pool.promise().query(
            `SELECT iduser, firstname, lastname FROM users WHERE iduser = ?`,
            [userId]
        );

        const [taskRows] = await pool.promise().query(
            `SELECT t.idtask, t.tasktype, t.question, t.answer AS task_answer, t.points, 
            tr.teacher_comment, tr.idtaskresult, tr.answer AS student_answer, tr.points AS teacher_points        
            FROM task t
            LEFT JOIN taskresults tr ON tr.idtask = t.idtask AND tr.iduser = ?
            WHERE t.idexercise = ?
            ORDER BY t.idtask ASC`,
            [userId, exerciseId]
        );

        const tasks = taskRows.map((task, index) => {


            let normalizedType = task.tasktype || "essay";
            let displayAnswer = typeof task.student_answer === "string" && task.student_answer.length > 0
                ? task.student_answer
                : "";

            if (typeof displayAnswer === "string" && displayAnswer.startsWith('"') && displayAnswer.endsWith('"')) {
                try {
                    const unwrapped = JSON.parse(displayAnswer);
                    if (typeof unwrapped === "string") displayAnswer = unwrapped;
                } catch (error) {
                    // leave as-is
                }
            }

            let taskAnswerPayload = { options: [], correctAnswers: [], selectedAnswer: [], selectedAnswers: [] };
            let choiceOptions = [];
            let correctAnswers = [];
            let studentSelectedAnswers = [];
            let exampleAnswer = task.task_answer || "";

            if (task.tasktype === "single_choice" || task.tasktype === "multiple_choice") {
                normalizedType = "choice";
                choiceOptions = Array.isArray(parseChoicePayload(task.task_answer).options) ? parseChoicePayload(task.task_answer).options : [];
                correctAnswers = Array.isArray(parseChoicePayload(task.task_answer).correctAnswers)
                    ? parseChoicePayload(task.task_answer).correctAnswers.map((item) => Number(item))
                    : [];
                studentSelectedAnswers = normalizeChoiceSelection(task.student_answer);

                taskAnswerPayload = parseChoicePayload(task.task_answer);
                const parsedStudent = parseChoicePayload(task.student_answer);

                if (typeof parsedStudent === "object" && parsedStudent !== null) {
                    if (Array.isArray(parsedStudent.selectedAnswers)) {
                        displayAnswer = parsedStudent.selectedAnswers.map((item) => Number(item));
                    } else if (Array.isArray(parsedStudent.selectedAnswer)) {
                        displayAnswer = parsedStudent.selectedAnswer.map((item) => Number(item));
                    } else if (parsedStudent.selectedAnswer !== undefined && parsedStudent.selectedAnswer !== null && parsedStudent.selectedAnswer !== "") {
                        displayAnswer = parsedStudent.selectedAnswer;
                    } else {
                        displayAnswer = parsedStudent.correctAnswers ?? parsedStudent;
                    }
                }

                exampleAnswer = choiceOptions.filter((_, optionIndex) => correctAnswers.includes(optionIndex)).join(", ");
            } else {
                if (task.tasktype === "coding") {
                    normalizedType = "coding";
                } else if (task.tasktype === "drawing") {
                    normalizedType = "drawing";
                } else {
                    normalizedType = "essay";
                }
                exampleAnswer = task.task_answer || "";
            }

            return {
                idtask: task.idtask,
                idtaskresult: task.idtaskresult,
                title: `Tehtävä ${index + 1}`,
                instruction: task.question || "",
                type: normalizedType,
                choiceMode: task.tasktype === "multiple_choice" ? "multiple" : "single",
                options: choiceOptions,
                correctAnswers,
                studentAnswer: displayAnswer,
                studentSelectedAnswers,
                exampleAnswer,
                points: task.points ?? null,
                teacherPoints: task.teacher_points ?? "",
                teacherComment: task.teacher_comment ?? "",
                hasQuestions: false,
                autoScore: normalizedType === "choice" ? getChoiceAutoScore({ correctAnswers, studentSelectedAnswers, points: task.points }) : 0,
                
            };
        });

        return res.status(200).json({
            exercise: {
                idexercise: exerciseRows[0].idexercise,
                exercise_name: exerciseRows[0].exercise_name,
                exercise_description: exerciseRows[0].exercise_description,
                start_time: exerciseRows[0].start_time,
                end_time: exerciseRows[0].end_time,
                allow_late_submissions: exerciseRows[0].allow_late_submissions,
            },
            student: studentRows[0] || null,
            tasks,
        });
    } catch (error) {
        return next(error);
    }
};

const saveStudentExerciseReview = async (req, res, next) => {
    try {
        const { courseId, exerciseId, userId } = req.params;
        const { reviews = [] } = req.body || {};

        if (!Array.isArray(reviews)) {
            return res.status(400).json({ error: "Reviews must be an array" });
        }

        for (const review of reviews) {
            if (!review || !review.idtask) continue;

            const [rows] = await pool.promise().query(
                `SELECT tr.idtaskresult, tr.idexerciseresult
                 FROM taskresults tr
                 INNER JOIN task t ON t.idtask = tr.idtask
                 WHERE tr.iduser = ? AND t.idexercise = ? AND tr.idtask = ?
                 LIMIT 1`,
                [userId, exerciseId, review.idtask]
            );

            let idtaskresult = rows[0]?.idtaskresult;

            if (!idtaskresult) {
                const [exerciseRows] = await pool.promise().query(
                    `SELECT idexerciseresult
                     FROM exerciseresults
                     WHERE iduser = ? AND idexercise = ?
                     ORDER BY idexerciseresult DESC
                     LIMIT 1`,
                    [userId, exerciseId]
                );

                if (!exerciseRows.length) continue;

                const [insertResult] = await pool.promise().query(
                    `INSERT INTO taskresults (idtask, iduser, idexerciseresult, answer, points, teacher_comment)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [review.idtask, userId, exerciseRows[0].idexerciseresult, "", review.teacherPoints ?? null, review.teacher_comment ?? ""]
                );

                idtaskresult = insertResult.insertId;
            }

            await updateTaskResult(idtaskresult, {
                points: review.teacherPoints ?? null,
                teacher_comment: review.teacher_comment ?? "",
            });
        }

        return res.status(200).json({ success: true, courseId, exerciseId, userId });
    } catch (error) {
        return next(error);
    }
};

const getExerciseSubmissions = async (req, res, next) => {
    try {
        const { courseId, exerciseId } = req.params;

        const course = await selectCourseById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const [memberRows] = await pool.promise().query(
            "SELECT iduser FROM coursemembers WHERE idcourse = ? AND LOWER(COALESCE(userrole, '')) = 'student'",
            [courseId]
        );

        const totalStudents = memberRows.length;

        const [taskCountRows] = await pool.promise().query(
            "SELECT COUNT(*) AS total_tasks FROM task WHERE idexercise = ?",
            [exerciseId]
        );
        const totalTasks = Number(taskCountRows[0]?.total_tasks || 0);

        const [reviewSummaryRows] = await pool.promise().query(
            `SELECT tr.iduser, COUNT(*) AS reviewed_task_count
             FROM taskresults tr
             INNER JOIN task t ON tr.idtask = t.idtask
             INNER JOIN coursemembers cm ON cm.iduser = tr.iduser AND cm.idcourse = ?
             WHERE t.idexercise = ?
               AND LOWER(COALESCE(cm.userrole, '')) = 'student'
               AND tr.points IS NOT NULL
               AND TRIM(CAST(tr.points AS CHAR)) <> ''
             GROUP BY tr.iduser`,
            [courseId, exerciseId]
        );

        const reviewedTaskCounts = new Map(
            reviewSummaryRows.map((row) => [Number(row.iduser), Number(row.reviewed_task_count || 0)])
        );

        const [submissionRows] = await pool.promise().query(
            `SELECT er.idexerciseresult, er.starting_time, er.complete_time, er.ai_notes,
                    u.iduser, u.firstname, u.lastname
             FROM exerciseresults er
             INNER JOIN users u ON er.iduser = u.iduser
             INNER JOIN coursemembers cm ON cm.iduser = u.iduser AND cm.idcourse = ?
             WHERE er.idexercise = ?
               AND LOWER(COALESCE(cm.userrole, '')) = 'student'
             ORDER BY er.complete_time DESC, er.starting_time DESC`,
            [courseId, exerciseId]
        );

        const [reviewedRows] = await pool.promise().query(
            `SELECT tr.idtaskresult, tr.points, tr.teacher_comment, u.iduser, u.firstname, u.lastname
             FROM taskresults tr
             INNER JOIN task t ON tr.idtask = t.idtask
             INNER JOIN users u ON tr.iduser = u.iduser
             INNER JOIN coursemembers cm ON cm.iduser = u.iduser AND cm.idcourse = ?
             WHERE t.idexercise = ?
               AND LOWER(COALESCE(cm.userrole, '')) = 'student'
             ORDER BY tr.idtaskresult DESC`,
            [courseId, exerciseId]
        );

        const reviewedUserIds = new Map();
        const totalPointsByUser = new Map();

        reviewedRows.forEach((row) => {
            const userId = Number(row.iduser);
            reviewedUserIds.set(userId, row);

            const parsedPoints = Number(row.points);
            const safePoints = Number.isFinite(parsedPoints) ? parsedPoints : 0;
            totalPointsByUser.set(userId, (totalPointsByUser.get(userId) || 0) + safePoints);
        });

        const submissionsByUser = new Map();

        submissionRows.forEach((row) => {
            const submittedAt = row.complete_time || row.starting_time || null;
            const userId = Number(row.iduser);
            const reviewedTaskCount = reviewedTaskCounts.get(userId) || 0;
            const hasTeacherReview = reviewedTaskCount > 0;
            const isReviewed = totalTasks > 0 ? reviewedTaskCount >= totalTasks : false;
            const partialReview = hasTeacherReview && !isReviewed;
            const totalPoints = totalPointsByUser.get(userId) || 0;

            submissionsByUser.set(userId, {
                iduser: row.iduser,
                name: `${row.firstname || ""} ${row.lastname || ""}`.trim() || "Opiskelija",
                submittedAt,
                autoCheck: row.ai_notes || "Ei vielä arvioitu",
                reviewed: isReviewed,
                partialReview,
                hasTeacherReview,
                points: isReviewed ? totalPoints : null,
            });
        });

        reviewedRows.forEach((row) => {
            const userId = Number(row.iduser);
            if (!submissionsByUser.has(userId)) {
                const reviewedTaskCount = reviewedTaskCounts.get(userId) || 0;
                const hasTeacherReview = reviewedTaskCount > 0;
                const isReviewed = totalTasks > 0 ? reviewedTaskCount >= totalTasks : false;
                const partialReview = hasTeacherReview && !isReviewed;
                const totalPoints = totalPointsByUser.get(userId) || 0;
                submissionsByUser.set(userId, {
                    iduser: row.iduser,
                    name: `${row.firstname || ""} ${row.lastname || ""}`.trim() || "Opiskelija",
                    submittedAt: null,
                    autoCheck: "Ei vielä arvioitu",
                    reviewed: totalTasks > 0 ? reviewedTaskCount >= totalTasks : false,
                    partialReview,
                    hasTeacherReview,
                    points: totalTasks > 0 && reviewedTaskCount >= totalTasks ? totalPoints : null,
                });
            }
        });

        const submissions = Array.from(submissionsByUser.values());
        const reviewed = submissions.filter((submission) => submission.reviewed);
        const unreviewed = submissions.filter((submission) => !submission.reviewed);

        return res.status(200).json({
            exerciseId,
            totalStudents,
            reviewed,
            unreviewed,
        });
    } catch (error) {
        return next(error);
    }
};

const updateCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { coursename, course_description, course_start_time, course_end_time } = req.body;

        const course = await selectCourseById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const updatedCourse = await updateCourseById(courseId, {
            coursename: coursename ?? course.coursename,
            course_description: course_description ?? course.course_description,
            course_start_time: course_start_time ?? course.course_start_time,
            course_end_time: course_end_time ?? course.course_end_time,
        });

        return res.status(200).json(updatedCourse);
    } catch (error) {
        return next(error);
    }
}

const deleteCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const course = await selectCourseById(courseId);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        await deleteCourseById(courseId);
        return res.status(200).json({ success: true });
    } catch (error) {
        return next(error);
    }
}

const getCourseMembers = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const members = await selectCourseMembers(courseId);
        return res.status(200).json(members || []);
    } catch (error) {
        return next(error);
    }
}

const addCourseMember = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { iduser } = req.body;

        if (!Number.isInteger(Number(iduser))) {
            return res.status(400).json({ error: "User id not valid" });
        }

        const course = await selectCourseById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const existingMember = await selectUserCourseById(Number(iduser), Number(courseId));
        if (existingMember.length !== 0) {
            return res.status(400).json({ error: "User already on course" });
        }

        const result = await insertCourseMember(Number(iduser), Number(courseId), "student");
        return res.status(201).json(result || []);
    } catch (error) {
        return next(error);
    }
}

const removeCourseMember = async (req, res, next) => {
    try {
        const { courseId, userId } = req.params;
        const course = await selectCourseById(courseId);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        await removeCourseMemberFromDb(Number(userId), Number(courseId));
        return res.status(200).json({ success: true });
    } catch (error) {
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
        if (!Number.isInteger(iduser)) {
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
        const exercises = await selectAllExercisesFromCourse(idcourse)

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
                    full_points: row.full_points
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
            const exerciseresult = await insertExerciseResult(iduser, idexercise, now, null, null)
            unfinishedExerciseRows.push({idexerciseresult: exerciseresult.insertId})
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
            idexerciseresult: unfinishedExerciseRows[0].idexerciseresult
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

const updateExerciseAndTasks = async (req, res, next) => {
    try {
        const { courseId, exerciseId } = req.params;
        const { exercise_name, exercise_description, start_time, end_time, allow_late_submissions, max_time, tasks = [] } = req.body || {};

        if (!exerciseId || Number.isNaN(Number(exerciseId))) {
            return res.status(400).json({ error: "Exercise id is not valid" });
        }

        if (!exercise_name || !String(exercise_name).trim()) {
            return res.status(400).json({ error: "Exercise name is required" });
        }

        if (!start_time || !end_time) {
            return res.status(400).json({ error: "Exercise start and end time are required" });
        }

        await updateExercise(exerciseId, {
            exercise_name: String(exercise_name).trim(),
            exercise_description: exercise_description || "",
            start_time,
            end_time,
            allow_late_submissions: allow_late_submissions ? 1 : 0,
            max_time: max_time || null
        });

        await replaceExerciseTasks(exerciseId, tasks);

        return res.status(200).json({
            success: true,
            courseId,
            exerciseId,
            updated: true,
        });
    } catch (error) {
        return next(error);
    }
};

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
        const iduser = Number(decoded.iduser);
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

        if (allowAi === null || typeof allowAi !== "boolean") {
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

const getTeacherQuestion = async (req, res, next) => {
    try {
        const {
            courseId,
            exerciseId,
            userId,
            taskId
        } = req.params;

        const rows = await selectTeacherQuestion(
            courseId,
            exerciseId,
            userId,
            taskId
        );

        if (!rows.length) {
            return res.status(404).json({
                error: "Question not found"
            });
        }

        // Älä cacheta autentikoitua, muuttuvaa kysymysdataa
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        return res.status(200).json(rows[0]);

    } catch (error) {
        console.error("getTeacherQuestion error:", error);
        return next(error);
    }
}

const saveTeacherQuestionAnswer = async (req, res, next) => {
    try {
        const {
            courseId,
            exerciseId,
            userId,
            taskId
        } = req.params;

        const {
            teacher_comment
        } = req.body;

        if (teacher_comment === undefined) {
            return res.status(400).json({
                error: "teacher_comment is required"
            });
        }

        // Haetaan ensin task + opiskelijan vastaus
        // ja samalla varmistetaan että kaikki ID:t kuuluvat yhteen.
        const rows = await selectTeacherQuestion(
            courseId,
            exerciseId,
            userId,
            taskId
        );

        if (!rows.length) {
            return res.status(404).json({
                error: "Question not found"
            });
        }

        const question = rows[0];

        if (!question.idtaskresult) {
            return res.status(404).json({
                error: "Student has not submitted an answer for this question"
            });
        }

        await updateTeacherQuestionAnswer(
            question.idtaskresult,
            teacher_comment
        );

        return res.status(200).json({
            message: "Teacher answer saved",
            teacher_comment
        });

    } catch (error) {
        next(error);
    }
};

const getTeacherQuestions = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next(new Error("Unauthorized"));
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const userRows = await selectUserByEmail(decoded.email);

        if (!userRows.length) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        const teacherId = userRows[0].iduser;

        const questions = await selectTeacherQuestions(teacherId);

        return res.status(200).json(questions || []);

    } catch (error) {
        return next(error);
    }
};

const getUsersExerciseComments = async (req, res, next) => {
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
        const idexercise = Number(req.query.idexercise)
        const idcourse = Number(req.query.idcourse)

        // Check that user id and course id are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idexercise || Number.isNaN(idexercise)) {
            return next(new Error("Exercise id is not valid"))
        }

        if (!idcourse || Number.isNaN(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        const commentRows = await selectUsersExerciseComments(idexercise, iduser)

        return res.status(200).json({comments: commentRows || []})
    } catch (error) {
        return next(error)
    }
}

const insertUserTaskComment = async (req, res, next) => {
    try {
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
        const idtask = Number(req.body.idtask)
        const idexerciseresult = Number(req.body.idexerciseresult)
        const question = req.body.question
        const public_question = Boolean(req.body.public_question)
        const anonymous_question = Boolean(req.body.anonymous_question)

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

        if (!idtask || Number.isNaN(idtask)) {
            return next(new Error("Task id is not valid"))
        }

        if (!idexerciseresult || Number.isNaN(idexerciseresult)) {
            return next(new Error("Task id is not valid"))
        }

        if (!question || question.length < 15) {
            return next(new Error("Question must be a minimum of 15 characters"))
        }

        if (public_question === null || typeof public_question !== "boolean") {
            return next(new Error("Public question value is not valid"))
        }

        if (anonymous_question === null || typeof anonymous_question !== "boolean") {
            return next(new Error("Anonymous question value is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        // Check that exerciseresult belongs to the user
        const exerciseResultOwnershipRows = await checkExerciseResultOwnership(iduser, idexerciseresult)

        if (!exerciseResultOwnershipRows[0]) {
            return res.status(404).json({error: "Exerciseresult ownership could not be verified."})
        }

        const existingTaskResultIdRows = await selectExistingTaskResultId(iduser, idtask, idexerciseresult)

        if (!existingTaskResultIdRows[0]) {
            // If no existing task result, create a new empty one
            const newTaskResult = await insertTaskResult(idtask, iduser, exerciseResultOwnershipRows[0].idexerciseresult)
            console.log(newTaskResult.insertId)
            const idtaskresult = newTaskResult.insertId
            // After a task result is created, create the comment
            const now = new Date()
            const newComment = await insertTaskComment(idtaskresult, iduser, public_question, anonymous_question, question, now)
        } else {
            // If a result exists, use the gotten taskResultId to create a new comment
            const idtaskresult = existingTaskResultIdRows[0].idtaskresult
            const now = new Date()
            const newComment = await insertTaskComment(idtaskresult, iduser, public_question, anonymous_question, question, now)
        }
        return res.status(200).json({message: "Comment successfully submitted."})
    } catch (error) {
        return next(error)
    }
}

const updateTaskCommentReadStatus = async (req, res, next) => {
    try {
        // Check that the user is authorized (has token and it's correct)
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(new Error("Unauthorized"));
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // Get parameters from the request
        const iduser = Number(req.user.iduser)
        const idtaskcomments = Number(req.body.idtaskcomments)
        const idcourse = Number(req.body.idcourse)

        // Check that all the values are valid
        if (!iduser || Number.isNaN(iduser)) {
            return next(new Error("User id is not valid"))
        }

        if (!idtaskcomments || Number.isNaN(idtaskcomments)) {
            return next(new Error("Comment id is not valid"))
        }

        if (!idcourse || Number.isNaN(idcourse)) {
            return next(new Error("Course id is not valid"))
        }

        // Check that the user is attended on the course itself
        const attendedCourse = await selectUserCourseById(iduser, idcourse)

        if(!attendedCourse[0]) {
            return res.status(404).json({error: "Course not found"})
        }

        // Update the read-field of the comment
        const updatedCommentRows = updateCommentReadStatus(idtaskcomments)

        return res.status(200).json({message: "Comment read status successfully updated."})
    } catch (error) {
        return next(error)
    }
}

export { getTeacherQuestions, getTeacherQuestion, saveTeacherQuestionAnswer, getUsersCourses, createCourse, getCourseById, getCourseByName, insertUserIntoCourse, getUnattendedCoursesByName, getUsersExercises, getUsersExerciseAnswers, getUsersExercisesAndResults, getUserTasksAndAnswersForExercise, getUsersTasksAndAnswersForWeek, getUsersExerciseWithTasks, getWeeksExercises, updateExerciseAndTasks, getExerciseDetailsForEdit, getStudentExerciseReview, saveStudentExerciseReview, insertExerciseResult, insertTaskResult, insertUserExerciseAndTaskResults, getCourseMembers, addCourseMember, removeCourseMember, updateCourse, deleteCourse, getExerciseSubmissions, getStudentsCompletedExerciseAndTasks, getUserExerciseData, getExamPasswordForValidation, getUsersExerciseComments, insertUserTaskComment, updateTaskCommentReadStatus }
