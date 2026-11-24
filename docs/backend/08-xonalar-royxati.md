# 08. Xonalar ro‘yxati

`GET /room/all` umumiy marshrut. Mehmon, oddiy member va admin undan foydalanishi mumkin. Javob xona hujjatlari massivi bo‘lib, `roomPrice` va `roomImages`ni ham o‘z ichiga oladi.

```ts
router.get("/room/all", roomController.getRooms);
```

## 1. Query maydonlari

Controller `req.query`dan qiymatlarni olib, `RoomInquery`ga uzatadi.

| Parametr | Hozirgi vazifasi |
| --- | --- |
| `page` | Sahifa raqami. Controller `Number(page)` qiladi. |
| `limit` | Bir sahifadagi xona soni. Controller `Number(limit)` qiladi. |
| `order` | Saralash maydoni. `roomPrice` va `roomNumber` o‘sish, boshqa yuborilgan maydon kamayish tartibida saralanadi. |
| `roomType` | Ixtiyoriy. Masalan, `TWO_DOUBLE` turini tanlaydi. |
| `search` | Ixtiyoriy. Hozir `roomType` bo‘yicha katta-kichik harflarga bog‘liq bo‘lmagan regex qidiruvi. |

`page`, `limit` va `order` uchun joriy controller standart qiymat bermaydi. Postman so‘rovlarida ularni yozing.

## 2. Service’dagi aggregation

`RoomService.getRooms()` `$match → $sort → $skip → $limit` tartibida ishlaydi.

```ts
const match: T = {};

if (inquery.roomType) match.roomType = inquery.roomType;

if (inquery.search)
  match.roomType = { $regex: new RegExp(inquery.search, "i") };

const sort: T =
  inquery.order === "roomPrice" || inquery.order === "roomNumber"
    ? { [inquery.order]: 1 }
    : { [inquery.order]: -1 };

const result = await this.roomModel
  .aggregate([
    { $match: match },
    { $sort: sort },
    { $skip: (inquery.page * 1 - 1) * inquery.limit },
    { $limit: inquery.limit },
  ])
  .exec();
```

Ro‘yxat `roomStatus` bo‘yicha filtr qo‘ymaydi, shuning uchun `AVAILABLE` va `SOLD` xonalar chiqishi mumkin. `roomType` va `search` birga yuborilsa, keyingi `search` sharti oldingi `roomType` shartini almashtiradi. `page=2&limit=10`da birinchi 10 ta natija o‘tkazib yuboriladi.

## 3. Postman

Cookie yubormasdan quyidagi so‘rovlarni tekshiring.

- `GET /room/all?page=1&limit=10&order=createdAt` eng yangi xonalardan boshlaydi.
- `GET /room/all?page=1&limit=10&order=roomPrice&roomType=TWO_DOUBLE` shu turdagi xonalarni arzonidan qimmatiga qarab qaytaradi.
- `GET /room/all?page=1&limit=10&order=createdAt&search=DOUBLE` turi ichida `DOUBLE` bor xonalarni oladi.

Javob `200` va massiv. Bu qadamda mavjud `express` va `mongoose` ishlatiladi. Keyingi qadam [09. Xona tafsilotlari](09-xona-tafsilotlari.md).
