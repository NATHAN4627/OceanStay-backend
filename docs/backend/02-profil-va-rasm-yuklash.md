# 02. Profil va rasm yuklash

`src/libs/uploads.ts` da `makeUploader(address)` bitta Multer sozlamasidan turli papkalar uchun foydalanadi. `address` backend kodi belgilaydigan qiymat. Member avatari uchun `"member"` ishlatamiz.

## 1. Rasm uchun fayl filtrini yozish

`.jpg` va `.jpeg` JPEG formatining ikki kengaytmasi. Ikkalasi uchun MIME turi `image/jpeg`. PNG uchun `.png` va `image/png` mos keladi. Kengaytmani kichik harfga o‘tkazish `.JPG` kabi fayllarni ham qabul qilishga imkon beradi. [IANA JPEG](https://www.iana.org/assignments/media-types/image/jpeg) · [IANA PNG](https://www.iana.org/assignments/media-types/image/png)

`src/libs/uploads.ts` ichida importlardan keyin ruxsat etilgan juftliklarni yozing.

```ts
const imageMimeByExtension = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
]);
```

`getTargetImageStorage` funksiyasini yangilang. `destination` satr bo‘lsa, Multer papkani yaratadi. Fayl nomi UUID va kichik harfdagi kengaytmadan hosil bo‘ladi. [Express Multer qo‘llanmasi](https://expressjs.com/en/resources/middleware/multer/#diskstorage)

```ts
function getTargetImageStorage(address: string) {
  return multer.diskStorage({
    destination: path.resolve("uploads", address),
    filename(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, v4() + extension);
    },
  });
}
```

`makeUploader` funksiyasini yangilang. `export default makeUploader` fayl oxirida turadi.

```ts
const makeUploader = (address: string) => {
  return multer({
    storage: getTargetImageStorage(address),
    limits: { files: 1, fields: 0, fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, imageMimeByExtension.get(extension) === file.mimetype);
    },
  });
};
```

`cb(null, false)` bo‘lsa, Multer faylni diskka yozmaydi. Avatar marshruti faqat bitta fayl oladi, shuning uchun `fields: 0` bilan qo‘shimcha matn maydonlari cheklanadi. Avatar controller `req.file` bo‘sh qolgan holatni `400` bilan qaytaradi. Fayl 2 MiB dan oshsa, Multer `LIMIT_FILE_SIZE` xatosini beradi. Marshrutdagi xato handler uni `413`ga aylantiradi. `originalname` va `mimetype` mijozdan keladi. Avatarni doimiy joyga ko‘chirishdan oldin server fayl tarkibini ham tekshiradi va yaroqsiz vaqtinchalik faylni o‘chiradi. [Multer fileFilter va xatolar](https://expressjs.com/en/resources/middleware/multer/#filefilter)

| Paket | Loyihada ishlatilishi |
| --- | --- |
| `multer@2.5.0` | Multipart so‘rov, fayl filtri, hajm chegarasi, diskka yozish. |
| `@types/multer@2.3.0` | TypeScript’da `req.file` va Multer konfiguratsiyasi turlari. |
| `uuid@14.0.3` | `v4()` yangi fayl nomi uchun UUID yaratadi. |
| `@types/uuid@10.0.0` | Paketlar ro‘yxatida bor. |
| `path` | Node.js ichidagi modul. Fayl kengaytmasi va papka manzilini olish uchun ishlatiladi. |

## 2. Profil amallari uchun marshrutlar

Quyidagi marshrutlar hali yozilmagan. Nomlarni loyiha uslubiga moslab o‘zgartirish mumkin.

| Amal | Marshrut | Postman body |
| --- | --- | --- |
| Nickname va profil matnini o‘zgartirish | `PATCH /member/me` | JSON, masalan `{ "memberNick": "OceanGuest" }`. |
| Avatarni o‘zgartirish | `PATCH /member/me/avatar` | `form-data`, `memberImage` nomli **File**. |
| Parolni o‘zgartirish | `PATCH /member/me/password` | JSON, `currentPassword` va `newPassword`. Service joriy parolni bcrypt bilan tekshiradi. |

Har bir marshrut `verifyAuth`dan boshlanadi va member ID’si sessiyadan olinadi. Avatar uchun tartib `verifyAuth → makeUploader("member").single("memberImage") → avatar controller → MemberService`. Member modelidagi `memberImage`ga tekshirilgan rasmning nisbiy manzili yoziladi.

## 3. Auth’dan profilga o‘tish

`/signup`, `/login` va `/logout` yozilgan. `verifyAuth` hozir member’ni JWT ichidan oladi. Keyingi darsda token orqali topilgan member ID’sini MongoDB’dan tekshiramiz. Faol akkaunt `GET /me` orqali profilini oladi, bloklangan akkaunt `403`, yo‘q yoki yaroqsiz sessiya `401` oladi. Signup maydonlarini serverda tanlab, rol va holatni server belgilaydi. Signup va login cookie’lari uchun `HttpOnly` sozlanadi.

Avatar marshruti ulanganidan keyin Postman’da haqiqiy JPEG va PNG, GIF, mos kelmaydigan kengaytma, hajmi chegaradan katta fayl va cookiesiz so‘rov bilan tekshiramiz.

Qo‘llanmadagi Multer kodi vaqtinchalik nusxada TypeScript tekshiruvidan o‘tdi. Multipart sinovlarida kengaytma va MIME mosligi, aynan 2 MiB hajm hamda chegaradan oshgan fayl tekshirildi.
