import mongoose, { Schema } from "mongoose";
import { Order, OrderRoomInfo } from "../libs/types/order";
import { RoomType } from "../libs/enums/room.enum";

//This Schema is - sub document to save user's order when admin deletes room that user already bought
const orderRoomInfo = new Schema<OrderRoomInfo>({
  roomNumber: {
    type: String,
    required: true,
  },
  roomName: {
    type: String,
    required: true,
  },
  roomType: {
    type: String,
    enum: RoomType,
    required: true,
  },
});

const orderSchema = new Schema<Order>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true,
    },
    checkInDate: {
      type: String,
      required: true,
    },
    checkOutDate: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isFinite,
    },
    orderRoomInfo: {
      type: orderRoomInfo,
      required: true,
    },
  },
  { timestamps: true },
);

// "Mening xaridlarim" (GET /orders/my) so'rovini tezlatish va yangi xaridlarni tepadan tartiblash uchun
// createdAt bir xil bo'lib qolganda _id tartibni barqaror ushlab turadi
// for best performance
orderSchema.index({ memberId: 1, createdAt: -1, _id: -1 });

export default mongoose.model("Order", orderSchema);
