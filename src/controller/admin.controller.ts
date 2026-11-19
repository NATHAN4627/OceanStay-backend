import type { NextFunction, Response } from "express";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { ExtendedRequest, MemberQuery } from "../libs/types/member";
import MemberService from "../models/Member.service";
import { MemberType } from "../libs/enums/member.enum";

const adminController: T = {};

const memberService = new MemberService();

adminController.getMembers = async (req: ExtendedRequest, res: Response) => {
  try {
    const { page, limit } = req.query;

    const inquery: MemberQuery = {
      page: Number(page),
      limit: Number(limit),
    };

    const result = await memberService.getMembers(inquery);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

adminController.updateMemberStatus = async (
  req: ExtendedRequest,
  res: Response,
) => {
  try {
    const { memberId } = req.params;
    const { memberStatus } = req.body;

    const id = shapeIntoMongooseObjectId(memberId);

    const result = await memberService.updateMemberStatus(id, memberStatus);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

adminController.verifyAdmin = (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.member.memberType !== MemberType.ADMIN) {
    res.status(HttpCode.FORBIDDEN).json({
      code: HttpCode.FORBIDDEN,
      message: Message.ADMIN_ONLY,
    });
    return;
  }

  next();
};

export default adminController;
