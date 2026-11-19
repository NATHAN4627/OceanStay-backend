import { shapeIntoMongooseObjectId } from "../libs/config";
import { MemberStatus } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import {
  LoginInput,
  Member,
  MemberInput,
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
      .findOne(
        {
          memberPhone: input.memberPhone,
          memberStatus: { $ne: MemberStatus.DELETE },
        },
        { memberPassword: 1, memberStatus: 1 },
      )
      .exec();

    if (!member || !member.memberPassword) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PSWD_PHONE);
    } else if (member.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    }

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );
    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PSWD_PHONE);
    }

    return this.getActiveMember(member._id.toString());
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
