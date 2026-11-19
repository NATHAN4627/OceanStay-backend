import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Member } from "../libs/types/member";
import jwt from "jsonwebtoken";

class AuthService {
  readonly secretToken;
  constructor() {
    this.secretToken = process.env.SECRET_TOKEN;
  }

  public async createToken(payload: Member): Promise<string> {
    return new Promise((resolve, reject) => {
      const duration = `${AUTH_TIMER}h`;
      jwt.sign(
        payload,
        this.secretToken as string,
        {
          expiresIn: duration,
        },
        (err, token) => {
          if (err)
            reject(
              new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_CREATION_FAILED),
            );
          else resolve(token as string);
        },
      );
    });
  }

  public async verifyAuth(token: string): Promise<string> {
    try {
      const result = jwt.verify(token, this.secretToken as string);

      if (typeof result !== "string" && typeof result._id === "string") {
        return result._id;
      }
    } catch (err) {
      if (!(err instanceof jwt.JsonWebTokenError)) throw err;
    }

    throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
  }
}

export default AuthService;
