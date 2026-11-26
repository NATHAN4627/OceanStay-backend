# 14. Xarid tarixini ko‘rish

`GET /orders` login qilgan userning barcha xaridlarini yangisidan eskisiga qarab qaytaradi. Sotib olingan xona tahrirlansa yoki o‘chirilsa ham, javobdagi `orderRoomInfo` va `amount` xarid paytidagi qiymatlarni ko‘rsatadi.

## 1. Service

`src/models/Order.service.ts`dagi `getOrders` metodining qaytish turi `Promise<Order[]>` bo‘ladi. `.find()` massiv qaytaradi. Agar bitta order topilsa `[order]`, hech qaysi order topilmasa `[]` keladi. `Promise<Order>` deb yozilganda TypeScript bitta obyekt kutadi va `return result`ni xato deb belgilaydi.

```ts
public async getOrders(id: ObjectId): Promise<Order[]> {
  const memberId = shapeIntoMongooseObjectId(id);

  const result = await this.orderModel
    .find({ memberId })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return result;
}
```

- `.find({ memberId })` faqat shu userning orderlarini tanlaydi.
- `.sort({ createdAt: -1 })` yangi xaridlarni boshiga qo‘yadi.
- `.lean()` topilgan orderlarni oddiy obyektlar sifatida qaytaradi.

## 2. Controller

`src/controller/order.controller.ts`da `getOrders` orderlar massivini JSON qilib qaytaradi.

```ts
orderController.getOrders = async (req: ExtendedRequest, res: Response) => {
  try {
    const { member } = req;

    const result = await orderService.getOrders(member._id);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
```

`verifyAuth` topgan `req.member._id` xarid egasini belgilaydi. So‘rov uchun body va query parametrlari kerak emas.

## 3. Router

`src/router.ts`dagi GET yo‘li.

```ts
router.get("/orders", memberController.verifyAuth, orderController.getOrders);
```

## 4. Postman’da tekshirish

Avval `npx tsc --noEmit` ishlating. Postman’da **Body → none** tanlang.

| Sinov | Kutiladigan javob |
| --- | --- |
| Xarid qilgan user bilan `GET /orders` | `200` va o‘sha userning barcha xaridlari. |
| Boshqa user bilan `GET /orders` | Faqat uning xaridlari. Xaridi bo‘lmasa `200` va `[]`. |
| Admin xarid qilingan sinov xonasini o‘chirganidan keyin tarixni ochish | Xarid o‘z `orderRoomInfo` va `amount` qiymatlari bilan chiqadi. |
| Cookie’siz `GET /orders` | `401`. |

Bu qadamda mavjud `express` va `mongoose` ishlatiladi. Keyingi qadam favorites uchun xonani saqlash va ro‘yxatdan olib tashlash.
