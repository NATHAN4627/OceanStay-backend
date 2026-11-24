import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { Room, RoomInput, RoomInquery } from "../libs/types/room";
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

  public async getRooms(inquery: RoomInquery): Promise<Room[]> {
    try {
      const match: T = {};

      if (inquery.roomType) match.roomType = inquery.roomType;

      if (inquery.search)
        match.roomType = { $regex: new RegExp(inquery.search, "i") };

      const sort: T =
        inquery.order === "roomPrice" || inquery.order === "roomNumber"
          ? { [inquery.order]: 1 }
          : { [inquery.order]: -1 };

      const result = await this.roomModel
        .aggregate([
          { $match: match },
          { $sort: sort },
          { $skip: (inquery.page * 1 - 1) * inquery.limit },
          { $limit: inquery.limit },
        ])
        .exec();

      return result;
    } catch (err) {
      console.log("Error: model:getRooms", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }
}

export default RoomService;
