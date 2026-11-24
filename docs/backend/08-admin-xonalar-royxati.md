# 08. Admin uchun xonalar ro‘yxati

`GET /admin/rooms` admin uchun `AVAILABLE` va `SOLD` statusidagi xonalarni sahifalab qaytaradi. Javobda joriy schema maydonlari, jumladan `roomType`, `roomStatus` va `roomImages` bor. Bu bosqichda ro‘yxatni yozamiz. ID bo‘yicha detail keyingi bosqich.

## 1. Query tipi

`src/libs/types/room.ts`ga member ro‘yxatidagi `MemberQuery`ga o‘xshash tip qo‘shing.

```ts
export interface RoomQuery {
  page: number;
  limit: number;
}
```

## 2. `RoomService.getRooms`

`src/models/Room.service.ts`dagi importga `RoomQuery`ni qo‘shing. Klass ichida `createRoom()`dan keyin yozing.

```ts
  public async getRooms(inquery: RoomQuery): Promise<Room[]> {
    const { page, limit } = inquery;

    return this.roomModel
      .find({})
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
  }
```

`find({})` status bo‘yicha filtr qo‘ymaydi. Eng yangi xonalar oldinda turadi. Bir xil `createdAt` bo‘lsa, `_id` tartibni belgilaydi. `skip` oldingi sahifadagi natijalarni o‘tkazib yuboradi.

## 3. Controller

`src/controller/room.controller.ts`ning mavjud importlariga `RoomQuery`ni qo‘shing. `export default roomController`dan oldin yozing.

```ts
roomController.getRooms = async (req: Request, res: Response) => {
  try {
    const rawPage = req.query.page ?? "1";
    const page = typeof rawPage === "string" ? Number(rawPage) : NaN;
    const limit = 10;

    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(page * limit)) {
      res.status(HttpCode.BAD_REQUEST).json({
        code: HttpCode.BAD_REQUEST,
        message: "page must be a positive integer.",
      });
      return;
    }

    const inquery: RoomQuery = { page, limit };
    const result = await roomService.getRooms(inquery);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) {
      res.status(err.code).json({ code: err.code, message: err.message });
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
  }
};
```

`page` berilmasa 1 olinadi. Har bir sahifada ko‘pi bilan 10 ta xona chiqadi.

## 4. Router

`src/router.ts`da mavjud room route yoniga qo‘shing.

```ts
router.get(
  "/admin/rooms",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  roomController.getRooms,
);
```

Admin ruxsati server tayinlagan rolga tayanadi. Public signup uchun ruxsat etilgan maydonlarni tanlash qadami [04-qo‘llanmada](04-signup-maydonlari.md) bor.

## 5. Postman

1. Admin telefon va parol bilan `POST /login` orqali kirsin.
2. `GET /admin/rooms?page=1` yuboring. `200` va massiv kuting. Bazada ikkala status bo‘lsa, ro‘yxatda ularning ikkalasini ko‘ring.
3. Kamida 11 ta xona bo‘lsa, `page=2` yuboring. Birinchi sahifadagi 10 tadan keyingi xonalar chiqadi.
4. `page=0` uchun `400`, cookie bo‘lmasa `401`, oddiy user cookie’si bilan `403` kuting.

Bu qadamda mavjud `express` va `mongoose` ishlatiladi.
