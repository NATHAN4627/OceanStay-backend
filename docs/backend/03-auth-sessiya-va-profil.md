# 03. Sessiyani tekshirish va profilni o‘qish

`GET /member/info` joriy profilni o‘qiydi. Bu nickname, avatar va parolni yangilashdan oldingi qadam. Cookie’dagi JWT member ID’sini olib yuradi. Akkauntning joriy roli, holati va profil ma’lumotlari MongoDB’dan keladi.

`Cookie → AuthService → MemberService → verifyAuth → getMember`

## 1. AuthService token orqali member ID’sini oladi

`src/models/Auth.service.ts` ichida `jwt.sign`ga beriladigan birinchi argumentni `{ _id: payload._id.toString() }`ga almashtiring. Imzo va muddatning sozlamalari o‘sha chaqiriqda turadi. Keyin `verifyAuth` metodini yangilang.

```ts
  public async verifyAuth(token: string): Promise<string> {
    try {
      const payload = jwt.verify(token, this.secretToken as string);
      if (typeof payload !== "string" && typeof payload._id === "string") {
        return payload._id;
      }
    } catch (err) {
      if (!(err instanceof jwt.JsonWebTokenError)) throw err;
    }

    throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
  }
```

Amaldagi tokenlarda ham `_id` bor. Yangi tokenlarda JWT muddati kabi standart claim’lar va member ID’si bo‘ladi. Imzosi yaroqsiz yoki muddati o‘tgan token `401` oladi. [jsonwebtoken verify](https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback)

## 2. MemberService akkauntni topadi

`src/models/Member.service.ts` fayliga `import { isObjectIdOrHexString } from "mongoose";` importini qo‘shing. `MemberService` klassi ichida quyidagi metodni yozing.

```ts
  public async getActiveMember(memberId: string): Promise<Member> {
    if (!isObjectIdOrHexString(memberId)) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
    }

    const member = await this.memberModel.findById(memberId).lean().exec();

    if (!member || member.memberStatus !== MemberStatus.ACTIVE) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
    }

    return member;
  }
```

`findById` joriy ma’lumotni oladi. `Member` schema’dagi `select: false` ushbu so‘rovda parol maydonini chiqarib tashlaydi. [Mongoose ID tekshiruvi](https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.isObjectIdOrHexString())

## 3. Controller va routerni ulang

`src/libs/types/member.ts` tepasiga `import type { Request } from "express";` qo‘shing. `ExtendedRequest` shu Express tipi asosida ishlaydi.

`src/controller/member.controller.ts` ichida `verifyAuth`ning `try` blokini quyidagi kod bilan almashtiring. Mavjud `catch` `Errors` obyektini JSON javobga aylantiradi.

```ts
    const token = req.cookies?.accessToken;
    if (typeof token !== "string" || !token) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTH);
    }

    const memberId = await authService.verifyAuth(token);
    req.member = await memberService.getActiveMember(memberId);

    next();
```

Middleware `401` qaytarganda, JSON javobidan oldin `res.clearCookie("accessToken")` chaqiring. Shu client keyingi so‘rov uchun qayta login qiladi. Cookie’ni o‘chirish boshqa client’da saqlangan JWT nusxasini bekor qilmaydi.

Controller faylida `export default memberController`dan oldin `getMember`ni qo‘shing.

```ts
memberController.getMember = (req: ExtendedRequest, res: Response) => {
  res.status(HttpCode.OK).json({ member: req.member });
};
```

`src/router.ts` da `export default router`dan oldin marshrutni yozing.

```ts
router.get("/member/info", memberController.verifyAuth, memberController.getMember);
```

## 4. Postman sinovi

`npm run start:dev` bilan backendni ishga tushiring. Login va profil so‘rovida bir xil host hamda port ishlating.

| Amal | Kutiladigan natija |
| --- | --- |
| Mavjud test akkaunt bilan `POST /login`, so‘ng `GET /member/info`. | `200`, joriy profil va rol. Javobda parol maydoni yo‘q. |
| Shu sessiya bilan `POST /logout`, so‘ng `GET /member/info`. | `401`. |
| Alohida test akkaunti bilan kirib, MongoDB’da shu akkaunt holatini `BLOCK`ga o‘zgartiring. Joriy cookie bilan `GET /member/info`ni yuboring. | `401`, `Message.NOT_AUTH`. Akkaunt `ACTIVE`ga qaytgach, qayta login qiling. |

Bu qadamda yangi paket kerak emas. `jsonwebtoken` token imzosi va muddatini tekshiradi, `mongoose` akkauntni topadi, `cookie-parser` cookie’ni o‘qiydi, `express` middleware va marshrutni ulaydi.

Kod bo‘laklari vaqtinchalik nusxada TypeScript’dan o‘tdi. MongoDB so‘rovi sinov ma’lumotlari bilan almashtirilib, faol, bloklangan va yaroqsiz sessiya holatlari tekshirildi. Haqiqiy MongoDB bilan Postman sinovi kod qo‘lda yozilgach bajariladi.

Profilga yozishga o‘tishdan oldin public signup uchun maydonlarni serverda tanlaymiz. Hozir body bevosita `MemberModel.create`ga yetib boradi va schema’dagi `memberType` hamda `memberStatus` qiymatlariga ta’sir qilishi mumkin. Shuningdek, signup va login cookie’lari uchun `HttpOnly`ni yoqib, tokenni JSON javobga qo‘shishni olib tashlaymiz.
