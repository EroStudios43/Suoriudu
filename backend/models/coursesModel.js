import pool from "../helpers/database.js";

const selectUsersCourses = async (id) => {
    const [rows] = await pool.promise().query(
        `SELECT 
            c.*,

            e.idexercise,
            e.start_time,
            e.end_time,

            er.idexerciseresult,
            er.starting_time,
            er.complete_time
        FROM courses c 
        INNER JOIN coursemembers cm 
            ON c.idcourse = cm.idcourse 
        LEFT JOIN weeks w
            ON w.idcourse = c.idcourse
        LEFT JOIN exercises e
            ON e.idweek = w.idweek
        LEFT JOIN exerciseresults er
            ON e.idexercise = er.idexercise
            AND er.iduser = cm.iduser
        WHERE cm.iduser = ?`,
        [id]
    );
    return rows;
}

const insertCourse = async (coursename, course_description) => {
    const [result] = await pool.promise().query(
        "INSERT INTO courses (coursename, course_description) VALUES (?, ?)",
        [coursename, course_description]
    );
    return result.insertId;
}

const insertCourseMember = async (iduser, idcourse, userrole) => {
    const [result] = await pool.promise().query(
        "INSERT INTO coursemembers (iduser, idcourse, userrole) VALUES (?, ?, ?)",
        [iduser, idcourse, userrole]
    );
    return result;
}

const selectCourseMembers = async (idcourse) => {
    const [rows] = await pool.promise().query(
        `SELECT cm.iduser, cm.userrole, u.firstname, u.lastname, u.email
         FROM coursemembers cm
         INNER JOIN users u ON cm.iduser = u.iduser
         WHERE cm.idcourse = ?`,
        [idcourse]
    );
    return rows;
}

const updateCourseById = async (idcourse, courseData) => {
    const [result] = await pool.promise().query(
        "UPDATE courses SET coursename = ?, course_description = ?, course_start_time = ?, course_end_time = ? WHERE idcourse = ?",
        [courseData.coursename, courseData.course_description, courseData.course_start_time, courseData.course_end_time, idcourse]
    );
    return result;
}

const deleteCourseById = async (idcourse) => {
    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `DELETE FROM taskcomments
             WHERE idtaskresult IN (
                 SELECT idtaskresult FROM taskresults WHERE idtask IN (
                     SELECT idtask FROM task WHERE idexercise IN (
                         SELECT idexercise FROM exercises WHERE idweek IN (
                             SELECT idweek FROM weeks WHERE idcourse = ?
                         )
                     )
                 )
             )`,
            [idcourse]
        );

        await connection.query(
            `DELETE FROM taskresults
             WHERE idtask IN (
                 SELECT idtask FROM task WHERE idexercise IN (
                     SELECT idexercise FROM exercises WHERE idweek IN (
                         SELECT idweek FROM weeks WHERE idcourse = ?
                     )
                 )
             )`,
            [idcourse]
        );

        await connection.query(
            `DELETE FROM task
             WHERE idexercise IN (
                 SELECT idexercise FROM exercises WHERE idweek IN (
                     SELECT idweek FROM weeks WHERE idcourse = ?
                 )
             )`,
            [idcourse]
        );

        await connection.query(
            `DELETE FROM exercises
             WHERE idweek IN (
                 SELECT idweek FROM weeks WHERE idcourse = ?
             )`,
            [idcourse]
        );

        await connection.query(
            `DELETE FROM weeks WHERE idcourse = ?`,
            [idcourse]
        );

        await connection.query(
            `DELETE FROM materials WHERE idcourse = ?`,
            [idcourse]
        );

        await connection.query(
            `DELETE FROM coursemembers WHERE idcourse = ?`,
            [idcourse]
        );

        const [result] = await connection.query(
            "DELETE FROM courses WHERE idcourse = ?",
            [idcourse]
        );

        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

const removeCourseMember = async (iduser, idcourse) => {
    const [result] = await pool.promise().query(
        "DELETE FROM coursemembers WHERE iduser = ? AND idcourse = ?",
        [iduser, idcourse]
    );
    return result;
}

const selectCourseById = async (idcourse) => {
    const [rows] = await pool.promise().query(
        "SELECT * FROM courses WHERE idcourse = ?",
        [idcourse]
    );
    return rows[0];
}

const selectCourseByName = async (coursename) => {
    const [rows] = await pool.promise().query(
        "SELECT * FROM courses WHERE coursename LIKE ?",
        [`%${coursename}%`]
    );
    return rows;
}

const selectUnattendedCoursesByName = async (coursename, iduser) => {
    const [rows] = await pool.promise().query(
        "SELECT courses.* FROM courses LEFT JOIN coursemembers ON courses.idcourse = coursemembers.idcourse AND coursemembers.iduser = ? WHERE coursemembers.idcourse IS NULL AND courses.coursename LIKE ?",
        [iduser, `%${coursename}%`]
    )
    return rows;
}

const selectUserCourseById = async (iduser, idcourse) => {
    const [rows] = await pool.promise().query(
        "SELECT * FROM courses INNER JOIN coursemembers ON courses.idcourse = coursemembers.idcourse WHERE coursemembers.iduser = ? AND coursemembers.idcourse = ?",
        [iduser, idcourse]
    );
    return rows;
}

const insertWeek = async (idcourse,week_name,week_description) => {
  const [result] = await pool.promise().query(
    `INSERT INTO weeks (idcourse, week_name, week_description)VALUES (?, ?, ?)`,
    [idcourse,week_name,week_description]
  );

  return result.insertId;
};

const selectCourseWeeks = async (idcourse) => {

    const [rows] = await pool.promise().query(`SELECT * FROM weeks WHERE idcourse = ? ORDER BY idweek`,
        [idcourse]
    );

    return rows;
}

const selectAllExercisesFromCourse = async (idcourse) => {
    const [rows] = await pool.promise().query(`
        SELECT exercises.* 
        FROM exercises 
        INNER JOIN weeks ON exercises.idweek = weeks.idweek
        WHERE weeks.idcourse = ?`,
        [idcourse]
    );
    return rows;
}

const selectUsersExerciseResultsFromCourse = async (iduser, idcourse) => {
    const [rows] = await pool.promise().query(`
        SELECT exerciseresults.* 
        FROM exerciseresults
        INNER JOIN exercises ON exerciseresults.idexercise = exercises.idexercise
        INNER JOIN weeks ON exercises.idweek = weeks.idweek
        WHERE exerciseresults.iduser = ?
            AND weeks.idcourse = ?`,
        [iduser, idcourse]
    );
    return rows;
}

export { selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, insertWeek, selectCourseWeeks, selectCourseByName, selectUserCourseById, selectUnattendedCoursesByName, selectCourseMembers, updateCourseById, deleteCourseById, removeCourseMember , selectAllExercisesFromCourse, selectUsersExerciseResultsFromCourse }
