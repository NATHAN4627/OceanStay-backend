# 10. Admin orqali xona ma’lumotlarini yangilash

`POST /admin/room/update/:id` admin uchun. Body’da qaysi xona maydoni yuborilsa, service shuni yangilaydi. Shu dars JSON maydonlari uchun. Rasm yuklash alohida bosqichda davom etadi.

`verifyAuth → verifyAdmin → updateRoom → RoomService`

## 1. Update tipi

`src/libs/types/room.ts`ga qo‘shing.

```ts
export interface RoomUpdateInput {
  roomNumber?: string;
  roomName?: string;
  roomDesc?: string;
  roomType?: RoomType;
  roomMaxGuests?: number;
  roomPrice?: number;
  roomStatus?: RoomStatus;
}
```

Hammasi optional. Masalan, admin faqat `roomPrice` yuborishi mumkin.

## 2. Service

`src/models/Room.service.ts`dagi mavjud importga `RoomUpdateInput`ni qo‘shing. `INVALID_ROOM_ID` va `isObjectIdOrHexString` [09-qadamda](09-xona-tafsilotlari.md#1-id-va-xato-javoblari) qo‘shilgan. `src/libs/Errors.ts`dagi `Message`ga `INVALID_ROOM_UPDATE = "Provide at least one room field to update.",` qo‘shing.

```ts
  public async updateRoom(id: unknown, input: RoomUpdateInput): Promise<Room> {
    if (typeof id !== "string" || !isObjectIdOrHexString(id)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_ID);
    }

    const roomId = shapeIntoMongooseObjectId(id);
    const changes = {
      roomNumber: input.roomNumber,
      roomName: input.roomName,
      roomDesc: input.roomDesc,
      roomType: input.roomType,
      roomMaxGuests: input.roomMaxGuests,
      roomPrice: input.roomPrice,
      roomStatus: input.roomStatus,
    };

    if (Object.values(changes).every((value) => value === undefined)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_UPDATE);
    }

    const result = await this.roomModel
      .findByIdAndUpdate(
        roomId,
        { $set: changes },
        { new: true, runValidators: true },
      )
      .exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result;
  }
```

Service yangilanadigan maydonlarni aniq tanlaydi. Mongoose `undefined` maydonlarni update’dan chiqaradi. `runValidators: true` schema qoidalarini qo‘llaydi, `new: true` esa yangi holatni qaytaradi.

## 3. Controller

`src/controller/room.controller.ts`ga `import mongoose from "mongoose";` qo‘shing. Keyin `export default roomController`dan oldin yozing.

```ts
roomController.updateRoom = async (req: Request, res: Response) => {
  try {
    const result = await roomService.updateRoom(req.params.id, req.body ?? {});
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) {
      res.status(err.code).json({ code: err.code, message: err.message });
    } else if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      res.status(HttpCode.CONFLICT).json({
        code: HttpCode.CONFLICT,
        message: "Room number already exists.",
      });
    } else if (
      err instanceof mongoose.Error.ValidationError ||
      err instanceof mongoose.Error.CastError
    ) {
      res.status(HttpCode.BAD_REQUEST).json({
        code: HttpCode.BAD_REQUEST,
        message: err.message,
      });
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
  }
};
```

## 4. Router

`src/router.ts`da room route’lar yoniga qo‘shing.

```ts
router.post(
  "/admin/room/update/:id",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.updateRoom,
);
```

Admin ruxsati uchun [04-qo‘llanmadagi signup maydonlari](04-signup-maydonlari.md) tuzatishi qo‘llanadi.

## 5. Postman

1. Admin telefon va parol bilan login qiladi. `GET /room/all?page=1&limit=10&order=createdAt`dan xona `_id`sini oling.
2. `POST /admin/room/update/:id`ga **Body → raw → JSON** orqali `{"roomPrice":180000}` yuboring. `200` va yangilangan narx kuting.
3. `GET /room/:id`da narxni tekshiring. Keyin faqat `{"roomStatus":"SOLD"}` yuborib, narx avvalgi qiymatda qolganini tekshiring.
4. Bo‘sh body va yaroqsiz ID `400`, topilmagan xona `404`, band xona raqami `409`, oddiy user `403` qaytaradi.

Paketlar mavjud `express` va `mongoose`.
