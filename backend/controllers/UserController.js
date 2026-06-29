import { hash, compare } from "bcrypt"
import validator from "validator"
import { getUsers, createUser, selectUserByEmail, selectUserById, updateUser } from "../models/userModel.js"
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
    console.log("REQ BODY: ", req.body)

    // Errors-object is used to collect all the errors that occur during the registration process. This is done to return all the errors at once instead of returning them one by one.
    // By using an object instead of an array, the errors can be associated with the specific fields, which makes it easier for the frontend to display the errors next to the corresponding fields.
    const errors = {}
    try {
        // Check if the first name is empty
        if (!req.body.firstname || req.body.firstname.length === 0) {
            errors.firstname = "First name cannot be empty"
        }

        // Check if the last name is empty
        if (!req.body.lastname || req.body.lastname.length === 0) {
            errors.lastname = "Last name cannot be empty"
        }

        // Check if the email is empty
        if (!req.body.email || req.body.email.length === 0) {
            errors.email = "Email cannot be empty"
        }

        // Check if the email is valid
        if (!errors.email && !validator.isEmail(req.body.email)) {
            errors.email = "Email is not valid"
        }

        // Check if the password is empty
        if (!req.body.password || req.body.password.length === 0) {
            errors.password = "Password cannot be empty"
        }

        // Check if the password confirmation is empty
        if (!req.body.passwordCheck || req.body.passwordCheck.length === 0) {
            errors.passwordCheck = "Password confirmation cannot be empty"
        }

        // Check if the role is empty
        if (!req.body.role || req.body.role.length === 0) {
            errors.role = "Role cannot be empty"
        }

        // Checking if the phone number is valid, if empty -> OK
        if (req.body.phone.length > 0) {
            if (!validator.isMobilePhone(req.body.phone, "any", { strictMode: true })) {
                errors.phone = "Phone number is not valid"
            }
        } else {
            req.body.phone = null
        }

        // Making the schema for password validation and setting the requirements
        const schema = new passwordValidator()
        schema.is().min(8).has().uppercase().has().digits()  

        // Check if the password meets the requirements. Also check if there already is an error in the object, so we only return the previous one.
        if (!errors.password && !schema.validate(req.body.password)) {
            errors.password = "Password does not meet the requirements (At least 8 characters, at least one uppercase letter and at least one digit)"
        }

        // Check if the password and password confirmation match. Also check if there already is an error in the object, so we only return the previous one.
        if (!errors.passwordCheck && req.body.password !== req.body.passwordCheck) {
            errors.passwordCheck = "Password and password confirmation do not match"
        }

        // Checking if the email is already in use
        // Check if the email is empty, so we don't run the database query unecessarily
        if (!errors.email) {
            const emailFromDb = await selectUserByEmail(req.body.email)

            if (emailFromDb.length !== 0) {
                errors.email = "The email is already in use."
            }
        }

        if (Object.keys(errors).length > 0) {
            const error = new Error("Validation failed")
            error.statusCode = 401
            error.errors = errors
            return next(error)
        }

        // No errors path, hashing the password and creating the user
        const hashedPassword = await hash(req.body.password, 10)
        const user = await createUser(req.body.firstname, req.body.lastname, req.body.email, hashedPassword, req.body.phone, req.body.role)
        return res.status(201).json({ id: user.iduser, email: user.email, firstname: user.firstname, lastname: user.lastname, phone: user.phone, role: user.role })

    } catch (error) {
        return next(error)
    }
}

const userLogin = async (req, res, next) => {
    try {
        // The errors array is used to collect all the errors that occur during the login process. This is done to return all the errors at once instead of returning them one by one.
        const errors = []

        // The user data from the database is fetched with the email address. This is needed to check the password and to create the token.
        const userFromDb = await selectUserByEmail(req.body.email)
        const user = userFromDb[0]

        // Check if the user exists. Return an error with invalid email or password message if the user does not exist. This is done to prevent giving hints to the attacker about which part of the credentials is incorrect.
        if (!user || user.length === 0) {
            errors.push("Invalid email or password")
        }

        // Check if the password is correct. Return an error with invalid email or password message if the password is incorrect. This is done to prevent giving hints to the attacker about which part of the credentials is incorrect.
        
        // The check needs the user to exist, otherwise it would throw an error.
        if (user && user.length !== 0) {
            if (!await compare(req.body.password, user.password)) {
                errors.push("Invalid email or password")
            }
        }

        if (errors.length > 0) {
            const error = new Error("Validation failed")
            error.statusCode = 401
            error.errors = errors
            return next(error)
        }

        // No errors path, creating the token and returning the user data and the token
        return res
            .authorizationHeader(req.body.email)
            .status(200)
            .json({ id: user.iduser, email: user.email, firstname: user.firstname, lastname: user.lastname, phone: user.phone, role: user.role })

    } catch (error) {
        return next(error)
    }
}

const updateProfile = async (req,res,next)=>{
    try{
        const email = req.user.email;
        const result = await updateUser(req.user.email, req.body);
        res.json({ success: true, result });
    }catch(err){
        next(err);
    }
};

export { fetchUsers, userRegistration, userLogin, updateProfile  }