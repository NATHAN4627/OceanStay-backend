# 07. Xona yaratish

Bu bosqich `POST /admin/room/create` orqali xona yaratish uchun. Router sessiya va admin rolini tekshiradi, keyin Multer bir xil `roomImages` key’i ostida yuborilgan rasmlarni oladi. Joriy router har so‘rovda to‘rttagacha rasm qabul qiladi.

| Xona turi | API qiymati |
| --- | --- |
| 1 Double | `ONE_DOUBLE` |
| 2 Double | `TWO_DOUBLE` |
| 4 Double | `FOUR_DOUBLE` |

Xona statusi `AVAILABLE` yoki `SOLD`. `roomStatus` yuborilmasa, schema `AVAILABLE` qo‘yadi.

## 1. Hozirgi Postman so‘rovi

Admin bilan `POST /login` qiling. O‘sha cookie bilan **`POST /admin/room/create`** va **Body → form-data**ni tanlang.

| Key | Tur | Misol |
| --- | --- | --- |
| `roomNumber` | Text | `201`. Har xona uchun unique. |
| `roomName` | Text | `Ocean View Room`. Majburiy. |
| `roomMaxGuests` | Text | `4`. Majburiy, kamida 2. |
| `roomPrice` | Text | `150000`. Majburiy son. |
| `roomDesc` | Text | `Dengiz tomonga qaragan xona`. Ixtiyoriy. |
| `roomType` | Text | `TWO_DOUBLE`. |
| `roomStatus` | Text | `AVAILABLE` yoki `SOLD`. |
| `roomImages` | File | Har bir fayl uchun aynan `roomImages` key’ini ishlating. |

Joriy maydon nomlari `roomName`, `roomMaxGuests` va `roomPrice`. Mongoose multipartdagi `"4"` va `"150000"` qiymatlarini songa aylantirib saqlaydi. `roomPrice` turi `RoomInput`da `number`, schema’da `Number`. Bu maydon qo‘shilishidan oldin yaratilgan xonalarga narxni alohida kiritish kerak bo‘lishi mumkin.

## 2. `roomType`ni schema’da saqlash

`RoomInput` va `src/schema/Room.model.ts` ichida `roomType` bor. Schema qiymatni `RoomType` enum’i bilan tekshiradi.

```ts
roomType: {
  type: String,
  required: true,
  enum: RoomType,
},
```

## 3. Yuklangan rasm yo‘llarini saqlash

Router va Postman `roomImages` key’idan foydalanadi. Joriy uploader qatori:

```ts
uploader("room").array("roomImages", 4),
```

`.array()` fayllarni `req.files`ga beradi. Beshinchi fayl yuborilsa, joriy `4` chegarasi sababli `LIMIT_UNEXPECTED_FILE` chiqadi. Oldingi cheklovsiz variantni ishlatmoqchi bo‘lsangiz, shu qatorni `uploader("room").array("roomImages")` deb yozing.

Controller fayl nomlaridan `uploads/room` yo‘lini yasab, `roomImages` sifatida service’ga uzatadi.

```ts
const input: RoomInput = req.body;

if (Array.isArray(req.files)) {
  input.roomImages = req.files.map((file) => `uploads/room/${file.filename}`);
}

const result = await roomService.createRoom(input);
```

`input` body’dagi `roomPrice` va qo‘shilgan rasm yo‘llarini service’ga olib o‘tadi. Yuklangan rasmlar soni bilan javobdagi `roomImages.length` bir xil bo‘ladi.

## 4. Create’ni yakuniy tekshirish

- `404 Cannot POST /admin/room` kelsa, URL’ga `/create` qo‘shing.
- `400 Create is failed!` kelsa, terminalda `Error: model:createRoom`dan keyingi asl xabarga qarang. `ValidationError`da xato maydon nomi ko‘rinadi. `E11000` bo‘lsa, ishlatilmagan `roomNumber` tanlang.
- `Unexpected field` kelsa, Postman’dagi fayl key’i va routerdagi `.array()` argumenti ikkalasi ham `roomImages` ekanini tekshiring.
- `201` javobida `roomName`, `roomType`, `roomMaxGuests`, `roomPrice`, `roomStatus` va `roomImages`ni tekshiring. Narx yuborilmasa yoki songa aylantirib bo‘lmasa, create `400` qaytaradi.

Paketlar avvalgidek `express`, `mongoose`, `multer`, `@types/multer` va `uuid`. Keyingi bosqich [08. Xonalar ro‘yxati](08-xonalar-royxati.md).
