# 02. Profil va rasm yuklash

`src/libs/uploads.ts` da `makeUploader(address)` bitta Multer sozlamasidan turli papkalar uchun foydalanadi. Backend avatar uchun `makeUploader("member")`, xona rasmi uchun `makeUploader("rooms")` chaqiradi. Fayllar mos ravishda `uploads/member` va `uploads/rooms` ichiga yoziladi.

## 1. Rasm filtrining boshlang‘ich mashqi

`.jpg` va `.jpeg` JPEG formatining ikki kengaytmasi. Ikkalasi uchun MIME turi `image/jpeg`. PNG uchun `.png` va `image/png` mos keladi. Kengaytmani kichik harfga o‘tkazish `.JPG` kabi fayllarni ham qabul qilishga imkon beradi. [IANA JPEG](https://www.iana.org/assignments/media-types/image/jpeg) · [IANA PNG](https://www.iana.org/assignments/media-types/image/png)

`src/libs/uploads.ts` ichidagi `imageMimeExtensions` ruxsat etilgan juftliklarni belgilaydi.

```ts
const imageMimeExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
]);
```

`destination: path.resolve("uploads", address)` papkani `makeUploader` chaqirilgan paytda yaratadi. Har bir papka birinchi qabul qilingan fayl bilan yaratilishi uchun `destination` callback ichida `mkdir` ishlating. `recursive: true` yuqoridagi `uploads` papkasini ham yaratadi va papka mavjud paytda davom etishga imkon beradi. [Express Multer qo‘llanmasi](https://expressjs.com/en/resources/middleware/multer/#diskstorage) · [Node.js mkdir](https://nodejs.org/api/fs.html#fsmkdirpath-options-callback)

```ts
import { mkdir } from "node:fs";

type ImageFolder = "member" | "rooms";

function getTargetImageStorage(address: ImageFolder) {
  const directory = path.resolve("uploads", address);

  return multer.diskStorage({
    destination(_req, _file, cb) {
      mkdir(directory, { recursive: true }, (error) => {
        cb(error, directory);
      });
    },
    filename(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, v4() + extension);
    },
  });
}
```

`makeUploader` funksiyasini yangilang. `export default makeUploader` fayl oxirida turadi.

```ts
const makeUploader = (address: ImageFolder) => {
  return multer({
    storage: getTargetImageStorage(address),
    limits: { files: 1, fields: 0, fileSize: 2 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, imageMimeExtensions.get(extension) === file.mimetype);
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
| `node:fs` | Node.js ichidagi modul. `mkdir` birinchi fayl kelganda papkani yaratadi. |

## 2. Profil amallari uchun marshrutlar

OceanStay API’sida barcha ma’lumot o‘qish marshrutlari `GET`. Yaratish, yangilash va o‘chirish amallari `POST`. Joriy implementatsiyada uchala tahrirlash amali bitta marshrutda ishlaydi.

| Amal | Marshrut | Postman body |
| --- | --- | --- |
| Profilni o‘qish | `GET /member/info` | Cookie orqali faol sessiya. |
| Nickname’ni o‘zgartirish | `POST /member/update` | JSON, masalan `{ "memberNick": "OceanGuest" }`. |
| Avatarni o‘zgartirish | `POST /member/update` | `form-data`, `memberImage` nomli **File**. |
| Parolni o‘zgartirish | `POST /member/update` | JSON, `currentPassword` va `newPassword`. Service joriy parolni bcrypt bilan tekshiradi. |

Har bir marshrut `verifyAuth`dan boshlanadi va member ID’si sessiyadan olinadi. Yangilash tartibi `verifyAuth → makeUploader("member", 4).single("memberImage") → updateMember → MemberService`. Joriy uploader to‘rtta matn maydoniga ruxsat beradi va mos kelmagan formatga `400` qaytaradi. Member modelidagi `memberImage`ga tekshirilgan rasmning nisbiy manzili yoziladi.

Hozir `files: 1` va `fields: 0` avatarga mos. Xonalar bosqichida bir nechta rasm bitta so‘rovda qabul qilinsa, xona marshruti uchun rasm soni chegarasini o‘sha bosqichda sozlaymiz.

## 3. Auth’dan profilga o‘tish

`/signup`, `/login` va `/logout` yozilgan. `verifyAuth` hozir member’ni JWT ichidan oladi. Navbatdagi darsda member ID’sini MongoDB’dan tekshiramiz va `GET /member/info` yozamiz. [Sessiyani tekshirish darsi](03-auth-sessiya-va-profil.md)

Joriy avatar va profil so‘rovlari uchun [Telefon orqali login va profilni yangilash](05-profilni-yangilash.md) darsidagi Postman sinovlarini ishlating.

Multer filtri vaqtinchalik nusxada TypeScript va multipart sinovlaridan o‘tdi. Ikkala papkaga yozish, format va MIME mosligi, hajm chegarasi hamda yangi namuna bilan papkaning birinchi qabul qilingan yuklashda yaratilishi tekshirildi.
