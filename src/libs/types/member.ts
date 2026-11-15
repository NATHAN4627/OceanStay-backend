import { ObjectId } from "mongoose";
import { MemberType, MemberStatus } from "../enums/member.enum";

export interface Member {
  _id: ObjectId;
  memberType: MemberType;
  memberStatus: MemberStatus;
  memberNick: string;
  memberPhone: string;
  memberPassword?: string;
  memberAddress?: string;
  memberDesc?: string;
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
  memberDesc?: string;
  memberImage?: string;
}

export interface MemberUpdateInput {
  _id: ObjectId;
  memberStatus?: MemberStatus;
  memberNick?: string;
  memberPhone?: string;
  memberPassword?: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
}

export interface LoginInput {
  memberNick: string;
  memberPassword: string;
}
