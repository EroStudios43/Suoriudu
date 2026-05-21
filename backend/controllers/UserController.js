import { getUsers } from "../models/User.js";

export const fetchUsers = async (req, res) => {

    try {

        const users = await getUsers();

        res.json(users);

    } catch (err) {

        res.status(500).json({ error: "Database error" });

    }
};