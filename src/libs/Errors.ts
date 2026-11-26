export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  PAYLOAD_TOO_LARGE = 413,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong!",
  NO_DATA_FOUND = "No data is found!",
  CREATE_FAILED = "Create is failed!",
  UPDATE_FAILED = "Update is failed!",
  WRONG_PSWD_PHONE = "Member phone or password wrong!",
  WRONG_CURRENT_PASSWORD = "Current password is incorrect.",
  INVALID_PROFILE_UPDATE = "Provide a nickname, address, image, or a valid password change.",
  INVALID_MEMBER_IMAGE = "Upload a JPEG or PNG image.",
  USED_PHONE = "Already used phone!",
  NOT_AUTH = "You are not authenticated, Please login first!",
  BLOCKED_USER = "You are blocked by admin!",
  TOKEN_CREATION_FAILED = "Token creation error!",
  WRONG_PSWD_NICK = "WRONG_PSWD_NICK!",
  WRONG_CURRENT_PSWD = "Current password wong!",
  ADMIN_ONLY = "Admin access is required!",
  INVALID_MEMBER_STATUS = "INVALID_MEMBER_STATUS",
  INVALID_ROOM_ID = "Invalid room ID.",
  ROOM_NOT_AVAILABLE = "This room is no longer available.",
  INVALID_ROOM_PRICE = "This room does not have a valid price.",
  USER_ONLY = "A user account is required.",
}

class Errors extends Error {
  public code: HttpCode;
  public message: Message;

  static standard = {
    code: HttpCode.INTERNAL_SERVER_ERROR,
    message: Message.SOMETHING_WENT_WRONG,
  };

  constructor(statusCode: HttpCode, statusMessage: Message) {
    super();
    this.code = statusCode;
    this.message = statusMessage;
  }
}

export default Errors;
