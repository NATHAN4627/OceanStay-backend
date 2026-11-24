# 06. Admin va memberlarni boshqarish

Bu fayl `admin.controller.ts`, `Member.service.ts` va `router.ts`da yozilgan hozirgi oqimni hujjatlashtiradi. Admin ham `POST /login` orqali telefon va parol bilan kiradi.

| Marshrut | Vazifa |
| --- | --- |
| `GET /admin/members?page=1&limit=10` | Oddiy memberlar ro‘yxatini sahifalab olish. |
| `POST /admin/members/status/:memberId` | Oddiy memberning statusini yangilash. |

## 1. Auth va admin roli

Ikkala route ham bir xil middleware tartibida ulangan.

```ts
router.get(
  "/admin/members",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  adminController.getMembers,
);

router.post(
  "/admin/members/status/:memberId",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  adminController.updateMemberStatus,
);
```

`memberController.verifyAuth` cookie’dagi `accessToken`ni tekshiradi, faol akkauntni MongoDB’dan oladi va `req.member`ga qo‘yadi. Keyin `adminController.verifyAdmin` `req.member.memberType`ni tekshiradi. Rol `ADMIN` bo‘lsa, `next()` orqali controller ishga tushadi. Oddiy user `403`, cookie yuborilmagan so‘rov `401` oladi.

`req.member` auth middleware ichida to‘lgani uchun routerdagi tartib muhim. `verifyAdmin` oldin chaqirilsa, `memberType`ni o‘qishda `TypeError` chiqadi.

## 2. `getMembers`

Controller `req.query`dan `page` va `limit`ni olib, `Number()` bilan sonli `MemberQuery` tuzadi. Service natijani massiv shaklida qaytaradi.

```ts
const { page, limit } = req.query;

const inquery: MemberQuery = {
  page: Number(page),
  limit: Number(limit),
};

const result = await memberService.getMembers(inquery);
res.status(HttpCode.OK).json(result);
```

Service’da `aggregate()` bosqichlari quyidagicha ishlaydi.

```ts
const matches = { memberType: MemberType.USER };

const result = await this.memberModel
  .aggregate([
    { $match: matches },
    { $sort: { updatedAt: -1 } },
    { $skip: (inquery.page - 1) * inquery.limit },
    { $limit: inquery.limit },
  ])
  .exec();
```

`$match` oddiy `USER` akkauntlarini oladi. `$sort` yaqinda yangilanganlarini oldinga qo‘yadi. Har sahifada 10 ta olish uchun Postman’da ikkala parametrni yuboring. `page=1&limit=10`da `$skip` 0, `page=2&limit=10`da 10 bo‘ladi. Hozir service sonni query’dan oladi.

## 3. `updateMemberStatus`

Controller URL’dan `memberId` va JSON body’dan `memberStatus`ni oladi. `shapeIntoMongooseObjectId()` URL’dagi string ID’ni MongoDB ID’siga aylantiradi. TypeScript’dagi `memberId` xatosi shu yerda hal qilingan. Service `ObjectId` qabul qiladi.

```ts
const { memberId } = req.params;
const { memberStatus } = req.body;

const id = shapeIntoMongooseObjectId(memberId);
const result = await memberService.updateMemberStatus(id, memberStatus);
res.status(HttpCode.OK).json(result);
```

```ts
const result = await this.memberModel
  .findOneAndUpdate(
    { _id: memberId, memberType: MemberType.USER },
    { $set: { memberStatus } },
    { new: true },
  )
  .exec();
```

`_id` va `USER` filtri qaysi akkaunt yangilanishini belgilaydi. `$set` statusni yozadi, `new: true` yangilangan memberni qaytaradi. Mos member topilmasa, hozirgi service `HttpCode.NOT_MODIFIED` yuboradi. `DELETE` akkauntni bazada saqlagan holda o‘chirilgan deb belgilash uchun mo‘ljallangan. Joriy login `DELETE` statusli yozuvlarni qidiruvdan chiqaradi.

## 4. Postman sinovi

1. Cookie yubormasdan `GET /admin/members?page=1&limit=10`ga murojaat qiling. `401` kuting.
2. Oddiy member bilan login qiling. Ikkala admin marshrutida ham `403` kuting.
3. Test admin bilan kiring va `GET /admin/members?page=1&limit=10` yuboring. Ro‘yxatda kamida 11 ta user bo‘lsa, `page=2&limit=10` bilan keyingi sahifani tekshiring.
4. Ro‘yxatdagi test member ID’si bilan `POST /admin/members/status/:memberId`ga **Body → raw → JSON** orqali `{"memberStatus":"BLOCK"}` yuboring. `200` va yangilangan statusni tekshiring.
5. O‘sha memberning avvalgi cookie’si bilan `GET /member/info`ga murojaat qiling. `403` kuting. Sinov oxirida admin orqali `{"memberStatus":"ACTIVE"}` yuborib, member bilan qayta login qiling.

Bu bosqichda mavjud `express`, `mongoose`, `jsonwebtoken` va `cookie-parser` ishlatiladi.

## 5. Admin ruxsatini ishlatishdan oldingi tekshiruvlar

- Public signup’dagi `create(input)`ni ruxsat etilgan signup maydonlari bilan chaqirish kerak. Shunda rol va status uchun schema defaultlari ishlaydi. [Signup maydonlari](04-signup-maydonlari.md)
- `getMembers` aggregatsiyasiga `$project` qo‘shish kerak. Oddiy query’dagi `select: false` aggregation natijasini filtrlab bermaydi. Hozirgi pipeline parol hashini ham qaytarishi mumkin.
- 10 ta qat’iy limit bo‘lishi uchun server `limit = 10` ishlatishi kerak. Hozir `page` va `limit`ni yuborish talab etiladi. Standart `page = 1` va sonli parametr validatsiyasi qo‘shilsa, noto‘g‘ri sonlardan keladigan xatolar bartaraf bo‘ladi.
- Status endpointi uchun yaroqli ID va faqat `ACTIVE` yoki `BLOCK` qiymatlarini serverda tekshirish kerak. Hozirgi filter rolni tekshiradi. Status bo‘yicha tekshiruv alohida qo‘shiladi.

## 6. Keyingi qadam — xona yaratish

Xona turi karavot soniga bog‘liq. Bir, ikki yoki to‘rtta double karavot uchun `ONE_DOUBLE`, `TWO_DOUBLE` va `FOUR_DOUBLE` ishlatiladi. Xona statusi `AVAILABLE` yoki `SOLD`.

1. Admin `POST /admin/room` orqali xona yaratadi. Hozirgi uploader rasmlarni `uploads/room`ga yozadi. Yo‘llar `roomImages` massivida saqlanadi.
2. Admin `GET /admin/rooms` orqali ikkala statusdagi xonalarni ko‘radi.
3. `GET /rooms/:roomId` orqali foydalanuvchi va admin xona detail’i hamda rasm yo‘llarini oladi.

Birinchi API’ni qo‘lda yozish qadamlari [07. Xona yaratish](07-room-yaratish.md) faylida.
