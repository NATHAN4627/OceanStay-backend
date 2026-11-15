import Errors, { HttpCode, Message } from "../libs/Errors";
import { Member, MemberInput } from "../libs/types/member";
import MemberModel from "../schema/Member.model";
import * as bcrypt from "bcryptjs";

class MemberService {
  private readonly memberModel;

  constructor() {
    this.memberModel = MemberModel;
  }

  public async signup(input: MemberInput): Promise<Member> {
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
}

export default MemberService;
