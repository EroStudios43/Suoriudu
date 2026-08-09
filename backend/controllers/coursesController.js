import { selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, selectUnattendedCoursesByName, selectCourseByName, insertWeek, selectCourseWeeks, selectUserCourseById, selectCourseMembers, deleteCourseById, updateCourseById, removeCourseMember as removeCourseMemberFromDb } from '../models/coursesModel.js'
import { insertExercise, insertTask, selectWeekExercises } from '../models/exercisesModel.js'
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
                    // ignore individual insert errors (e.g. FK violation or duplicate)
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
        const {courseId } = req.params;

        const course = await selectCourseById(courseId)

        if(!course){
            return res.status(404).json({error: "Course not found"})
        }
        const weeks = await selectCourseWeeks(courseId)
        const members = await selectCourseMembers(courseId)

        for (const week of weeks) {
            const exercises = await selectWeekExercises(week.idweek)
            week.exercises = exercises
        }
        return res.status(200).json({...course,weeks,members});
    } catch(error) {
        return next(error);
    }
}

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

export { getUsersCourses, createCourse, getCourseById, getCourseByName, insertUserIntoCourse, getUnattendedCoursesByName, getCourseMembers, addCourseMember, removeCourseMember, updateCourse, deleteCourse}