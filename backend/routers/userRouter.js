import { Router } from "express";
import { fetchUsers, userRegistration, userLogin, updateProfile  } from "../controllers/UserController.js";
import { auth } from "../helpers/auth.js";

const router = Router();

router.get("/", fetchUsers);

router.post("/register", userRegistration)

router.post("/login", userLogin)

router.put("/profile", auth, updateProfile);

export default router;