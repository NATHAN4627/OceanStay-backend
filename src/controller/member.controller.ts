import type { Request, Response } from "express";
import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode } from "../libs/Errors";
import { T } from "../libs/types/common";
import { MemberInput } from "../libs/types/member";
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
    console.log("Error, signup", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default memberController;
