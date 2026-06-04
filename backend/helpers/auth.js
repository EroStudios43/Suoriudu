import jwt from "jsonwebtoken"

const auth = (req, res, next) => {
    if (!req.headers.authorization) {
        const error = new Error("Unauthorized")
        error.statusCode = 401
        return next(error)
    } else {
        try {
            const authHeader = req.headers.authorization
            const access_token = authHeader.split(" ")[1]

            const decodedUser = jwt.verify(access_token, process.env.JWT_SECRET_KEY)
            res.authorizationHeader(decodedUser.email)
            next()
        } catch (err) {
            const error = new Error("Unauthorized")
            error.statusCode = 401
            return next(error)
        }
    }
}

export { auth }