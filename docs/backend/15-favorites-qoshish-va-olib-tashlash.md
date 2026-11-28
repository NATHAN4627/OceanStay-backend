# 15. Favorites va frontendga ulash

## Favorites

Favorites sahifasi va yurakcha frontendda ishlaydi. User uchun `oceanstay:favorites:${memberId}` kalitida xona `_id`lari massivi saqlanadi. Yurakcha bosilganda ID ro‘yxatga qo‘shiladi yoki undan chiqariladi. Ro‘yxat shu brauzerda sahifa yangilanganda ham saqlanadi. [Web Storage standarti](https://html.spec.whatwg.org/multipage/webstorage.html)

Favorites sahifasi har bir ID uchun mavjud `GET /room/:id` orqali joriy narx, status va rasmlarni oladi. `404` bo‘lsa, xona ro‘yxatda chiqmaydi. Favorites uchun backend’da alohida kolleksiya va API yaratish rejasini shu qaror bilan yakunladik.

## Demo uchun mavjud API’lar

| Bo‘lim | API’lar |
| --- | --- |
| Sessiya | `POST /signup`, `POST /login`, `POST /logout` |
| Profil | `GET /member/info`, `POST /member/update` |
| Xonalar | `GET /room/all`, `GET /room/:id` |
| Admin | `GET /admin/members`, `POST /admin/members/status/:memberId`, `POST /admin/room/create`, `POST /admin/room/update/:id`, `POST /admin/room/delete/:id` |
| Demo xarid va tarix | `POST /order/room/:id` kelish va chiqish sanalarini qabul qiladi, `GET /orders` ularni qaytaradi. |

Dastlabki arxitekturadagi sana bo‘yicha bandlikni tekshirish, bekor qilish, sharhlar va admin kalendari keyingi bosqichga qoladi.

## Frontendga ulashdan oldin

1. **Cookie va CORS.** Agar frontend va backend turli originlarda ishlasa, `src/app.ts`dagi CORS sozlamasiga `credentials: true` qo‘shing. `FRONTEND_URL` frontendning aniq origini bo‘lsin. Frontend auth so‘rovlarida `fetch` uchun `credentials: "include"` ishlating. Brauzerda login qilib, sahifani yangilang va `GET /member/info` hamda logout’ni tekshiring. [Express CORS](https://expressjs.com/en/resources/middleware/cors/)
2. **Rasmlarni brauzerda ochish.** `src/app.ts`dagi static serving izohga olingan. Xona rasmlari uchun [09-qadamdagi static marshrut](09-xona-tafsilotlari.md)ni, profil rasmi uchun ham shu shaklda `/uploads/member` marshrutini ulang. Brauzerda ikkala turdagi rasm URL’i ochilishini tekshiring.
3. **Signup roli.** Joriy signup butun `input`ni modelga uzatadi. Public demo ochilishidan oldin [04-qadamdagi signup maydonlari](04-signup-maydonlari.md) bo‘yicha server `memberType: USER` va `memberStatus: ACTIVE`ni o‘zi belgilashini tekshiring.

Frontendda avval signup va login oqimini, keyin katalog va xona tafsilotlarini, undan so‘ng xarid, tarix va favorites sahifalarini ulash mumkin.
