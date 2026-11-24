import { ObjectId } from "mongoose";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import {
  LoginInput,
  Member,
  MemberInput,
  MemberQuery,
  MemberUpdateInput,
} from "../libs/types/member";
import MemberModel from "../schema/Member.model";
import * as bcrypt from "bcryptjs";

const memberFields =
  "memberType memberStatus memberNick memberPhone memberAddress memberImage createdAt updatedAt";

class MemberService {
  private readonly memberModel;

  constructor() {
    this.memberModel = MemberModel;
  }

  public async signup(input: MemberInput): Promise<Member> {
    input.memberNick = input.memberNick.trim();
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = "";
      return result.toJSON() as Member;
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne({
        memberPhone: input.memberPhone,
        memberStatus: { $ne: MemberStatus.DELETE },
      })
      .select("+memberPassword")
      .lean()
      .exec();

    if (!member || !member.memberPassword) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PSWD_PHONE);
    } else if (member.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    }

    if (!member || member.memberStatus !== MemberStatus.ACTIVE) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
    }

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );
    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PSWD_PHONE);
    }

    const { memberPassword, ...profile } = member;
    return profile;
  }

  public async updateMember(input: MemberUpdateInput): Promise<Member> {
    const { currentPassword, newPassword } = input;
    const filter = { _id: input._id, memberStatus: MemberStatus.ACTIVE };
    let passwordHash: string | undefined;

    if (
      (input.memberNick !== undefined &&
        typeof input.memberNick !== "string") ||
      (input.memberAddress !== undefined &&
        typeof input.memberAddress !== "string")
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PROFILE_UPDATE);
    }

    if (newPassword !== undefined || currentPassword !== undefined) {
      if (
        typeof currentPassword !== "string" ||
        !currentPassword ||
        typeof newPassword !== "string"
      ) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PROFILE_UPDATE);
      }

      const member = await this.memberModel
        .findOne(filter)
        .select("memberPassword")
        .lean()
        .exec();

      if (!member) {
        throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
      }

      if (member.memberPassword) {
        if (!(await bcrypt.compare(currentPassword, member.memberPassword))) {
          throw new Errors(
            HttpCode.BAD_REQUEST,
            Message.WRONG_CURRENT_PASSWORD,
          );
        }
      }

      const salt = await bcrypt.genSalt();
      passwordHash = await bcrypt.hash(newPassword, salt);

      member.memberPassword = passwordHash;
    }

    const changes = {
      memberNick: input.memberNick,
      memberAddress: input.memberAddress,
      memberImage: input.memberImage,
      memberPassword: passwordHash,
    };

    const result = await this.memberModel
      .findOneAndUpdate(
        filter,
        { $set: changes },
        { new: true, runValidators: true },
      )
      .select(memberFields)
      .lean()
      .exec();

    if (!result) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);

    return result;
  }

  public async getMembers(inquery: MemberQuery): Promise<Member[]> {
    const matches = { memberType: MemberType.USER };

    const result = await this.memberModel
      .aggregate([
        { $match: matches },
        { $sort: { updatedAt: -1 } },
        { $skip: (inquery.page - 1) * inquery.limit },
        { $limit: inquery.limit },
      ])
      .exec();

    return result;
  }

  public async updateMemberStatus(
    memberId: ObjectId,
    memberStatus: MemberStatus,
  ): Promise<Member> {
    const result = await this.memberModel
      .findOneAndUpdate(
        { _id: memberId, memberType: MemberType.USER },
        { $set: { memberStatus } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    }

    return result as Member;
  }

  public async getActiveMember(id: string): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(id);

    const member = await this.memberModel.findById(memberId).lean().exec();

    if (member?.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    }

    if (!member || member.memberStatus !== MemberStatus.ACTIVE) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
    }

    return member;
  }
}

export default MemberService;
