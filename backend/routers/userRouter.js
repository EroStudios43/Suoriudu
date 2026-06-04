import { Router } from "express";
import { fetchUsers, userRegistration, userLogin } from "../controllers/UserController.js";
import { auth } from "../helpers/auth.js";

const router = Router();

router.get("/", fetchUsers);

router.post("/register", userRegistration)

router.post("/login", userLogin)

export default router;