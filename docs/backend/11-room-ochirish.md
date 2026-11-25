# 11. Admin orqali xonani o‘chirish

`POST /admin/room/delete/:id` URL’dagi MongoDB `_id` bo‘yicha bitta xona hujjatini butunlay o‘chiradi. Muvaffaqiyatli javob `200` va JSON qiymati `true`. Yuklangan rasm fayllari diskda qoladi.

## 1. Router

```ts
router.post(
  "/admin/room/delete/:id",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.deleteRoom,
);
```

`verifyAuth` cookie orqali faol akkauntni MongoDB’dan oladi. `verifyAdmin` shu akkauntning `ADMIN` rolini tekshiradi. Shundan keyin `deleteRoom` controller’i ishlaydi.

## 2. Controller

Controller `req.params.id`ni service’ga uzatadi. So‘rov body’si kerak emas.

```ts
const { id } = req.params;
const result = await roomService.deleteRoom(id as string);

res.status(HttpCode.OK).json(result);
```

`id as string` TypeScript uchun yozilgan. Qiymatning MongoDB ID’siga aylanishi service ichida bo‘ladi.

## 3. Service

```ts
public async deleteRoom(id: string): Promise<boolean> {
  try {
    const roomId = shapeIntoMongooseObjectId(id);
    const result = await this.roomModel.findByIdAndDelete(roomId).exec();

    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return true;
  } catch (err) {
    console.log("Error: model:getRoom", err);
    throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
  }
}
```

`shapeIntoMongooseObjectId()` URL’dagi stringni `ObjectId`ga aylantiradi. `findByIdAndDelete()` o‘sha ID’dagi hujjatni bazadan o‘chiradi. Hujjat topilsa service `true` qaytaradi. [Mongoose findByIdAndDelete](https://mongoosejs.com/docs/api/model.html#Model.findByIdAndDelete())

Joriy `catch` sababli topilmagan xona, yaroqsiz ID va kutilmagan MongoDB xatosi bir xil `404` bo‘lib qaytadi. Terminal yorlig‘i hozir `model:getRoom` deb chiqadi, garchi amal `deleteRoom` bo‘lsa ham.

## 4. Postman’da tekshirish

1. Sinov uchun alohida xona yarating va uning `_id`sini nusxalang.
2. Test admin bilan login qiling. Shu ID bilan `POST /admin/room/delete/:id` yuboring. `200` va javob body’sida `true` kuting.
3. `GET /room/:id`da `404` chiqishini tekshiring. `GET /room/all?page=1&limit=10&order=createdAt` ro‘yxatida xona chiqmaydi.
4. Shu ID bilan o‘chirishni takrorlasangiz `404` qaytadi. Faol oddiy user bilan `403`, cookie yubormasangiz `401` kuting.

Public signup’dagi joriy `create(input)` rol qiymatini modelga o‘tkazishi mumkin. Bu endpointni haqiqiy foydalanuvchilarga ochishdan oldin [04-qadamdagi signup maydonlari](04-signup-maydonlari.md) tuzatishini qo‘llang.

Bu qadamda mavjud `express` va `mongoose` ishlatiladi. Keyingi qadam [12. Xarid tarixi, favorites va Order modeli](12-orders-va-favorites.md).
