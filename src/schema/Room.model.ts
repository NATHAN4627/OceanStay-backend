import mongoose, { Schema } from "mongoose";
import { Room } from "../libs/types/room";
import { RoomStatus, RoomType } from "../libs/enums/room.enum";

const roomSchema = new Schema<Room>(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
    },
    roomName: {
      type: String,
      required: true,
    },
    roomMaxGuests: {
      type: Number,
      required: true,
      min: 2,
    },
    roomPrice: {
      type: Number,
      required: true,
    },
    roomDesc: {
      type: String,
    },
    roomStatus: {
      type: String,
      required: true,
      enum: RoomStatus,
      default: RoomStatus.AVAILABLE,
    },
    roomType: {
      type: String,
      required: true,
      enum: RoomType,
    },
    roomImages: {
      type: [String],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
