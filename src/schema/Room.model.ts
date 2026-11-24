import mongoose, { Schema } from "mongoose";
import { Room } from "../libs/types/room";
import { RoomStatus } from "../libs/enums/room.enum";

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
    roomDesc: {
      type: String,
    },
    roomStatus: {
      type: String,
      required: true,
      enum: RoomStatus,
      default: RoomStatus.AVAILABLE,
    },
    roomImages: {
      type: [String],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
