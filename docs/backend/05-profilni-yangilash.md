# 05. Telefon orqali login va profilni yangilash

## Telefon orqali kirish

`POST /signup` uchun `memberNick`, `memberPhone` va `memberPassword` yuboriladi. Bir nechta akkaunt bir xil nickname bilan ro‘yxatdan o‘ta oladi. Har birining telefoni va MongoDB identifikatori alohida.

`POST /login` uchun **Body → raw → JSON** tanlang.

```json
{
  "memberPhone": "01012345678",
  "memberPassword": "demo-password"
}
```

Telefonni signup paytida saqlangan formatda string qilib yuboring. `MemberService` telefon orqali akkauntni topadi va bcrypt orqali parolni tekshiradi. `GET /member/info` login cookie’sidan foydalanadi.

## Sodda `updateMember` oqimi

### 1. Router

```ts
router.post(
  "/member/update",
  memberController.verifyAuth,
  uploader("member").single("memberImage"),
  memberController.updateMember,
);
```

Multer rasm yuborilganda uni `uploads/member`ga yozadi va `req.file`ni to‘ldiradi. Faylsiz so‘rov ham controllerga o‘tadi. Bu variantda `uploads.ts`dan `validateImageSignature`, `imageSignatures` va `readFile` importini olib tashlashingiz mumkin. Mavjud `fileFilter` kengaytma va yuborilgan MIME turini solishtiradi. Fayl mazmunidagi baytlar bu variantda tekshirilmaydi.

### 2. Controller inputni yig‘adi

`member.controller.ts` tepasiga `import { unlink } from "node:fs/promises";` qo‘shing. `unlink` service inputni rad qilganda shu so‘rovda yozilgan faylni olib tashlaydi.

```ts
memberController.updateMember = async (req: ExtendedRequest, res: Response) => {
  const file = req.file;
  try {
    const { memberNick, memberAddress, currentPassword, newPassword } =
      req.body ?? {};

    const input: MemberUpdateInput = {
      _id: req.member._id,
      memberNick,
      memberAddress,
      memberImage: file ? `uploads/member/${file.filename}` : undefined,
      currentPassword,
      newPassword,
    };

    const result = await memberService.updateMember(input);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    if (err instanceof Errors) {
      if (file) await unlink(file.path).catch(console.error);
      res.status(err.code).json({ code: err.code, message: err.message });
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
  }
};
```

`fields` kabi massivni bitta string sifatida tekshirish bu yerda kerak bo‘lmaydi. Controller maydonlarni bittalab oladi, service har bir yuborilgan qiymatni tekshiradi.

### 3. Service bitta `$set` bilan yangilaydi

```ts
  public async updateMember(input: MemberUpdateInput): Promise<Member> {
    const { currentPassword, newPassword } = input;
    const filter = { _id: input._id, memberStatus: MemberStatus.ACTIVE };
    let passwordHash: string | undefined;

    if (
      (input.memberNick !== undefined &&
        (typeof input.memberNick !== "string" || !input.memberNick.trim())) ||
      (input.memberAddress !== undefined && typeof input.memberAddress !== "string")
    ) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PROFILE_UPDATE);
    }

    if (newPassword !== undefined || currentPassword !== undefined) {
      if (
        typeof currentPassword !== "string" ||
        !currentPassword ||
        typeof newPassword !== "string" ||
        !newPassword.trim() ||
        bcrypt.truncates(newPassword)
      ) {
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PROFILE_UPDATE);
      }

      const member = await this.memberModel
        .findOne(filter)
        .select("memberPassword")
        .lean()
        .exec();

      if (!member) {
        throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
      }

      const oldHash = member.memberPassword;
      if (!oldHash || !(await bcrypt.compare(currentPassword, oldHash))) {
        throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_CURRENT_PSWD);
      }

      const salt = await bcrypt.genSalt();
      passwordHash = await bcrypt.hash(newPassword, salt);
      Object.assign(filter, { memberPassword: oldHash });
    }

    const changes = {
      memberNick: input.memberNick?.trim(),
      memberAddress: input.memberAddress?.trim(),
      memberImage: input.memberImage,
      memberPassword: passwordHash,
    };

    if (Object.values(changes).every((value) => value === undefined)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PROFILE_UPDATE);
    }

    const result = await this.memberModel
      .findOneAndUpdate(filter, { $set: changes }, { new: true, runValidators: true })
      .select(memberFields)
      .lean()
      .exec();

    if (!result) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);

    return result;
  }
```

- `filter` qaysi akkaunt yangilanishini aytadi. Parol o‘zgarganda tekshirilgan eski hash ham filtrga qo‘shiladi. Bu ikki parallel so‘rovning bir xil eski parol orqali yozishining oldini oladi.
- `changes` ichidagi `undefined` maydonlarni Mongoose `$set`dan chiqaradi. Masalan, faqat nickname kelganida nickname yoziladi.
- `new: true` yangilangan hujjatni qaytaradi. Controller uni JSON javob qilib yuboradi. `findOneAndUpdate` modelning tayyor metodi. `memberFields` profil javobiga kiradigan maydonlarni tanlaydi. [Mongoose findOneAndUpdate](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)

### TypeScript’da qizil chiqqan qatorlar

- `_id`, `memberNick` va `memberAddress` shu metodga kirgan `input` ichida. Yuqoridagi `const { ... } = input` ularni lokal o‘zgaruvchiga chiqaradi.
- `newPassword?` va `currentPassword?` optional. Avval parol bloki ichida ikkala qiymat borligini tekshiring, keyin `bcrypt.compare` va `bcrypt.hash` ishlating. Hash `passwordHash`ga olinadi va `changes.memberPassword` orqali bazaga yoziladi.
- `findOne()` hech kimni topmasa `null` beradi. `if (!member)` va `if (!oldHash)` tekshiruvi `bcrypt.compare`ga tayyor string hash berilishini ta’minlaydi.

### Body shakli

Rasmsiz so‘rov uchun **Body → raw → JSON** ishlating. Rasm bilan **Body → form-data** ichida `memberImage`ni **File**, qo‘shiladigan nickname, manzil yoki parol maydonlarini **Text** qiling. Fayl formati JPEG yoki PNG, hajmi 2 MiB gacha.

## Postman sinovlari

1. Turli telefonli ikkita test akkauntiga bir xil nickname bering. Har biri o‘z telefoni bilan kirib, `GET /member/info` orqali o‘z `_id`sini olishini tekshiring.
2. Login cookie’si bilan `POST /member/update`ga `{"memberNick":"OceanGuest","memberAddress":"Busan"}` yuboring. `200` va yangilangan profilni kuting.
3. `currentPassword` va `newPassword` yuboring. Keyingi login yangi parol bilan ishlashi, eski parol bilan `401` qaytishi kerak.
4. **form-data** ichida `memberImage` fayli va `memberAddress` matnini birga yuboring. `200` javobida `memberImage` yo‘li `uploads/member/` bilan boshlanadi. Fayl filtrdan o‘tmasa, Multer xatoni Express’ga uzatadi va profil yangilanmaydi.

Paketlar `express`, `mongoose`, `bcryptjs`, `multer`, `@types/multer` va fayl nomlari uchun `uuid`. Joriy paketlar yetarli.
