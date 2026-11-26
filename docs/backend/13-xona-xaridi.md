# 13. Xona xaridi

`POST /order/room/:id` faol sessiya bilan demo xaridni yakunlaydi. Postman’da URL’ga xonaning `_id` qiymatini qo‘yamiz va **Body → none**ni tanlaymiz. Xaridorni login sessiyasidan, narxni `Room`dan olamiz. Muvaffaqiyatli so‘rov `200` va yangi orderni qaytaradi.

## 1. Xato xabarlari

`src/libs/Errors.ts`da topilmagan xona uchun `NO_DATA_FOUND` ishlatiladi. Xona sotuvda bo‘lmasa `ROOM_NOT_AVAILABLE` ishlatiladi.

```ts
ROOM_NOT_AVAILABLE = "This room is no longer available.",
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
import { ObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { RoomStatus } from "../libs/enums/room.enum";
import type { Order } from "../libs/types/order";
import OrderModel from "../schema/Order.model";
import RoomModel from "../schema/Room.model";

class OrderService {
  private readonly orderModel;

  constructor() {
    this.orderModel = OrderModel;
  }

  public async buyRoom(memberId: ObjectId, id: string): Promise<Order> {
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

1. `findOneAndUpdate` `_id` va `AVAILABLE` sharti bilan xonani topib, bitta so‘rovda `SOLD`ga o‘tkazadi. Xona topilmasa, `exists` orqali `404` va `409`ni ajratamiz. Shu yerda `throw` chiqqan bo‘lsa, kod order yozishgacha bormaydi. [Mongoose findOneAndUpdate](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
2. Xona topilsa, `insertOne` bitta yangi order yozadi. Controller `await` orqali natijani kutadi. Service’dagi `404` va `409` controller’ga o‘z kodi bilan chiqadi. [Mongoose Model.insertOne](https://mongoosejs.com/docs/api/model.html#Model.insertOne())
3. Xonani yangilash va order yozish ikkita alohida MongoDB yozuvi. Masalan, eski xonada `roomPrice` bo‘lmasa, order validatsiyadan o‘tmaydi. Controller `500` qaytaradi, xona esa `SOLD` bo‘lib qoladi. Bu holatni demo versiyaning cheklovi sifatida hisobga oling. [MongoDB yozuvlarining atomarligi](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)

## 4. Controller

`src/controller/order.controller.ts`da `buyRoom` metodining asosiy qismi quyidagicha.

```ts
const { member } = req;
const { id } = req.params;

const result = await orderService.buyRoom(member._id, id as string);
res.status(HttpCode.OK).json(result);
```

Controller URL’dan `id`ni va `verifyAuth` topgan memberdan `_id`ni oladi. `id as string` TypeScript uchun yozilgan. Joriy kodda ID formati alohida tekshirilmaydi, shuning uchun yaroqsiz ID `500`ga tushadi.

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
2. Oddiy user bilan `POST /login` qiling. Postman cookie’si bilan `POST http://localhost:3333/order/room/{{roomId}}` yuboring. `{{roomId}}` o‘rniga xona ID’sini qo‘ying yoki uni Postman variable sifatida saqlang. Body bo‘sh bo‘ladi.
3. `200` javobida `memberId`, `roomId`, `amount` va `orderRoomInfo`ni tekshiring. `GET /room/{{roomId}}` endi `SOLD` ko‘rsatadi.
4. Shu xonani qayta olishda `409`, mavjud bo‘lmagan 24 belgili hex ID bilan `404` kuting. Cookiesiz `401` qaytadi.
5. Yangi `AVAILABLE` xona uchun ikki user cookie’si bilan bir vaqtda xarid yuboring. Order muvaffaqiyatli yozilsa, javoblardan bittasi `200`, bittasi `409` bo‘ladi.

Bu qadamda loyihadagi `express` va `mongoose` ishlatiladi. Keyingi qadam [14. Xarid tarixi](14-xarid-tarixi.md).
