import { Router } from "express";
import { ask } from "../controllers/assistant.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// Manager-only for the same reason the dashboard is: an answer here can quote
// any team member's report, which a team member is not allowed to read.
router.post("/", authenticate, requireRole("MANAGER"), ask);

export default router;
