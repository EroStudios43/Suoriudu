import pool from "../helpers/database.js";

const selectUsersCourses = async (id) => {
    const [rows] = await pool.promise().query(
        "SELECT * FROM courses c INNER JOIN coursemembers cm ON c.idcourse = cm.idcourse WHERE cm.iduser = ?",
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

export { selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, insertWeek, selectCourseWeeks, selectCourseByName, selectUserCourseById, selectUnattendedCoursesByName, selectAllExercisesFromCourse, selectUsersExerciseResultsFromCourse }