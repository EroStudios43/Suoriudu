import "dotenv/config";
import express from "express";
import cors from "cors";

import userRouter from "./routers/userRouter.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRouter);

app.listen(3001, () => {
    console.log("Server running on port 3001");
});