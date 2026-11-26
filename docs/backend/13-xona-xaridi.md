# 13. Xona xaridi

`POST /order/room/:id` faol `USER` uchun demo xaridni yakunlaydi. Postman’da URL’ga xonaning `_id` qiymatini qo‘yamiz va **Body → none**ni tanlaymiz. Xaridorni login sessiyasidan, narxni `Room`dan olamiz. Quyidagi transaction’siz variantda muvaffaqiyatli so‘rov `201` va yangi orderni qaytaradi.

## 1. Xato xabarlarini qo‘shish

`src/libs/Errors.ts` ichida `Message` enum’ida shu qiymatlar bo‘lishi kerak. `HttpCode`da kerakli kodlar bor.

```ts
INVALID_ROOM_ID = "Invalid room ID.",
ROOM_NOT_AVAILABLE = "This room is no longer available.",
USER_ONLY = "A user account is required.",
```

## 2. Narx va statusni tayyorlash

`src/schema/Order.model.ts`da `amount` majburiy va `min: 0`. Bazadagi narx aniq `0` bo‘lsa, demo xarid ishlaydi.

`src/models/Room.service.ts`dagi `createRoom` yangi xonani har doim `AVAILABLE` qilib yaratadi.

```ts
const result = await this.roomModel.create({
  ...input,
  roomStatus: RoomStatus.AVAILABLE,
});
```

Schema’dagi `default: AVAILABLE` maydon kelmaganda ishlaydi. `...input`dan keyin `roomStatus` berilgani uchun admin body’da `SOLD` yuborsa ham yangi xona `AVAILABLE` bo‘ladi. `RoomInput` TypeScript turi, Postman’dan keladigan body’dagi qo‘shimcha maydonlarni o‘zi olib tashlamaydi. `updateRoom`dagi `$set`ga status kiritilmagan, shuning uchun sotuv statusini xarid service’i boshqaradi. [Mongoose defaults](https://mongoosejs.com/docs/defaults.html)

## 3. `src/models/Order.service.ts`

`findOneAndUpdate` xonani `SOLD` qiladi. `insertOne` xaridor ID’si, narx va xona tafsilotlarini `Order`ga yozadi. Admin xonani o‘chirsa ham, saqlangan order tarixda qoladi.

```ts
import mongoose, { type ObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { RoomStatus } from "../libs/enums/room.enum";
import type { Order } from "../libs/types/order";
import OrderModel from "../schema/Order.model";
import RoomModel from "../schema/Room.model";

class OrderService {
  public async buyRoom(memberId: ObjectId, id: string): Promise<Order> {
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_ID);
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
      throw new Errors(HttpCode.CONFLICT, Message.ROOM_NOT_AVAILABLE);
    }

    return OrderModel.insertOne({
      memberId,
      roomId,
      amount: room.roomPrice,
      orderRoomInfo: {
        roomNumber: room.roomNumber,
        roomName: room.roomName,
        roomType: room.roomType,
      },
    });
  }
}

export default OrderService;
```

1. `findOneAndUpdate` `_id` va `AVAILABLE` sharti bilan xonani topib, bitta so‘rovda `SOLD`ga o‘tkazadi. Xona topilmasa, `exists` orqali `404` va `409`ni ajratamiz. Shu yerda `throw` chiqqan bo‘lsa, kod order yozishgacha bormaydi. [Mongoose findOneAndUpdate](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
2. Xona topilsa, `insertOne` bitta yangi order yozadi. Controller `await` orqali natijani kutadi. Service’dagi `404` va `409` controller’ga o‘z kodi bilan chiqadi. [Mongoose Model.insertOne](https://mongoosejs.com/docs/api/model.html#Model.insertOne())
3. Xonani yangilash va order yozish ikkita alohida MongoDB yozuvi. Masalan, eski xonada `roomPrice` bo‘lmasa, order validatsiyadan o‘tmaydi. Controller `500` qaytaradi, xona esa `SOLD` bo‘lib qoladi. Bu holatni demo versiyaning cheklovi sifatida hisobga oling. [MongoDB yozuvlarining atomarligi](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)

## 4. `USER` middleware va controller

`src/controller/member.controller.ts`da `verifyAuth`dan keyin va `export default memberController`dan oldin qo‘shing. Kerakli importlar shu faylda bor.

```ts
memberController.verifyUser = (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.member.memberType !== MemberType.USER) {
    res.status(HttpCode.FORBIDDEN).json({
      code: HttpCode.FORBIDDEN,
      message: Message.USER_ONLY,
    });
    return;
  }

  next();
};
```

`src/controller/order.controller.ts`ni yarating.

```ts
import type { Request, Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import type { ExtendedRequest } from "../libs/types/member";
import OrderService from "../models/Order.service";

const orderService = new OrderService();

const orderController = {
  buyRoom: async (req: Request, res: Response) => {
    try {
      const { member } = req as ExtendedRequest;
      const { id } = req.params;
      if (typeof id !== "string") {
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_ID);
      }

      const result = await orderService.buyRoom(member._id, id);

      res.status(HttpCode.CREATED).json(result);
    } catch (err) {
      if (err instanceof Errors) {
        res.status(err.code).json({ code: err.code, message: err.message });
      } else {
        console.error("Error: controller:buyRoom", err);
        res.status(Errors.standard.code).json(Errors.standard);
      }
    }
  },
};

export default orderController;
```

Controller URL’dan `id`ni, `verifyAuth` topgan memberdan esa `_id`ni oladi. `typeof` bilan tekshirilgach, TypeScript `id`ni `string` deb biladi. Controller’dagi `butRoom` nomini `buyRoom`ga almashtiring. Service xatolari `code` va `message` bilan Postman’ga chiqadi.

## 5. Router va server

`src/router.ts` tepasiga `import orderController from "./controller/order.controller";` qo‘shing. `export default router`dan oldin yozing.

```ts
router.post(
  "/order/room/:id",
  memberController.verifyAuth,
  memberController.verifyUser,
  orderController.buyRoom,
);
```

Routerdagi `veryfyAuth` nomini `verifyAuth`ga almashtiring. Middleware cookie’ni tekshirib `req.member`ni to‘ldiradi. `verifyUser` rolni tekshiradi. Keyin `buyRoom` ishlaydi.

`src/server.ts`ga `import OrderModel from "./schema/Order.model";` qo‘shing. `mongoose.connect(...)`dan keyingi `.then((data) => {` qatorini `.then(async () => {` deb yozing va callback boshiga `await OrderModel.init();` qo‘shing. Server so‘rovlarni qabul qilishdan oldin, joriy Mongoose sozlamalarida `orders` kolleksiyasi va indekslari tayyor bo‘ladi. [Mongoose Model.init](https://mongoosejs.com/docs/api/model.html#Model.init())

## 6. Postman’da tekshirish

Avval `npx tsc --noEmit`ni ishlating. Bu transaction’siz demo uchun mahalliy MongoDB bilan ham test qilsa bo‘ladi.

1. Admin bilan `POST /admin/room/create` orqali narxi bor sinov xonasini yarating. Javobdan `_id`ni oling. Status `AVAILABLE` bo‘ladi.
2. Oddiy user bilan `POST /login` qiling. Postman cookie’si bilan `POST http://localhost:3333/order/room/{{roomId}}` yuboring. `{{roomId}}` o‘rniga xona ID’sini qo‘ying yoki uni Postman variable sifatida saqlang. Body bo‘sh bo‘ladi.
3. `201` javobida `memberId`, `roomId`, `amount` va `orderRoomInfo`ni tekshiring. `GET /room/{{roomId}}` endi `SOLD` ko‘rsatadi.
4. Shu xonani qayta olishda `409`, mavjud bo‘lmagan 24 belgili hex ID bilan `404`, `abc` kabi yaroqsiz ID bilan `400` kuting. Cookiesiz `401`, admin cookie’si bilan `403` qaytadi.
5. Yangi `AVAILABLE` xona uchun ikki user cookie’si bilan bir vaqtda xarid yuboring. Javoblardan bittasi `201`, bittasi `409` bo‘ladi. Room’ga bog‘langan bitta order saqlanadi.

Bu qadamda loyihadagi `express` va `mongoose` ishlatiladi. Keyingi qadam `GET /orders/my?page=1` orqali har bir userga o‘z xaridlarini qaytarish.
