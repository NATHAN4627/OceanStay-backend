# 04. Signup maydonlarini chegaralash

`verifyAuth` JWT’dan member ID’sini oladi va loyiha TypeScript tekshiruvidan o‘tdi. Himoyalangan `GET /member/info` uchun bloklangan akkauntga ham `401 NOT_AUTH` qaytarish kerak. Hozir `getActiveMember` ichidagi maxsus `BLOCK` bloki `403` qaytaryapti. Shu blok olib tashlansa, umumiy `memberStatus !== MemberStatus.ACTIVE` tekshiruvi bloklangan akkauntga ham ishlaydi.

## Signup uchun server tanlagan maydonlar

`src/models/Member.service.ts` ichida `MemberStatus` bilan birga `MemberType`ni ham import qiling. `signup` registratsiya ma’lumotidan yangi obyekt tuzib, modelga uzatadi.

```ts
const memberNick = input.memberNick.trim();
const salt = await bcrypt.genSalt();
const memberPassword = await bcrypt.hash(input.memberPassword, salt);

// Mavjud try bloki ichida create chaqiruvini almashtiring.
const result = await this.memberModel.create({
  memberNick,
  memberPhone: input.memberPhone,
  memberPassword,
  memberType: MemberType.USER,
  memberStatus: MemberStatus.ACTIVE,
});
```

Birinchi uch qator eski parol tayyorlash qatorlarini almashtiradi. `create`dan keyingi javob va xato ishlovini saqlang. Oddiy registratsiyada nickname, telefon va parol qabul qilinadi. Rol va holatni server belgilaydi. Haqiqiy parol o‘rniga bcrypt hosil qilgan hash saqlanadi.

## Postman

`POST /signup`ga yangi test akkauntining `memberNick`, `memberPhone` va `memberPassword` maydonlarini yuboring. Javob `201`, `memberType: "USER"` va `memberStatus: "ACTIVE"` bo‘lishi kerak. Shu akkaunt bilan `POST /login` va `GET /member/info`ni sinang.

Bu qadamda yangi paket o‘rnatilmaydi. `bcryptjs` parolni hash qiladi, `mongoose` member’ni saqlaydi.
