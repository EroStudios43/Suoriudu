import pool from "../helpers/database.js";

const getUsers = async () => {

    const [rows] = await pool.promise().query(
        "SELECT * FROM courses"
    );
    return rows;
}

const createUser = async (firstname, lastname, email, hashedpassword, phone, role) => {
    const [result] = await pool.promise().query("INSERT INTO users (firstname, lastname, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)", [firstname, lastname, email, hashedpassword, phone, role])
    return result
}

const selectUserByEmail = async (email) => {
    const [rows] = await pool.promise().query("SELECT * FROM users WHERE email = ?", [email])
    return rows
}

const selectUserById = async (id) => {
    const [rows] = await pool.promise().query("SELECT * FROM users WHERE iduser = ?", [id])
    return rows
}

export { getUsers, createUser, selectUserByEmail, selectUserById }