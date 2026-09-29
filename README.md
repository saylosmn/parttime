# Цаг — оюутны part-time ажлын платформ

Оюутнуудыг part-time ажил олгогчтой холбодог mobile-first PWA. Next.js 14 (App Router) + MongoDB + Auth.js + Web Push. Нэг репо, Vercel дээр frontend + backend хамт ажиллана.

## Бүтэц

```
app/
  (app)/            Оюутан/нийтийн хэсэг (доод nav): /, /jobs/[id], /me/*, /notifications
  employer/         Ажил олгогчийн самбар (desktop-д sidebar, утсанд доод nav)
  admin/            Админ: хүлээгдэж буй зар, бүх зар, хэрэглэгч, гомдол
  login, onboarding Google нэвтрэлт, role сонгох
  api/              Route handler-ууд (бүгд Zod-оор шалгана, role шалгана)
  api/cron/daily    Vercel Cron: зар хаах, сануулга, үнэлгээ ил болгох, цэвэрлэгээ
lib/
  db.ts             Serverless-д тохирсон cached Mongoose холболт
  notify.ts         notify(): апп доторх мэдэгдэл + Web Push (2 суваг)
  push.ts           web-push, 404/410 ирвэл subscription устгана
  services.ts       Үнэлгээ тооцох/ил болгох, яаралтай зарын broadcast
  validators.ts     Zod schema-ууд
  config.ts         Апп нэр, дүүрэг, шошго, хязгаарууд (нэрийг NEXT_PUBLIC_APP_NAME-ээр солино)
models/index.ts     User, Job, Application, Notification, PushSubscription, Review, Report
public/sw.js        Service worker: push, notificationclick, offline fallback
scripts/seed.ts     Туршилтын өгөгдөл
scripts/icons.mjs   PWA icon үүсгэгч
```

## Local ажиллуулах

1. Node 18.18+ суулгасан байх.
2. Хамаарлууд:
   ```bash
   npm install
   ```
3. `.env.example`-ийг `.env.local` болгон хуулж бөглөнө (доорх хэсгүүдийг үз).
4. Туршилтын өгөгдөл (3 ажил олгогч, 5 оюутан, 10 зар):
   ```bash
   npm run seed
   ```
   Дахин үүсгэх бол `npm run seed -- --reset`.
5. Ажиллуулах:
   ```bash
   npm run dev
   ```
   http://localhost:3000

**Google-гүйгээр турших:** `.env.local`-д `DEV_LOGIN=true` гэвэл `/login` хуудсанд "DEV: seed хэрэглэгчээр нэвтрэх" гарч seed-ийн оюутан/ажил олгогч/админаар нэвтэрнэ. Seed админ эрхтэй байхын тулд `ADMIN_EMAILS`-д `admin@seed.tsag.mn` нэмнэ. Энэ нь `NODE_ENV=production` үед хэзээ ч идэвхжихгүй.

## Env хувьсагчид

| Нэр | Тайлбар |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `AUTH_SECRET` | `npx auth secret` эсвэл `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push түлхүүр |
| `VAPID_SUBJECT` | `mailto:таны@имэйл` |
| `ADMIN_EMAILS` | Таслалаар тусгаарласан админ имэйлүүд |
| `CRON_SECRET` | Vercel Cron-ийн нууц (Vercel өөрөө `Authorization: Bearer` header-ээр илгээнэ) |
| `NEXT_PUBLIC_APP_NAME` | Апп нэр (анхдагч: Цаг) |
| `BANK_ACCOUNT_INFO` | Онцлох зарын төлбөр хүлээн авах данс (Төлбөр хуудсанд харагдана) |
| `DEV_LOGIN` | Зөвхөн local: seed хэрэглэгчээр нэвтрэх |

### VAPID түлхүүр үүсгэх

```bash
npx web-push generate-vapid-keys
```

`Public Key` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `Private Key` → `VAPID_PRIVATE_KEY`. Түлхүүрээ солих юм бол хуучин subscription-ууд ажиллахаа болино (хэрэглэгчид дахин асаана).

### Google OAuth

1. https://console.cloud.google.com → APIs & Services → Credentials → **Create OAuth client ID** (Web application).
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<таны-домэйн>/api/auth/callback/google`
3. Client ID/Secret-ийг env-д хийнэ.

### MongoDB Atlas

1. https://cloud.mongodb.com дээр үнэгүй M0 cluster үүсгэнэ.
2. **Database Access** → хэрэглэгч, нууц үг үүсгэнэ.
3. **Network Access** → `0.0.0.0/0` нэмнэ (Vercel-ийн IP тогтмол биш).
4. **Connect → Drivers** → connection string-ийг `MONGODB_URI`-д хийнэ, төгсгөлд DB нэр (`/tsag`) нэмнэ.
5. Индексүүд Mongoose-оор автоматаар үүснэ (`npm run seed` мөн `syncIndexes` дуудна).

## Vercel-д deploy хийх

1. Репог GitHub руу push хийгээд Vercel → **Add New Project** → import.
2. **Settings → Environment Variables**-д дээрх бүх хувьсагчийг (DEV_LOGIN-оос бусад) нэмнэ.
3. Deploy. `vercel.json` дахь cron (`/api/cron/daily`, өдөр бүр 01:00 UTC = УБ-ын 09:00) автоматаар бүртгэгдэнэ.
4. Google OAuth-д production redirect URI нэмсэн эсэхээ шалгана.
5. Админ имэйлээрээ нэвтэрмэгц админ эрхтэй болно (`/admin`).

## Android апп (`android/`)

PWA-г **Trusted Web Activity (TWA)** болгон боосон Android апп. Апп нээгдэхэд Vercel дээрх сайтыг Chrome-ын хөдөлгүүрээр бүтэн дэлгэцээр харуулна, тиймээс web push мэдэгдэл Android-ийн мэдэгдэл болж ирнэ. Сайтаа шинэчлэхэд апп-ыг дахин гаргах шаардлагагүй.

Шаардлага: JDK 17, Android SDK (Android Studio суулгасан бол бэлэн).

1. `android/gradle.properties` дахь `twaHost`-ыг Vercel-ийн домэйноор солино (`https://`-гүй).
2. Debug APK:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   Гарах файл: `android/app/build/outputs/apk/debug/app-debug.apk` (утсанд шууд суулгаж турших).
3. **Домэйн баталгаажуулалт (URL мөрийг арилгах):** Vercel env-д `ANDROID_CERT_SHA256`-д signing key-ийн SHA-256-ийг хийнэ. Сайт `/.well-known/assetlinks.json`-оор үүнийг автоматаар гаргана.
   - Debug key: `keytool -list -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey`
   - Play Store-д гаргахад Play Console → App integrity → **App signing key** fingerprint-ийг нэмнэ (таслалаар хэд хэдийг зэрэг бичиж болно).
4. **Play Store-д зориулсан release (AAB):**
   ```bash
   keytool -genkeypair -v -keystore android/tsag-release.jks -alias tsag -keyalg RSA -keysize 2048 -validity 10000
   ```
   `android/keystore.properties` файл үүсгэнэ (git-д орохгүй):
   ```
   storeFile=tsag-release.jks
   storePassword=...
   keyAlias=tsag
   keyPassword=...
   ```
   Дараа нь `./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`-ийг Play Console-д upload хийнэ. Keystore-оо алдвал апп-аа шинэчлэх боломжгүй болно, нөөцлөж хадгална уу.
5. Шинэ хувилбар гаргахдаа `android/app/build.gradle` дахь `versionCode`-ыг нэмэгдүүлнэ.

Windows дээр gradle "Unable to establish loopback connection" алдаа гарвал: `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\tmp` гэж тохируулна.

## Гол дүрмүүд (кодонд хэрэгжсэн)

- Зар `pending` төлөвтэй үүсэж, админ зөвшөөрсний дараа нийтлэгдэнэ. Засвар хийвэл дахин шалгалтад орно.
- Цалин, хуваарь, дүүрэг заавал. "Тохиролцоно" гэсэн хуваарийг Zod татгалзана.
- Оюутан өдөрт 20 өргөдөл, ажил олгогч өдөрт 10 зар (DB-д тоолж шалгадаг тул serverless-д ажиллана).
- Оюутны утасны дугаар зөвхөн `invited` / `hired` / `completed` төлөвт ажил олгогчид харагдана.
- Үнэлгээ: зөвхөн `completed` өргөдөл дээр, тал бүр нэг удаа (unique index). Хоёр тал үнэлсэн эсвэл 7 хоног өнгөрсний дараа (cron) ил болж `ratingAvg` шинэчлэгдэнэ. 3-аас цөөн бол "Шинэ". Ажил олгогчийн дундаж 3.0-аас доош буувал админд мэдэгдэл очно.
- Яаралтай/онцлох зар нийтлэгдэхэд тухайн дүүргийн, тохирох чөлөөт цагтай 200 хүртэлх оюутанд мэдэгдэл очно.
- Push зөвшөөрлийг хуудас нээгдмэгц асуухгүй: анхны өргөдөл/зар илгээсний дараа өөрийн карт харуулна. iOS Safari-д "Нүүр дэлгэцэд нэмэх" заавар гарна.

## Одоохондоо байхгүй

Онлайн төлбөр (QPay/Byl: онцлох зарыг админ `/admin/jobs`-аас гараар идэвхжүүлнэ, дараа нь webhook-оор `feature` action-ыг дуудахад бэлэн), чат, CV upload, native апп.

## Скриптүүд

```bash
npm run dev      # хөгжүүлэлт
npm run build    # production build
npm run seed     # туршилтын өгөгдөл
npm run icons    # PWA icon-уудыг дахин үүсгэх
```
