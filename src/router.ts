import express from "express";
import memberController from "./controller/member.controller";

const router = express.Router();

router.post("/signup", memberController.signup);
router.post("/login", memberController.login);
router.post("/logout", memberController.verifyAuth, memberController.logout);

router.get(
  "/member/info",
  memberController.verifyAuth,
  memberController.getMember,
);

export default router;
