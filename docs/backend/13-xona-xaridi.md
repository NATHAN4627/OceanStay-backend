# 13. Xona xaridi

`POST /order/room/:id` faol sessiya bilan demo xaridni yakunlaydi. Xonaning `_id` qiymati URL’da, kalendardan tanlangan kelish va chiqish sanalari esa JSON body’da yuboriladi. Xaridorni login sessiyasidan, narxni `Room`dan olamiz. Muvaffaqiyatli so‘rov `200` va yangi orderni qaytaradi.

## 1. Xato xabarlari

`src/libs/Errors.ts`da topilmagan xona uchun `NO_DATA_FOUND`, sotuvda bo‘lmagan xona uchun `ROOM_NOT_AVAILABLE`, sana yaroqsiz bo‘lsa `INVALID_STAY_DATES` ishlatiladi.

```ts
ROOM_NOT_AVAILABLE = "This room is no longer available.",
INVALID_STAY_DATES = "Enter valid check-in and check-out dates (YYYY-MM-DD). Check-out must be after check-in.",
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

`buyRoom` avval sanalarni tekshiradi. `findOneAndUpdate` shundan keyin xonani `SOLD` qiladi. `insertOne` xaridor ID’si, sanalar, narx va xona tafsilotlarini `Order`ga yozadi. Admin xonani o‘chirsa ham, saqlangan order tarixda qoladi.

```ts
import { ObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { RoomStatus } from "../libs/enums/room.enum";
import type { Order } from "../libs/types/order";
import OrderModel from "../schema/Order.model";
import RoomModel from "../schema/Room.model";

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

class OrderService {
  private readonly orderModel;

  constructor() {
    this.orderModel = OrderModel;
  }

  public async buyRoom(
    memberId: ObjectId,
    id: string,
    checkInDate: unknown,
    checkOutDate: unknown,
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
      throw new Errors(HttpCode.CONFLICT, Message.ROOM_NOT_AVAILABLE);
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
}

export default OrderService;
```

1. `isCalendarDate` `YYYY-MM-DD` shaklini va sana kalendarda borligini tekshiradi. Masalan, `2026-02-30` rad etiladi. Shu shaklda sanalar yil, oy, kun tartibida keladi, shuning uchun ularni string sifatida solishtirish mumkin. Chiqish sanasi kelish sanasidan keyin bo‘lishi kerak. Xato bo‘lsa `400` qaytadi va xona statusiga tegilmaydi.
2. `findOneAndUpdate` `_id` va `AVAILABLE` sharti bilan xonani topib, bitta so‘rovda `SOLD`ga o‘tkazadi. Xona topilmasa, `exists` orqali `404` va `409`ni ajratamiz. [Mongoose findOneAndUpdate](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
3. `insertOne` yangi order yozadi. Tanlangan sanalar `YYYY-MM-DD` string sifatida saqlanadi. Bu frontendga sanani vaqt mintaqasiga aylantirmasdan ko‘rsatish imkonini beradi. [Mongoose Model.insertOne](https://mongoosejs.com/docs/api/model.html#Model.insertOne())
4. Xonani yangilash va order yozish ikkita alohida MongoDB yozuvi. Masalan, eski xonada `roomPrice` bo‘lmasa, order validatsiyadan o‘tmaydi. Controller `500` qaytaradi, xona esa `SOLD` bo‘lib qoladi. [MongoDB yozuvlarining atomarligi](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)

## 4. Controller

`src/controller/order.controller.ts`da `buyRoom` metodining asosiy qismi quyidagicha.

```ts
const { member } = req;
const { id } = req.params;
const { checkInDate, checkOutDate } = req.body ?? {};

const result = await orderService.buyRoom(
  member._id,
  id as string,
  checkInDate,
  checkOutDate,
);
res.status(HttpCode.OK).json(result);
```

Controller URL’dan `id`ni, `verifyAuth` topgan memberdan `_id`ni va body’dan sanalarni oladi. `id as string` TypeScript uchun yozilgan. Joriy kodda ID formati alohida tekshirilmaydi, shuning uchun yaroqsiz ID `500`ga tushadi.

## 5. Router

```ts
router.post(
  "/order/room/:id",
  memberController.verifyAuth,
  orderController.buyRoom,
);
```

`verifyAuth` cookie’ni tekshirib `req.member`ni to‘ldiradi. Joriy xarid route’ida alohida rol tekshiruvi yo‘q.

## 6. Postman’da tekshirish

Avval `npx tsc --noEmit`ni ishlating. Bu transaction’siz demo uchun mahalliy MongoDB bilan ham test qilsa bo‘ladi.

1. Admin bilan `POST /admin/room/create` orqali narxi bor sinov xonasini yarating. Javobdan `_id`ni oling. Status `AVAILABLE` bo‘ladi.
2. Oddiy user bilan `POST /login` qiling. Postman cookie’si bilan `POST http://localhost:3333/order/room/{{roomId}}` yuboring. **Body → raw → JSON** tanlang va quyidagi sanalarni kiriting.

   ```json
   {
     "checkInDate": "2026-12-10",
     "checkOutDate": "2026-12-12"
   }
   ```

3. `200` javobida `checkInDate` va `checkOutDate` yuborilgan qiymatlarda kelishini tekshiring. `GET /orders` javobida ham shu sanalar bor. `GET /room/{{roomId}}` endi `SOLD` ko‘rsatadi.
4. Hali `AVAILABLE` bo‘lgan boshqa xona bilan body bo‘sh, sanalar bir xil yoki chiqish sanasi oldin bo‘lgan so‘rovlarni sinang. Har birida `400` qaytadi va xona `AVAILABLE` qoladi.
5. Yaroqli sanalar bilan ayni xonani qayta olishda `409`, mavjud bo‘lmagan 24 belgili hex ID bilan `404` kuting. Cookiesiz `401` qaytadi. Ikki user bir vaqtda bir xonani olsa, order muvaffaqiyatli yozilganda bittasi `200`, ikkinchisi `409` oladi.

Bu qadamda loyihadagi `express` va `mongoose` ishlatiladi. Keyingi qadam [14. Xarid tarixi](14-xarid-tarixi.md).
