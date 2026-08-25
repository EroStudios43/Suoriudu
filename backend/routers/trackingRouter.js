import { Router } from "express";
import { logCheatingEvent } from "../controllers/trackingController.js";
import { auth } from "../helpers/auth.js";

const router = Router();

router.post("/log-violation", auth, logCheatingEvent);

export default router;