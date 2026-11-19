# 01. Authentication va Multer

Bu qo‘llanma OceanStay backendini qo‘lda yozib, har bir qadamni Postman’da tekshirish uchun. Hozirgi MVC tuzilishida `router.ts` marshrutlarni ulaydi, `controller/` HTTP so‘rov va javob bilan ishlaydi, `models/` service’larni, `schema/` Mongoose modelini, `libs/` umumiy sozlamalar, turlar va middleware’larni saqlaydi.

## Hozirgi kod

| Endpoint | Oqim |
| --- | --- |
| `POST /signup` | `MemberService` parolni hash qiladi va member yaratadi. Controller JWT yaratib, `accessToken` cookie’ni o‘rnatadi. |
| `POST /login` | `MemberService` nickname va parolni tekshiradi. Controller JWT va `accessToken` cookie’ni qaytaradi. |
| `POST /logout` | `verifyAuth` cookie’dagi JWT’ni tekshiradi. Logout controller cookie’ni tugatadi. |

`app.ts` router’ni `/` ostida ulaydi. Arxitektura faylidagi `/api/member/…` nomlari loyiha rejasi sifatida qoladi. Postman’da hozir `http://localhost:3333` ishlatiladi. `PORT` sozlangan bo‘lsa, o‘sha portni yozing.

| Paket | Holati va vazifasi |
| --- | --- |
| `express` | Mavjud. Router, middleware va HTTP javoblar. |
| `mongoose` | Mavjud. Member schema va MongoDB so‘rovlari. |
| `bcryptjs` | Mavjud. Parolni hash qilish va login paytida solishtirish. |
| `jsonwebtoken` | Mavjud. JWT yaratish, imzo va muddatni tekshirish. |
| `cookie-parser` | Mavjud. `accessToken` cookie’ni `req.cookies` orqali o‘qish. |
| `dotenv` | Mavjud. `MONGO_URL`, `SECRET_TOKEN` va `PORT` kabi muhit sozlamalarini yuklash. |
| `multer` | `2.5.0` o‘rnatilgan. `multipart/form-data` ichidagi faylni o‘qiydi. |
| `@types/multer` | `2.3.0` dev dependency sifatida o‘rnatilgan. Express `Request` tipiga `req.file`ni qo‘shadi. |

## Birinchi mashq — faylni qabul qilish

Bu xotiraga yuklashni tushuntirgan dastlabki mashq. Loyihada `src/libs/uploads.ts` orqali diskka yozadigan `makeUploader` tanlandi. Davomi [Profil va rasm yuklash](02-profil-va-rasm-yuklash.md) hujjatida.

`POST /member/me/avatar/check` vaqtinchalik Postman marshruti. `memberImage` nomli bitta fayl yuboramiz. Multer faylni xotiraga o‘qiydi va controller uning hajmi hamda forma orqali kelgan MIME turini qaytaradi. MongoDB va diskka rasm yozish keyingi bosqichga tegishli.

`Cookie → verifyAuth → uploadMemberImage → checkMemberImage`

### 1. Paketlarni o‘rnating

```bash
npm install multer
npm install -D @types/multer
```

### 2. `src/libs/upload.ts` faylini yarating

```ts
import type { RequestHandler } from "express";
import multer from "multer";

const parseMemberImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
}).single("memberImage");

export const uploadMemberImage: RequestHandler = (req, res, next) => {
  parseMemberImage(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const code = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      res.status(code).json({ code, message: error.message });
      return;
    }

    next(error);
  });
};
```

`.single("memberImage")` fayl maydoni nomini belgilaydi va faylni `req.file`ga joylaydi. `fileSize` baytlarda beriladi. `fields: 0` bu mashqda forma ichida alohida matn maydonlarini cheklaydi. Multer muvaffaqiyatli tugaganda `next(error)`ga `undefined` keladi va controller ishga tushadi. [Express Multer qo‘llanmasi](https://expressjs.com/en/resources/middleware/multer/)

### 3. Controller va routerni ulang

`src/controller/member.controller.ts` faylida, `export default memberController` qatoridan oldin yozing.

```ts
memberController.checkMemberImage = (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ code: 400, message: "memberImage faylini yuboring." });
    return;
  }

  const { size, mimetype } = req.file;
  res.json({ size, mimetype });
};
```

`src/router.ts` tepasiga importni qo‘shing.

```ts
import { uploadMemberImage } from "./libs/upload";
```

`export default router` qatoridan oldin marshrutni yozing.

```ts
router.post(
  "/member/me/avatar/check",
  memberController.verifyAuth,
  uploadMemberImage,
  memberController.checkMemberImage,
);
```

Marshrut nomini o‘zgartirsangiz, Postman URL’ini ham moslang. Multipart maydoni nomi Postman’dagi **Key** va `.single()` ichida bir xil bo‘lsin. `mimetype` mijozdan keladi. Rasmni saqlash bosqichida haqiqiy format fayl mazmunidan tekshiriladi.

### 4. Postman’da tekshiring

1. `npx tsc --noEmit` bilan tiplarni tekshiring. Serverni `npm run start:dev` orqali ishga tushiring.
2. `POST http://localhost:3333/login` ga **Body → raw → JSON** orqali test akkauntingizning `memberNick` va `memberPassword` maydonlarini yuboring. Kerak bo‘lsa, avval `POST /signup` orqali `memberNick`, `memberPhone` va `memberPassword` bilan test akkaunt oching. Login javobidan keyin Postman cookie jar’da `accessToken`ni ko‘ring. Ikkala so‘rov uchun ham bir xil host ishlating.
3. `POST http://localhost:3333/member/me/avatar/check` da **Body → form-data** tanlang. **Key** ustunida `memberImage` yozing, turini **File**ga o‘zgartiring va 2 MiB dan kichik rasm tanlang. `Content-Type` va multipart boundary qiymatini Postman so‘rovga o‘zi qo‘shadi. [Postman form-data](https://learning.postman.com/docs/use/send-requests/create-requests/parameters) · [Postman cookie jar](https://learning.postman.com/v11/docs/use/send-requests/response-data/cookies)

| Sinov | Kutiladigan javob |
| --- | --- |
| Cookie va `memberImage` maydonida bitta kichik rasm | `200`, misol uchun `{ "size": 18264, "mimetype": "image/png" }`. |
| Cookie bor, fayl yuborilmagan yoki maydon nomi xato | `400`. |
| Cookie bor, fayl 2 MiB dan katta | `413`. |
| To‘g‘ri fayl bor, `accessToken` cookie o‘chirilgan | `401`. |

Hujjatdagi kod bo‘laklari vaqtinchalik loyiha nusxasida TypeScript tekshiruvidan o‘tdi. Postman natijalari mashq qo‘lda yozilganidan keyin qayd qilinadi.

## Keyingi backend bosqichlari

1. Auth’ni tugatish. Signup’da ruxsat berilgan maydonlarni tanlash, `HttpOnly` cookie, kichik JWT payload, joriy akkauntni MongoDB’dan tekshiradigan `verifyAuth`, `GET /member/me` va rol tekshiruvi. Hozir signup body’dagi `memberType` va `memberStatus` modelga uzatiladi, `verifyAuth` esa tokendagi member ma’lumotiga tayanadi. Admin seed va Postman kolleksiyasi joriy checkout’da hali yo‘q. [Sessiyani tekshirish darsi](03-auth-sessiya-va-profil.md)
2. Profilni tahrirlash. Profil matn maydonlari, avatarni saqlash va joriy parolni tekshirib parolni alohida o‘zgartirish.
3. Admin va xonalar. Xonalar CRUD’i, member holatini boshqarish, katalog, filter va pagination.
4. Bronlash. Sana bo‘yicha mavjudlik, narx, bandlik to‘qnashuvi, bekor qilish va tarix.
5. Favorites va sharhlar. Ruxsatlar bilan birga Postman’da backend oqimini yakuniy tekshirish.

Frontend backend bosqichlari tugagach boshlanadi.
