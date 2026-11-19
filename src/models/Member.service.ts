import { shapeIntoMongooseObjectId } from "../libs/config";
import { MemberStatus } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { LoginInput, Member, MemberInput } from "../libs/types/member";
import MemberModel from "../schema/Member.model";
import * as bcrypt from "bcryptjs";

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
          memberNick: input.memberNick.trim(),
          memberStatus: { $ne: MemberStatus.DELETE },
        },
        { memberNick: 1, memberPassword: 1, memberStatus: 1 },
      )
      .exec();

    if (!member || !member.memberPassword) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PSWD_NICK);
    } else if (member.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    }

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );
    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PSWD_NICK);
    }

    const result = await this.memberModel.findById(member._id).lean().exec();
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
