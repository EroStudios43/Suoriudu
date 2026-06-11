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



export { selectUsersCourses, insertCourse, insertCourseMember, selectCourseById, insertWeek, selectCourseWeeks }