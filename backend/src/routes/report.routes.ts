import { Router } from "express";
import {
  create,
  listMine,
  listAll,
  getOne,
  update,
  submit,
  review,
  versions,
} from "../controllers/report.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.use(authenticate);

router.post("/", create);
router.get("/mine", listMine);
router.get("/", requireRole("MANAGER"), listAll);

router.get("/:id", getOne);
router.get("/:id/versions", versions);
router.patch("/:id", update);
router.post("/:id/submit", submit);
router.post("/:id/review", requireRole("MANAGER"), review);

export default router;