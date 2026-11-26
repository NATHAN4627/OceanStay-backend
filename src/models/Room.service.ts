import { ObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import {
  Room,
  RoomInput,
  RoomInquery,
  RoomUpdateInput,
} from "../libs/types/room";
import RoomModel from "../schema/Room.model";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { RoomStatus } from "../libs/enums/room.enum";

class RoomService {
  private readonly roomModel;

  constructor() {
    this.roomModel = RoomModel;
  }

  public async createRoom(input: RoomInput): Promise<Room> {
    try {
      const result = await this.roomModel.create({
        ...input,
        roomStatus: RoomStatus.AVAILABLE,
      });

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
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }
  }

  public async getRoom(id: string): Promise<Room> {
    try {
      const roomId = shapeIntoMongooseObjectId(id);

      const result = await this.roomModel.findById(roomId).exec();

      if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

      return result;
    } catch (err) {
      console.log("Error: model:getRoom", err);
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }
  }

  public async updateRoom(id: string, input: RoomUpdateInput): Promise<Room> {
    try {
      const roomId = shapeIntoMongooseObjectId(id);

      const result = await this.roomModel
        .findByIdAndUpdate(
          roomId,
          {
            $set: {
              roomNumber: input.roomNumber,
              roomName: input.roomName,
              roomDesc: input.roomDesc,
              roomType: input.roomType,
              roomMaxGuests: input.roomMaxGuests,
              roomPrice: input.roomPrice,
            },
          },
          { new: true },
        )
        .exec();

      if (!result)
        throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

      return result;
    } catch (err) {
      console.log("Error: model:updateRoom", err);
      throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    }
  }

  public async deleteRoom(id: string): Promise<boolean> {
    try {
      const roomId = shapeIntoMongooseObjectId(id);

      const result = await this.roomModel.findByIdAndDelete(roomId).exec();

      if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

      return true;
    } catch (err) {
      console.log("Error: model:getRoom", err);
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }
  }
}

export default RoomService;
