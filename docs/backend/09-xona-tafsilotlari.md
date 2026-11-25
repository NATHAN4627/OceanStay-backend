# 09. Xona tafsilotlari

Joriy `GET /room/:id` bitta xona hujjatini qaytaradi. Mehmon ham so‘rov yubora oladi. `AVAILABLE` va `SOLD` xonalar detail orqali ko‘rinadi. Javobga xona narxi va `roomImages` yo‘llari ham kiradi.

```ts
router.get("/room/all", roomController.getRooms);
router.get("/room/:id", roomController.getRoom);
```

`/room/all` birinchi turadi, shunda `all` xona ID’si sifatida o‘qilmaydi. Controller `req.params.id`ni service’ga uzatadi. Service `shapeIntoMongooseObjectId(id)` bilan ID’ni aylantirib, `findById()` orqali bitta xona qidiradi. Xona topilsa `200` va hujjat qaytadi.

## 1. ID va xato javoblari

Joriy `catch` barcha xatolarni `404`ga aylantiradi. Shu sababli format xatosi va MongoDB xatosi ham xona topilmagandek ko‘rinadi. Aniqlashtirish uchun `src/libs/Errors.ts`dagi `Message` enum’iga `INVALID_ROOM_ID = "Invalid room ID.",` qo‘shing. `src/models/Room.service.ts`da `isObjectIdOrHexString`ni `mongoose`dan import qilib, faqat `getRoom` metodini almashtiring.

```ts
  public async getRoom(id: unknown): Promise<Room> {
    if (typeof id !== "string" || !isObjectIdOrHexString(id)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_ID);
    }

    const roomId = shapeIntoMongooseObjectId(id);
    const result = await this.roomModel.findById(roomId).exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result;
  }
```

Controllerda `await roomService.getRoom(id)` yozing. `as string` olib tashlanadi, chunki service URL qiymatini o‘zi tekshiradi. Controllerning mavjud `catch` qismi yaroqsiz ID’ga `400`, topilmagan xonaga `404`, kutilmagan xatoga `500` beradi.

## 2. Postman

1. Cookie yubormasdan `GET /room/all?page=1&limit=10&order=createdAt`dan bitta `_id` oling.
2. Shu ID bilan `GET /room/:id` yuboring. `200` va xona hujjatini kuting.
3. Yuqoridagi ID tekshiruvi qo‘shilgach, `GET /room/not-an-id` `400` beradi. Bazada mavjud bo‘lmagan yaroqli ID `404` beradi.

## 3. Rasmni brauzerda ochish

`roomImages` hozir fayl yo‘llarini qaytaradi. `app.ts`dagi static route izohga olingan bo‘lgani uchun bu yo‘llarni brauzer orqali olish hali ulanmagan. Xona rasmi kerak bo‘lganda `src/app.ts`da mavjud `path` importidan foydalanib, `app.use("/", router)`dan oldin qo‘shing.

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

Shunda `roomImages`dagi `uploads/room/...` yo‘lini API host’i bilan ochish mumkin. Bu bosqichda mavjud `express` va `mongoose` ishlatiladi. Keyingi API [10. Admin orqali xona ma’lumotlarini yangilash](10-room-yangilash.md).
