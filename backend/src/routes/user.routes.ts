import { Router } from "express";
import {
  list,
  getOne,
  create,
  updateRole,
  remove,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.use(authenticate, requireRole("MANAGER"));

router.get("/", list);
router.post("/", create);
router.get("/:id", getOne);
router.patch("/:id/role", updateRole);
router.delete("/:id", remove);

export default router;