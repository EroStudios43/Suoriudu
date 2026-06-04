import { Router } from "express";
import { fetchUsers, userRegistration } from "../controllers/UserController.js";
import { auth } from "../helpers/auth.js";

const router = Router();

router.get("/", fetchUsers);

router.post("/register", userRegistration)

export default router;