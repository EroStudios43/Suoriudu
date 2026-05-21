import pool from "../helpers/database.js";

export const getUsers = async () => {

    const [rows] = await pool.promise().query(
        "SELECT * FROM users"
    );

    return rows;
};