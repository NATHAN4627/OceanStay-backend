import { ObjectId } from "mongoose";
import { MemberType, MemberStatus } from "../enums/member.enum";
import type { Request } from "express";

export interface Member {
  _id: ObjectId;
  memberType: MemberType;
  memberStatus: MemberStatus;
  memberNick: string;
  memberPhone: string;
  memberPassword?: string;
  memberAddress?: string;
  memberImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberInput {
  memberType?: MemberType;
  memberStatus?: MemberStatus;
  memberNick: string;
  memberPhone: string;
  memberPassword: string;
  memberAddress?: string;
  memberImage?: string;
}

export interface MemberUpdateInput {
  _id: ObjectId;
  memberNick?: string;
  memberAddress?: string;
  memberImage?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface LoginInput {
  memberPhone: string;
  memberPassword: string;
}

export interface ExtendedRequest extends Request {
  [x: string]: any;
  member: Member;
}
