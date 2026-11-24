import { ObjectId } from "mongoose";
import { RoomStatus, RoomType } from "../enums/room.enum";

export interface RoomInput {
  roomNumber: string;
  roomName: string;
  roomDesc?: string;
  roomType: RoomType;
  roomMaxGuests: number;
  roomStatus?: RoomStatus;
  roomImages: string[];
}

//qaytadan yozmaslik uchun extends qilindi
export interface Room extends RoomInput {
  _id: ObjectId;
  roomStatus: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}
