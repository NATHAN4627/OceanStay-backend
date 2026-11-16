import type { NextFunction, Request, Response } from "express";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { ExtendedRequest, LoginInput, MemberInput } from "../libs/types/member";
import AuthService from "../models/Auth.service";
import MemberService from "../models/Member.service";

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

memberController.verifyAuth = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) req.member = await authService.verifyAuth(token);

    if (!req.member) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);

    next();
  } catch (err) {
    if (err instanceof Errors)
      res.status(err.code).json({ code: err.code, message: err.message });
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default memberController;
