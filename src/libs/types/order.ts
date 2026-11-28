import { ObjectId } from "mongoose";
import { RoomType } from "../enums/room.enum";

export interface OrderRoomInfo {
  roomNumber: string;
  roomName: string;
  roomType: RoomType;
}

export interface Order {
  _id: ObjectId;
  memberId: ObjectId;
  roomId: ObjectId;
  checkInDate?: string;
  checkOutDate?: string;
  amount: number;
  orderRoomInfo: OrderRoomInfo;
  createdAt: Date;
  updatedAt: Date;
}
