import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

import userRouter from "./routers/userRouter.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: false}))

app.use((req,res,next) => {
    res.authorizationHeader = (email) => {
      const access_token = jwt.sign({email: email}, process.env.JWT_SECRET_KEY, {expiresIn: '15m'})
      return res.header('Access-Control-Expose-Headers','Authorization')
                .header('Authorization','Bearer ' + access_token)
    }
    next()
})

app.use("/users", userRouter);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({ 
        message: err.message || "Internal Server Error", 
        errors: err.errors || [] 
    });
});

app.listen(3001, () => {
    console.log("Server running on port 3001");
});