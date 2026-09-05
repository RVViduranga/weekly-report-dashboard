import { Router } from "express";
import {
  list,
  getOne,
  create,
  update,
  remove,
} from "../controllers/project.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.get("/", authenticate, list);
router.get("/:id", authenticate, getOne);

router.post("/", authenticate, requireRole("MANAGER"), create);
router.patch("/:id", authenticate, requireRole("MANAGER"), update);
router.delete("/:id", authenticate, requireRole("MANAGER"), remove);

export default router;