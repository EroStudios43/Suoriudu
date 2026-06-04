import { hash, compare } from "bcrypt"
import validator from "validator"
import { getUsers, createUser, selectUserByEmail, selectUserById } from "../models/userModel.js"
import jwt from "jsonwebtoken"
import passwordValidator from "password-validator"


const fetchUsers = async (req, res) => {

    try {
        const users = await getUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
};

const userRegistration = async(req, res, next) => {
    console.log("REQ BODY:", req.body)
    try {
        // Check if the first name is empty
        if (!req.body.firstname || req.body.firstname.length === 0) {
            const error = new Error("First name cannot be empty")
            error.statusCode = 400
            return next(error)
        }

        // Check if the last name is empty
        if (!req.body.lastname || req.body.lastname.length === 0) {
            const error = new Error("Last name cannot be empty")
            error.statusCode = 400
            return next(error)
        }

        // Check if the email is empty
        if (!req.body.email || req.body.email.length === 0) {
            const error = new Error("Email cannot be empty")
            error.statusCode = 400
            return next(error)
        }

        // Check if the email is valid
        if (!validator.isEmail(req.body.email)) {
            const error = new Error("Email is not valid")
            error.statusCode = 400
            return next(error)
        }

        // Check if the password is empty
        if (!req.body.password || req.body.password.length === 0) {
            const error = new Error("Password cannot be empty")
            error.statusCode = 400
            return next(error)
        }

        // Making the schema for password validation and setting the requirements
        const schema = new passwordValidator()
        schema.is().min(8).has().uppercase().has().digits()  

        // Check if the password meets the requirements
        if (!schema.validate(req.body.password)) {
            const error = new Error("Password does not meet the requirements (At least 8 characters, at least one uppercase letter and at least one digit)")
            error.statusCode = 400
            return next(error)
        }

        // Checking if the email is already in use
        const emailFromDb = await selectUserByEmail(req.body.email)

        if (emailFromDb.length !== 0) {
            const error = new Error("Email is already in use")
            error.statusCode = 400
            return next(error)
        }

        // No errors path, hashing the password and creating the user
        const hashedPassword = await hash(req.body.password, 10)
        const user = await createUser(req.body.firstname, req.body.lastname, req.body.email, hashedPassword, "student")
        return res.status(201).json({ id: user.iduser, email: user.email, firstname: user.firstname, lastname: user.lastname })

    } catch (error) {
        return next(error)
    }
}

export { fetchUsers, userRegistration }