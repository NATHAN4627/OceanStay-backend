# 12. Xona xaridi, xarid tarixi va favorites

Hozir `GET /room/all` xonalar ro‘yxatini, `GET /room/:id` esa xona tafsilotlarini beradi. Mehmon ham shu ikki API’ni ishlata oladi. `SOLD` xonaning tafsilotlari ochiladi, xarid esa faqat `AVAILABLE` xonalar uchun ishlaydi. Xarid va xarid tarixida `verifyAuth` faol sessiyani tekshiradi.

Bu bosqichda bitta xona bir marta sotiladi. Demo xarid tasdiqlanganda xona `AVAILABLE`dan `SOLD`ga o‘tadi va xaridorga tegishli `checkInDate` hamda `checkOutDate` `Order`ga yoziladi. Sana bo‘yicha xona bandligini hisoblash alohida bosqichga qoladi.

## Ma’lumot qayerda saqlanadi?

| Kolleksiya | Nima saqlanadi? |
| --- | --- |
| `rooms` | Xonaning hozirgi tafsilotlari, narxi va sotuv holati. |
| `orders` | `memberId`, `roomId`, `checkInDate`, `checkOutDate`, xarid narxi `amount`, xarid paytidagi `orderRoomInfo` va xarid vaqti. «Mening xaridlarim» shu kolleksiyani o‘qiydi. |

`history` uchun alohida yozuv ochishga hojat yo‘q. Har bir `Order` allaqachon yakunlangan xaridni bildiradi. Xona keyin tahrirlansa yoki bazadan o‘chirilsa ham, tarix `orderRoomInfo`dan xarid paytidagi nom, raqam va turni, `amount`dan o‘sha narxni ko‘rsatadi.

Favorites frontendda ishlaydi. Brauzer `localStorage`ida akkaunt bo‘yicha xona ID’lari saqlanadi. Favorites sahifasi mavjud `GET /room/:id` orqali xonalarning joriy ma’lumotlarini oladi. Batafsil [15. Favorites va frontendga ulash](15-favorites-qoshish-va-olib-tashlash.md).

## API’larni yozish tartibi

| Qadam | API | Vazifasi |
| --- | --- | --- |
| 12 | `Order` modeli | Type, schema va indekslarni tayyorlaymiz. |
| 13 | [`POST /order/room/:id`](13-xona-xaridi.md) | Login qilgan user uchun demo xaridni yakunlaymiz. |
| 14 | [`GET /orders`](14-xarid-tarixi.md) | O‘zining barcha xaridlarini yangisidan boshlab qaytaramiz. |

Xarid va tarix uchun egasini `verifyAuth` to‘ldirgan `req.member._id`dan olamiz. Xarid so‘rovida xona ID’si URL’dan, kelish va chiqish sanalari JSON body’dan keladi. Service narxni bazadagi `roomPrice`dan oladi.

Demo xaridda service `_id` va `roomStatus: AVAILABLE` bo‘yicha xonani `SOLD` qiladi, keyin `Order` yozadi. `AVAILABLE` sharti ikki parallel so‘rov bitta xonani yangilashiga yo‘l qo‘ymaydi. Bu variantda yozuvlar alohida bajariladi. Order yozishda xato chiqsa, xona `SOLD` bo‘lib qolishi va xarid tarixiga tushmasligi mumkin. [MongoDB yozuvlarining atomarligi](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)

Admin yangi xona yaratganda service uni `AVAILABLE` qilib ochadi. Admin update orqali status yozilmaydi. `SOLD`ga o‘tishni xarid service’i boshqaradi. Avvaldan `SOLD` bo‘lgan xona sotuvga chiqmaydi. Xarid tarixi yangi `Order` yozuvlari bilan boshlanadi.

13-qadamda Postman orqali yangi xona xaridi (`200`), qayta xarid (`409`), topilmagan xona (`404`) va sessiyasiz so‘rovni (`401`) tekshiramiz. 14-qadamda ikkinchi user birinchi userning xaridlarini ko‘rmasligini va admin xonani o‘chirgandan keyin ham xarid tarixda chiqishini sinaymiz.

## 1. `src/libs/types/order.ts`

```ts
import { ObjectId } from "mongoose";
import { RoomType } from "../enums/room.enum";

export interface OrderRoomInfo {
  roomNumber: string;
  roomName: string;
  roomType: RoomType;
}

export interface Order {
  _id: ObjectId;
  memberId: ObjectId;
  roomId: ObjectId;
  checkInDate?: string;
  checkOutDate?: string;
  amount: number;
  orderRoomInfo: OrderRoomInfo;
  createdAt: Date;
  updatedAt: Date;
}
```

`OrderRoomInfo` xarid paytida `Room`dan olinadigan uchta qiymatni ifodalaydi. `roomId` asl xonaning identifikatori, `memberId` xaridorniki. Bu type joriy `Member` va `Room` fayllaridagi `ObjectId` yozilishiga mos.

## 2. `src/schema/Order.model.ts`

```ts
import mongoose, { Schema } from "mongoose";
import { RoomType } from "../libs/enums/room.enum";
import { Order, OrderRoomInfo } from "../libs/types/order";

const orderRoomInfo = new Schema<OrderRoomInfo>({
  roomNumber: { type: String, required: true },
  roomName: { type: String, required: true },
  roomType: { type: String, enum: RoomType, required: true },
});

const orderSchema = new Schema<Order>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true,
    },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    amount: { type: Number, required: true, min: 0, validate: Number.isFinite },
    orderRoomInfo: { type: orderRoomInfo, required: true },
  },
  { timestamps: true },
);

orderSchema.index({ memberId: 1, createdAt: -1, _id: -1 });

export default mongoose.model("Order", orderSchema);
```

- `ref: "Member"` va `ref: "Room"` ID’lar qaysi modellarga tegishli ekanini belgilaydi.
- `orderRoomInfo` shu order ichidagi subdocument sifatida saqlanadi.
- `checkInDate` va `checkOutDate` yangi order uchun majburiy. TypeScript’dagi `?` eski orderlarni ham o‘qiy olish uchun bor.
- `amount` majburiy va `min: 0`. Har bir orderga bazadagi xona narxini yozamiz.
- `roomId`dagi `unique: true` bir xona uchun ko‘pi bilan bitta order yozilishini bazada kafolatlaydigan indeksni belgilaydi. Xarid API’sini sinashdan oldin indeks bazada yaratilganini tekshiramiz. [MongoDB unique indekslari](https://www.mongodb.com/docs/manual/core/index-unique/)
- `timestamps: true` `createdAt` va `updatedAt`ni avtomatik qo‘shadi. Oxirgi indeks userning xaridlarini yangi sanadan eski sanaga saralashga mos. Bir xil sanada `_id` tartibni barqaror qiladi.

## 3. Tekshirish

Ikki faylni yozganingizdan keyin TypeScript’ni tekshiring.

```bash
npx tsc --noEmit
```

Bu qadamda mavjud `mongoose` va TypeScript yetarli. Keyingi qadam [13. Xona xaridi](13-xona-xaridi.md).
