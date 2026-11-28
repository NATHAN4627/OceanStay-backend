import { ObjectId } from "mongoose";
import OrderModel from "../schema/Order.model";
import { Order } from "../libs/types/order";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import RoomModel from "../schema/Room.model";
import { RoomStatus } from "../libs/enums/room.enum";

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

class OrderService {
  private readonly orderModel;

  constructor() {
    this.orderModel = OrderModel;
  }

  public async buyRoom(
    memberId: ObjectId,
    id: string,
    checkInDate: any,
    checkOutDate: any,
  ): Promise<Order> {
    if (
      !isCalendarDate(checkInDate) ||
      !isCalendarDate(checkOutDate) ||
      checkOutDate <= checkInDate
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_STAY_DATES);
    }

    const roomId = shapeIntoMongooseObjectId(id);

    const room = await RoomModel.findOneAndUpdate(
      { _id: roomId, roomStatus: RoomStatus.AVAILABLE },
      { $set: { roomStatus: RoomStatus.SOLD } },
      { returnDocument: "after" },
    )
      .lean()
      .exec();

    if (!room) {
      const exists = await RoomModel.exists({ _id: roomId }).exec();

      if (!exists) {
        throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
      }
      throw new Errors(HttpCode.BAD_REQUEST, Message.ROOM_NOT_AVAILABLE);
    }

    const savedOrder = this.orderModel.insertOne({
      memberId,
      roomId,
      checkInDate,
      checkOutDate,
      amount: room.roomPrice,
      orderRoomInfo: {
        roomNumber: room.roomNumber,
        roomName: room.roomName,
        roomType: room.roomType,
      },
    });

    return savedOrder;
  }

  public async getOrders(id: ObjectId): Promise<Order[]> {
    const memberId = shapeIntoMongooseObjectId(id);

    const result = await this.orderModel
      .find({ memberId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return result;
  }
}

export default OrderService;
