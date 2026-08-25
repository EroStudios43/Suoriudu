import { appendAiNoteToExerciseResult } from "../models/trackingModel.js";
import { selectUserByEmail } from "../models/userModel.js";
import jwt from "jsonwebtoken";

export const logCheatingEvent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userRows = await selectUserByEmail(decoded.email);

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const iduser = userRows[0].iduser;
    const { idexercise, reason } = req.body;

    if (!idexercise || !reason) {
      return res.status(400).json({ message: "idexercise and reason are required" });
    }

    const result = await appendAiNoteToExerciseResult(iduser, idexercise, reason);

    return res.status(200).json({ 
      message: "AI violation logged successfully", 
      data: result 
    });
  } catch (error) {
    return next(error);
  }
};