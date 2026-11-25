# 12. Xona xaridi, xarid tarixi va favorites

Hozir `GET /room/all` xonalar ro‘yxatini, `GET /room/:id` esa xona tafsilotlarini beradi. Mehmon ham shu ikki API’ni ishlata oladi. `SOLD` xonaning tafsilotlari ochiladi, xarid esa faqat `AVAILABLE` xonalar uchun ishlaydi. Yangi shaxsiy API’larda `verifyAuth` orqali faol sessiyani, undan keyin `USER` rolini tekshiramiz.

Bu bosqichda bitta xona bir marta sotiladi. Demo xarid tasdiqlanganda xona `AVAILABLE`dan `SOLD`ga o‘tadi. Arxitektura hujjatidagi sanali hotel bronida xaridor xonani ma’lum kunlarga band qiladi. Agar keyin sanali bronga o‘tsak, mavjudlikni `checkIn` va `checkOut` orasidagi kunlar bo‘yicha hisoblaymiz.

## Ma’lumot qayerda saqlanadi?

| Kolleksiya | Nima saqlanadi? |
| --- | --- |
| `rooms` | Xonaning hozirgi tafsilotlari, narxi va sotuv holati. |
| `orders` | `memberId`, `roomId`, xarid narxi `amount`, xarid paytidagi `roomSnapshot` va sana. «Mening xaridlarim» shu kolleksiyani o‘qiydi. |
| `favorites` | `memberId`, `roomId` va saqlangan sana. Har bir userning shaxsiy ro‘yxati. |

`history` uchun alohida yozuv ochishga hojat yo‘q. Har bir `Order` allaqachon yakunlangan xaridni bildiradi. Xona keyin tahrirlansa yoki bazadan o‘chirilsa ham, tarix `roomSnapshot`dan xarid paytidagi nom, raqam va turni, `amount`dan o‘sha narxni ko‘rsatadi.

Favorites uchun alohida kolleksiya qulay. Bitta xona bir nechta userda saqlanishi mumkin, har bir user esa ko‘p xonani saqlashi mumkin. `{ memberId: 1, roomId: 1 }` unique indeksi bir user bitta xonani takroran saqlashining oldini oladi. Ro‘yxat xonaning joriy ma’lumotlarini ko‘rsatadi. Sotilgan xona `SOLD` bo‘lib ko‘rinadi. Bazadan o‘chirilgan xona ro‘yxatda chiqmaydi. [MongoDB unique indekslari](https://www.mongodb.com/docs/manual/core/index-unique/)

## API’larni yozish tartibi

| Qadam | API | Vazifasi |
| --- | --- | --- |
| 12 | `Order` modeli | Type, schema va indekslarni tayyorlaymiz. |
| 13 | `POST /orders/room/:roomId` | Login qilgan user uchun demo xaridni yakunlaymiz. |
| 14 | `GET /orders/my?page=1` | O‘z xaridlarini yangisidan boshlab 10 tadan qaytaramiz. |
| 15 | `POST /favorites/add/:roomId` | Xonani saqlaymiz. Ikkinchi bosishda ham bitta yozuv qoladi. |
| 15 | `POST /favorites/remove/:roomId` | Userning o‘z ro‘yxatidan xonani olib tashlaymiz. |
| 16 | `GET /favorites/my?page=1` | Mavjud xonalarni oxirgi saqlanganidan boshlab 10 tadan qaytaramiz. |

Xarid, history va favorites uchun egasini `verifyAuth` to‘ldirgan `req.member._id`dan olamiz. Xarid so‘rovida Postman URL orqali `roomId`ni yuboradi. Service narxni bazadagi `roomPrice`dan oladi. Narxi yozilmagan, manfiy yoki yaroqsiz eski xona xarid qilinmaydi.

Xaridda service bitta MongoDB transaction ichida `_id` va `roomStatus: AVAILABLE` bo‘yicha xonani `SOLD` qiladi, keyin shu xona bilan `Order` yozadi. Ikkala yozuv birga tasdiqlanadi. `Order` yozilmasa, xona statusining o‘zgarishi ham bekor bo‘ladi. Parallel xaridda bitta so‘rov `201`, ikkinchisi `409` oladi. Bu API’ni sinash uchun MongoDB replica set yoki sharded cluster kerak. [Mongoose transactions](https://mongoosejs.com/docs/transactions.html), [MongoDB transaction talablari](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)

Admin `createRoom` va `updateRoom` orqali `roomStatus`ni ham yubora oladi. Xarid API’sini qo‘shganda yangi xonani schema `AVAILABLE` qilib ochadi va `SOLD`ga o‘tishni xarid service’i boshqaradi. Shu bilan xarid qilingan xonani admin update orqali tasodifan qayta sotuvga qo‘ymaydi. Avvaldan `SOLD` bo‘lgan xona sotuvga chiqmaydi. Xarid tarixi yangi `Order` yozuvlari bilan boshlanadi.

13-qadamda Postman orqali yangi xona xaridi (`201`), qayta xarid (`409`), topilmagan xona (`404`), yaroqsiz ID (`400`) va sessiyasiz so‘rovni (`401`) tekshiramiz. 14-qadamda ikkinchi user birinchi userning xaridlarini ko‘rmasligini va admin xonani o‘chirgandan keyin ham xarid tarixda chiqishini sinaymiz.

## 1. `src/libs/types/order.ts`

```ts
import type { Types } from "mongoose";
import type { RoomType } from "../enums/room.enum";

export interface OrderRoomSnapshot {
  roomNumber: string;
  roomName: string;
  roomType: RoomType;
}

export interface Order {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  roomId: Types.ObjectId;
  amount: number;
  roomSnapshot: OrderRoomSnapshot;
  createdAt: Date;
  updatedAt: Date;
}
```

`OrderRoomSnapshot` xarid paytida `Room`dan olinadigan uchta qiymatni ifodalaydi. `roomId` asl xonaning identifikatori, `memberId` xaridorniki. `Types.ObjectId` bu MongoDB hujjatidagi ID’ning TypeScript turi.

## 2. `src/schema/Order.model.ts`

```ts
import mongoose, { Schema } from "mongoose";
import { RoomType } from "../libs/enums/room.enum";
import type { Order, OrderRoomSnapshot } from "../libs/types/order";

const roomSnapshotSchema = new Schema<OrderRoomSnapshot>(
  {
    roomNumber: { type: String, required: true },
    roomName: { type: String, required: true },
    roomType: { type: String, enum: RoomType, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true,
    },
    amount: { type: Number, required: true, min: 0, validate: Number.isFinite },
    roomSnapshot: { type: roomSnapshotSchema, required: true },
  },
  { timestamps: true },
);

orderSchema.index({ memberId: 1, createdAt: -1, _id: -1 });

export default mongoose.model("Order", orderSchema);
```

- `ref: "Member"` va `ref: "Room"` ID’lar qaysi modellarga tegishli ekanini belgilaydi.
- `roomSnapshot` shu order ichida saqlanadi. `{ _id: false }` unga alohida ID berilishini o‘chiradi.
- `roomId`dagi `unique: true` bir xona uchun ko‘pi bilan bitta order yozilishini bazada kafolatlaydigan indeksni belgilaydi. Xarid API’sini sinashdan oldin indeks bazada yaratilganini tekshiramiz. [MongoDB unique indekslari](https://www.mongodb.com/docs/manual/core/index-unique/)
- `timestamps: true` `createdAt` va `updatedAt`ni avtomatik qo‘shadi. Oxirgi indeks userning xaridlarini yangi sanadan eski sanaga saralashga mos. Bir xil sanada `_id` tartibni barqaror qiladi.

## 3. Tekshirish

Ikki faylni yozganingizdan keyin TypeScript’ni tekshiring.

```bash
npx tsc --noEmit
```

Bu qadamda mavjud `mongoose` va TypeScript yetarli. Birinchi Postman so‘rovini keyingi qadamda `Order.service.ts`, controller va `POST /orders/room/:roomId` router’ini yozgandan keyin yuboramiz.
