import { Router } from "express";
import { get } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get("/", authenticate, requireRole("MANAGER"), get);

export default router;