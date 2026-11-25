# 11. Admin orqali xonani o‘chirish

`POST /admin/room/delete/:id` MongoDB’dan bitta xona hujjatini o‘chiradi. Muvaffaqiyatli javob `200` va o‘chirilgan xona ID’sini qaytaradi. Xona list va detail so‘rovlaridan chiqadi. Bu qadam MongoDB hujjatiga tegishli, yuklangan rasm fayllari diskda qoladi.

## 1. Service

`src/libs/Errors.ts`dagi `Message` enum’iga `INVALID_ROOM_ID = "Invalid room ID.",` qo‘shing. Agar oldingi darsda qo‘shgan bo‘lsangiz, o‘sha qiymatni ishlating.

`src/models/Room.service.ts`dagi `mongoose` importiga `isObjectIdOrHexString`ni qo‘shing. Klass ichiga yozing.

```ts
  public async deleteRoom(id: unknown): Promise<string> {
    if (typeof id !== "string" || !isObjectIdOrHexString(id)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ROOM_ID);
    }

    const room = await this.roomModel.findByIdAndDelete(id).exec();

    if (!room) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return room._id.toString();
  }
```

ID URL’dan keladi. Tekshiruvdan keyin Mongoose ID’ni schema tipi bo‘yicha ishlatadi. `findByIdAndDelete()` qidirish va o‘chirishni bitta chaqiriqda bajaradi. ID topilmasa `404` qaytariladi. [Mongoose findByIdAndDelete](https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete())

## 2. Controller

`src/controller/room.controller.ts`da `export default roomController`dan oldin yozing.

```ts
roomController.deleteRoom = async (req: Request, res: Response) => {
  try {
    const deletedRoomId = await roomService.deleteRoom(req.params.id);
    res.status(HttpCode.OK).json({ deletedRoomId });
  } catch (err) {
    if (err instanceof Errors) {
      res.status(err.code).json({ code: err.code, message: err.message });
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
  }
};
```

Controller ID’ni URL’dan olib, service’ga uzatadi. Request body kerak emas.

## 3. Router

`src/router.ts`da xona marshrutlari yoniga qo‘shing.

```ts
router.post(
  "/admin/room/delete/:id",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.deleteRoom,
);
```

`verifyAuth` faol akkauntni topadi. `verifyAdmin` shu akkauntning `ADMIN` rolini tekshiradi. Public signup’da rol server orqali belgilanadigan qilib yozish uchun [04-qadam](04-signup-maydonlari.md)ni ishlating.

## 4. Postman’da tekshirish

1. Sinov uchun alohida xona yarating va uning `_id`sini nusxalang.
2. Test admin bilan login qiling. Shu ID bilan `POST /admin/room/delete/:id` yuboring. `200` va `{ "deletedRoomId": "..." }` kuting.
3. `GET /room/:id`da `404` chiqishini va `GET /room/all?page=1&limit=10&order=createdAt`da xona chiqmasligini tekshiring.
4. Shu ID bilan o‘chirishni takrorlasangiz `404`, ID yaroqsiz bo‘lsa `400`, oddiy user bilan `403` qaytadi.

Bu qadamda mavjud `express` va `mongoose` ishlatiladi.
