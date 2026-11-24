# 07. Xona yaratish

Bitta `Room` hujjati bitta jismoniy xonani bildiradi. Tur double karavotlar soniga qarab tanlanadi. `maxGuests` xona sig‘imini bildiradi.

| Ko‘rinadigan nom | API qiymati |
| --- | --- |
| 1 Double | `ONE_DOUBLE` |
| 2 Double | `TWO_DOUBLE` |
| 4 Double | `FOUR_DOUBLE` |

Yangi xona odatda `AVAILABLE` bo‘ladi. Admin kerak bo‘lsa `SOLD` ham yubora oladi. Bu xonaning umumiy statusi. Sana bo‘yicha bandlik bronlash bosqichida hisoblanadi.

| Navbat | API | Kirish |
| --- | --- | --- |
| 1 | `POST /admin/rooms` | Admin xona yaratadi. |
| 2 | `GET /admin/rooms` | Admin `AVAILABLE` va `SOLD` xonalarni ko‘radi. |
| 3 | `GET /rooms/:roomId` | Foydalanuvchi va admin xona detail’i hamda rasmlarini ko‘radi. |

Bu dars birinchi API uchun. Bir create so‘roviga 1–4 ta JPEG yoki PNG rasm, har biriga 2 MiB gacha qabul qilamiz. Rasmlar `uploads/rooms`ga yoziladi. `images` massivida nisbiy yo‘llar saqlanadi va keyingi GET javoblarida qaytadi. Detail bosqichida brauzer shu yo‘llardan faylni olishi uchun static route’ni ulaymiz.

## 1. Enum va TypeScript tiplari

`src/libs/enums/room.enum.ts` faylini yarating.

```ts
export enum RoomType {
  ONE_DOUBLE = "ONE_DOUBLE",
  TWO_DOUBLE = "TWO_DOUBLE",
  FOUR_DOUBLE = "FOUR_DOUBLE",
}

export enum RoomStatus {
  AVAILABLE = "AVAILABLE",
  SOLD = "SOLD",
}
```

`src/libs/types/room.ts` faylini yarating.

```ts
import type { Types } from "mongoose";
import type { RoomStatus, RoomType } from "../enums/room.enum";

export interface RoomInput {
  roomNumber: string;
  name: string;
  description?: string;
  type: RoomType;
  maxGuests: number;
  nightlyRate: number;
  status?: RoomStatus;
  images: string[];
}

export interface Room extends RoomInput {
  _id: Types.ObjectId;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

## 2. Xona modeli

`src/schema/Room.model.ts` faylini yarating.

```ts
import mongoose, { Schema } from "mongoose";
import { RoomStatus, RoomType } from "../libs/enums/room.enum";
import type { Room } from "../libs/types/room";

const roomSchema = new Schema<Room>(
  {
    roomNumber: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, required: true, enum: Object.values(RoomType) },
    maxGuests: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    nightlyRate: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    status: {
      type: String,
      required: true,
      enum: Object.values(RoomStatus),
      default: RoomStatus.AVAILABLE,
    },
    images: {
      type: [String],
      validate: {
        validator: (images: string[]) => images.length >= 1 && images.length <= 4,
        message: "Provide between 1 and 4 room images.",
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Room", roomSchema);
```

`roomNumber` uchun unique indeks bir raqamli ikkita xona yozilishiga yo‘l qo‘ymaydi. `maxGuests` va `nightlyRate` musbat butun son. `nightlyRate` bir kechaning tarifini eng kichik valyuta birligida bildiradi. [Mongoose validatorlari va unique indeks](https://mongoosejs.com/docs/validation.html#the-unique-option-is-not-a-validator)

## 3. Uploader va service

Mavjud `src/libs/uploads.ts`da `makeUploader` imzosiga `maxFiles = 1` qo‘shing va `limits`dagi `files`ni shu parametrdan oling. Qolgan storage va filter kodini ishlating.

```ts
const makeUploader = (address: string, maxFiles = 1) => {
```

```ts
limits: { files: maxFiles, fileSize: 2 * 1024 * 1024 },
```

Member avatari bitta fayl oladi. Xona route’i `.array("images", 4)` orqali bir xil key ostida to‘rttagacha fayl oladi. Multer bu fayllarni `req.files`ga yozadi. Hozirgi filter fayl kengaytmasi va yuborilgan MIME turini solishtiradi. [Multer array middleware’i](https://expressjs.com/en/resources/middleware/multer/#arrayfieldname-maxcount)

`src/models/Room.service.ts` faylini yarating.

```ts
import type { RoomInput } from "../libs/types/room";
import RoomModel from "../schema/Room.model";

class RoomService {
  public async createRoom(input: RoomInput) {
    await RoomModel.init();
    return RoomModel.create(input);
  }
}

export default RoomService;
```

`init()` lokal serverda unique indeks tayyor bo‘lishini kutadi. `create()` xona maydonlarini schema bo‘yicha tekshiradi va saqlaydi.

## 4. Controller va route

`src/controller/room.controller.ts` faylini yarating. Controller multipart matn maydonlaridan input yig‘adi. Rasm yo‘llari serverdagi fayl nomlaridan olinadi.

```ts
import type { NextFunction, Request, Response } from "express";
import { unlink } from "node:fs/promises";
import mongoose from "mongoose";
import { MulterError } from "multer";
import Errors, { HttpCode } from "../libs/Errors";
import type { RoomInput } from "../libs/types/room";
import RoomService from "../models/Room.service";

const roomService = new RoomService();

const roomController = {
  async createRoom(req: Request, res: Response, next: NextFunction) {
    const files = Array.isArray(req.files) ? req.files : [];
    const { roomNumber, name, description, type, maxGuests, nightlyRate, status } =
      req.body ?? {};

    try {
      const input: RoomInput = {
        roomNumber,
        name,
        description,
        type,
        maxGuests: Number(maxGuests),
        nightlyRate: Number(nightlyRate),
        status,
        images: files.map((file) => `uploads/rooms/${file.filename}`),
      };

      const room = await roomService.createRoom(input);
      res.status(HttpCode.CREATED).json({ room });
    } catch (err) {
      const duplicate = err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
      if (!duplicate && !(err instanceof mongoose.Error.ValidationError)) {
        next(err);
        return;
      }

      await Promise.all(files.map((file) => unlink(file.path).catch(console.error)));
      const code = duplicate ? HttpCode.CONFLICT : HttpCode.BAD_REQUEST;
      const message = duplicate ? "Room number already exists." : "Invalid room data or images.";
      res.status(code).json({ code, message });
    }
  },

  handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
    if (err instanceof Errors) {
      res.status(err.code).json({ code: err.code, message: err.message });
    } else if (err instanceof MulterError) {
      const code = err.code === "LIMIT_FILE_SIZE" ? HttpCode.PAYLOAD_TOO_LARGE : HttpCode.BAD_REQUEST;
      res.status(code).json({ code, message: err.message });
    } else {
      next(err);
    }
  },
};

export default roomController;
```

Admin route’ni ulashdan oldin [signup maydonlari](04-signup-maydonlari.md) qo‘llanmasidagi `create(input)` tuzatishini qo‘llang. Hozirgi public signup’da rol body’dan modelga yetib boradi. Admin ruxsati server tayinlagan rolga tayanishi uchun signup’da shu maydonlar ajratiladi. Test admin bilan [06-bosqich](06-admin-va-memberlar.md)dagi `verifyAuth → verifyAdmin` ketma-ketligini ishlating.

`src/router.ts`ga `import roomController from "./controller/room.controller";` qo‘shing. `export default router`dan oldin yozing.

```ts
router.post(
  "/admin/rooms",
  memberController.verifyAuth,
  adminController.verifyAdmin,
  uploader("rooms", 4).array("images", 4),
  roomController.createRoom,
  roomController.handleUploadError,
);
```

Middleware avval sessiya va rolni tekshiradi. Admin ruxsati tasdiqlangach, Multer fayllarni yozadi. O‘sha so‘rovdagi rasmlar create ma’lumotlari yaroqsiz yoki xona raqami band bo‘lsa, controller tomonidan tozalanadi.

## 5. Postman’da create sinovi

Admin bilan `POST /login` qiling va `POST /admin/rooms` so‘roviga **Body → form-data** orqali yuboring.

| Key | Tur | Misol |
| --- | --- | --- |
| `roomNumber` | Text | `201` |
| `name` | Text | `Ocean View Room` |
| `description` | Text | `Dengiz tomonga qaragan xona` |
| `type` | Text | `TWO_DOUBLE` |
| `maxGuests` | Text | `4` |
| `nightlyRate` | Text | `150000` |
| `images` | File | Har bir rasm uchun bir xil `images` key’ini ishlating. |

`201` javobida `room._id`, `AVAILABLE` va `uploads/rooms/...` bilan boshlanadigan `images` yo‘llari keladi. Alohida xona uchun `status=SOLD` yuborib shu status saqlanishini tekshiring. Bitta raqamni takror yuborsangiz `409`, rasm yubormasangiz yoki beshta yuborsangiz `400`, oddiy user cookie’si bilan `403` kuting.

Paketlar joriy loyihadan olinadi. `express` route va middleware, `mongoose` schema va MongoDB, `multer` hamda `@types/multer` multipart va tiplar, `uuid` rasm nomlari uchun ishlatiladi.
