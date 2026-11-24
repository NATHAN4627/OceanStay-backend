# 09. Xona tafsilotlari

`GET /room/:roomId` xona _id’si bo‘yicha bitta hujjatni qaytaradi. Mehmon ham so‘rov yubora oladi. `AVAILABLE` va `SOLD` xonalar detail orqali ko‘rinadi. Javobdagi `roomImages` saqlangan rasm yo‘llarini beradi.

## 1. Service

`src/libs/Errors.ts`da `Message` enum’iga `INVALID_ROOM_ID = "Invalid room ID.",` qo‘shing. `src/models/Room.service.ts`ga `import { isObjectIdOrHexString } from "mongoose";` qo‘shib, klass ichiga metodni yozing.

```ts
  public async getRoom(roomId: unknown): Promise<Room> {
    if (typeof roomId !== "string" || !isObjectIdOrHexString(roomId)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_ID);
    }

    const result = await this.roomModel.findById(roomId).lean().exec();

    if (!result) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    return result;
  }
```

URL’dan ID string keladi. Yaroqli ID tekshiruvidan so‘ng `findById()` uni schema bo‘yicha MongoDB ID’siga aylantirib qidiradi. Postman’da ro‘yxat javobidagi `_id`ni nusxalang. `roomNumber` xonaning ko‘rinadigan raqami.

## 2. Controller

`src/controller/room.controller.ts`da `export default roomController`dan oldin yozing.

```ts
roomController.getRoom = async (req: Request, res: Response) => {
  try {
    const result = await roomService.getRoom(req.params.roomId);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) {
      res.status(err.code).json({ code: err.code, message: err.message });
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
  }
};
```

## 3. Router

`src/router.ts`da mavjud ro‘yxat qatoridan keyin `getRoom`ni ulang.

```ts
router.get("/room/all", roomController.getRooms);
router.get("/room/:roomId", roomController.getRoom);
```

`/room/all` birinchi turadi. Express shu tartibda mos marshrutni tanlaydi. Ikkalasi ham cookie talab qilmaydi.

## 4. Postman

1. Cookie yubormasdan `GET /room/all?page=1&limit=10&order=createdAt`dan bitta `_id` oling.
2. Shu ID bilan `GET /room/:roomId` yuboring. `200` bilan xona nomi, turi, narxi, statusi va `roomImages` qaytadi.
3. `GET /room/not-an-id` `400` qaytaradi. Bazada mavjud bo‘lmagan yaroqli ID `404` qaytaradi.

Brauzerda rasmni ham ochish uchun `src/app.ts`da mavjud `path` importidan foydalanib, `app.use("/", router)`dan oldin xona rasmlari papkasini ulang.

```ts
app.use(
  "/uploads/room",
  express.static(path.resolve("uploads/room"), {
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);
```

Shunda `roomImages`dagi `uploads/room/...` yo‘lini API host’i bilan ochish mumkin. Bu bosqichda mavjud `express` va `mongoose` ishlatiladi.
