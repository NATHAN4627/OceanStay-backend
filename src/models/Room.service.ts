import Errors, { HttpCode, Message } from "../libs/Errors";
import { Room, RoomInput } from "../libs/types/room";
import RoomModel from "../schema/Room.model";

class RoomService {
  private readonly roomModel;

  constructor() {
    this.roomModel = RoomModel;
  }

  public async createRoom(input: RoomInput): Promise<Room> {
    try {
      const result = await this.roomModel.create(input);

      if (!result)
        throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);

      return result;
    } catch (err) {
      console.log("Error: model:createRoom", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }
}

export default RoomService;
