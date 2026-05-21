import { Router } from "express";
import { fetchUsers } from "../controllers/UserController.js";

const router = Router();

router.get("/", fetchUsers);

export default router;