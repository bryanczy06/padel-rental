# PadelRent — מערכת ניהול השכרת מחבטים

מערכת SaaS לניהול השכרת מחבטי פאדל. תומכת במספר מועדונים, סריקת QR, ו-3 רמות הרשאה.

---

## מבנה הפרויקט

```
projectOne/
├── frontend/          # React + Vite + Tailwind
├── supabase/
│   └── migrations/    # SQL schema
└── README.md
```

---

## הגדרה ראשונה — Supabase

### 1. צור פרויקט ב-Supabase
1. כנס ל-[supabase.com](https://supabase.com) → **Start your project** → התחבר עם GitHub
2. לחץ **New project**, בחר שם ואזור (EU West מומלץ לישראל)
3. שמור את הסיסמה שתיצור

### 2. הרץ את ה-Schema
1. בתפריט השמאלי: **SQL Editor**
2. פתח את הקובץ `supabase/migrations/001_initial_schema.sql`
3. העתק הכל, הדבק ב-SQL Editor, לחץ **Run**

### 3. קבל את המפתחות
1. בתפריט: **Settings → API**
2. העתק:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 4. צור מועדון ומשתמש ראשון (Super Admin)
הרץ ב-SQL Editor (החלף את הערכים):
```sql
-- 1. צור מועדון
INSERT INTO clubs (name, slug) VALUES ('מועדון הפאדל שלי', 'my-padel-club');

-- 2. שמור את ה-ID שחזר:
SELECT id FROM clubs WHERE slug = 'my-padel-club';
```

לאחר מכן: **Authentication → Users → Invite user**
- הכנס מייל וסיסמה
- אחרי שנוצר, הרץ:
```sql
UPDATE profiles
SET role = 'super_admin', club_id = 'THE-CLUB-UUID-HERE'
WHERE id = 'THE-USER-UUID-HERE';
```

---

## הרצה מקומית

### דרישות מוקדמות
- [Node.js 18+](https://nodejs.org)

### Frontend
```bash
cd frontend
cp .env.example .env
# ערוך .env עם המפתחות מ-Supabase

npm install
npm run dev
# פתח http://localhost:3000
```

---

## הוספת עובד חדש

מכיוון שאנחנו בשלב ראשוני, יוצרים עובדים ידנית ב-Supabase:

1. **Authentication → Users → Invite user** (או Add user)
2. הכנס מייל + סיסמה ראשונית
3. העתק את ה-UUID של המשתמש החדש
4. הרץ ב-SQL Editor:
```sql
UPDATE profiles
SET role = 'staff',  -- או 'admin'
    full_name = 'שם העובד',
    phone = '050-0000000',
    club_id = 'THE-CLUB-UUID'
WHERE id = 'THE-USER-UUID';
```

> בגרסה הבאה: הוספת עובדים ישירות מממשק המנהל (דורש Supabase Edge Function).

---

## Deploy לאינטרנט (Vercel)

1. עלה את הפרויקט ל-GitHub
2. כנס ל-[vercel.com](https://vercel.com) → **New Project** → חבר את ה-repo
3. הגדר:
   - **Root Directory:** `frontend`
   - **Environment Variables:**
     ```
     VITE_SUPABASE_URL = ...
     VITE_SUPABASE_ANON_KEY = ...
     ```
4. לחץ **Deploy** — תוך דקה יש URL ציבורי

---

## הוספת מועדון נוסף (Multi-tenant)

```sql
INSERT INTO clubs (name, slug) VALUES ('מועדון שני', 'club-two');
-- ואז צור משתמש admin ושייך אותו ל-club_id החדש
```

כל מנהל רואה רק את הנתונים של המועדון שלו — מובטח ברמת ה-DB (RLS).

---

## אבטחה

- **Row Level Security (RLS):** כל שורה ב-DB מוגנת ברמת Supabase — אי אפשר לקרוא נתונים של מועדון אחר
- **Auth:** JWT tokens של Supabase, session מנוהל אוטומטית
- **HTTPS:** Vercel + Supabase עובדים תמיד על HTTPS
- **סיסמאות:** מוצפנות ב-bcrypt על ידי Supabase Auth — לעולם לא נשמרות בטקסט גלוי
- **אין ת.ז / תאריך לידה** — הוחלט במכוון להפחית רגישות

---

## טכנולוגיות

| שכבה | כלי |
|------|-----|
| Frontend | React 18, Vite, Tailwind CSS |
| Routing | React Router v6 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| i18n | i18next (עברית + אנגלית, RTL) |
| QR Scan | html5-qrcode |
| QR Generate | qrcode |
| Charts | Recharts |
| Icons | Lucide React |
| Deploy | Vercel |
