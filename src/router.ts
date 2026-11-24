import express from "express";
import memberController from "./controller/member.controller";
import uploader from "./libs/uploads";
import adminController from "./controller/admin.controller";

const router = express.Router();

router.post("/signup", memberController.signup);
router.post("/login", memberController.login);
router.post("/logout", memberController.verifyAuth, memberController.logout);

/** MEMBER */
router.get(
  "/member/info",
  memberController.verifyAuth,
  memberController.getMember,
);

router.post(
  "/member/update",
  memberController.verifyAuth,
  uploader("member").single("memberImage"),
  memberController.updateMember,
);

/** ADMIN */

router.get(
  "/admin/members",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  adminController.getMembers,
);

router.post(
  "/admin/members/status/:memberId",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  adminController.updateMemberStatus,
);

/** ROOM */



export default router;
