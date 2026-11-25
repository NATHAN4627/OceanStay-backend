# 10. Admin orqali xona ma’lumotlarini yangilash

`POST /admin/room/update/:id` admin uchun. JSON body orqali xona raqami, nomi, tavsifi, turi, sig‘imi, narxi yoki statusi yangilanadi. Masalan, faqat `roomPrice` yuborilsa, service aynan narxni yozadi. Rasm yo‘llari xonani yaratish paytida saqlanadi.

## 1. Router

`src/router.ts`dagi update route’dan `uploader(...).array(...)` qatorini olib tashlang. Natija shunday bo‘ladi.

```ts
router.post(
  "/admin/room/update/:id",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.updateRoom,
);
```

Create route birinchi rasmlarni yuklash uchun Multer’dan foydalanadi. Update route esa `express.json()` orqali body oladi.

## 2. Controller

`src/controller/room.controller.ts`dagi `updateRoom` ichida rasmga tegishli `req.files` blokini olib tashlang. Mavjud `try` ichidagi asosiy qism shunday bo‘ladi.

```ts
const { id } = req.params;
const input = req.body ?? {};
const result = await roomService.updateRoom(id as string, input);

res.status(HttpCode.OK).json(result);
```

## 3. Type va service

`src/libs/types/room.ts`dagi `RoomUpdateInput`dan `roomImages?: string[];` qatorini olib tashlang. `RoomInput` create uchun rasm yo‘llarini oladi.

`src/models/Room.service.ts`dagi `updateRoom()` ichida `$set`ga faqat shu maydonlar uzatiladi.

```ts
$set: {
  roomNumber: input.roomNumber,
  roomName: input.roomName,
  roomDesc: input.roomDesc,
  roomType: input.roomType,
  roomMaxGuests: input.roomMaxGuests,
  roomPrice: input.roomPrice,
  roomStatus: input.roomStatus,
},
```

Service qaysi maydonlar yozilishini shu obyekt bilan belgilaydi. Mongoose `undefined` qiymatlarni update’dan chiqaradi. `new: true` yangilangan hujjatni qaytaradi. Joriy service xatoni `304` sifatida qaytarsa, HTTP qoidasi bo‘yicha javob body’si bo‘sh keladi. [HTTP 304](https://www.rfc-editor.org/rfc/rfc9110.html#name-304-not-modified)

## 4. Postman

Admin bilan login qiling. `POST /admin/room/update/:id`ga **Body → raw → JSON** orqali `{"roomPrice":180000}` yuboring. `200` javobida yangi narxni va oldingi `roomImages`ni tekshiring.

Bu bosqichda mavjud `express` va `mongoose` ishlatiladi. Keyingi API [11. Admin orqali xonani o‘chirish](11-room-ochirish.md).
