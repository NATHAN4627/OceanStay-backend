import express from "express";
import memberController from "./controller/member.controller";
import uploader from "./libs/uploads";
import adminController from "./controller/admin.controller";
import roomController from "./controller/room.controller";
import orderController from "./controller/order.controller";

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

router.post(
  "/admin/room/create",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  uploader("room").array("roomImages", 4),
  roomController.createRoom,
);

router.get("/room/all", roomController.getRooms);

router.get("/room/:id", roomController.getRoom);

router.post(
  "/admin/room/update/:id",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.updateRoom,
);

router.post(
  "/admin/room/delete/:id",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.deleteRoom,
);

/** ORDER */

router.post(
  "/order/room/:id",
  memberController.verifyAuth,
  orderController.buyRoom,
);

export default router;
