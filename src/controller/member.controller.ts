import type { NextFunction, Request, Response } from "express";
import { unlink } from "node:fs/promises";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import {
  ExtendedRequest,
  LoginInput,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import AuthService from "../models/Auth.service";
import MemberService from "../models/Member.service";
import { MemberType } from "../libs/enums/member.enum";

const memberController: T = {};

const memberService = new MemberService();
const authService = new AuthService();

memberController.signup = async (req: Request, res: Response) => {
  try {
    const input: MemberInput = req.body,
      result = await memberService.signup(input),
      token = await authService.createToken(result);

    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(HttpCode.CREATED).json({ member: result, accessToken: token });
  } catch (err) {
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.login = async (req: Request, res: Response) => {
  try {
    const input: LoginInput = req.body,
      result = await memberService.login(input),
      token = await authService.createToken(result);

    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(HttpCode.OK).json({ member: result, accessToken: token });
  } catch (err) {
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.logout = (req: ExtendedRequest, res: Response) => {
  try {
    res.cookie("accessToken", null, { maxAge: 0, httpOnly: true });

    res.status(HttpCode.OK).json({ logout: true });
  } catch (err) {
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.getMember = (req: ExtendedRequest, res: Response) => {
  res.status(HttpCode.OK).json({ member: req.member });
};

memberController.updateMember = async (req: ExtendedRequest, res: Response) => {
  const file = req.file;
  console.log("file:", file);

  try {
    const { memberNick, memberAddress, currentPassword, newPassword } =
      req.body ?? {};

    const input: MemberUpdateInput = {
      _id: req.member._id,
      memberNick,
      memberAddress,
      memberImage: file ? `uploads/member/${file.filename}` : undefined,
      currentPassword,
      newPassword,
    };

    const result = await memberService.updateMember(input);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) {
      if (file) await unlink(file.path).catch(console.error);
      res.status(err.code).json({ code: err.code, message: err.message });
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
  }
};

memberController.verifyAuth = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies["accessToken"];
    if (!token) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
    }

    const memberId = await authService.verifyAuth(token);
    // user allaqacon login bolib, lekn admin block qilgan bolsa api-larni ishlata olmasligi uchun kerak
    req.member = await memberService.getActiveMember(memberId);

    if (!req.member) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);

    next();
  } catch (err) {
    res.clearCookie("accessToken");
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default memberController;
