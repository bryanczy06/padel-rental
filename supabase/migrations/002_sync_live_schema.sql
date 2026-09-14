-- ============================================================================
-- 002_sync_live_schema.sql
-- ============================================================================
--
-- ⚠️ קרא את זה לפני שאתה נוגע בקובץ הזה ⚠️
--
-- מה הקובץ הזה:
-- הקובץ הזה הוא **שחזור** של מצב מסד הנתונים החי ב-Supabase, כפי שהוא נראה
-- כרגע. הוא לא הועתק מהמסד עצמו ולא יוצא ממנו באופן רשמי — הוא נכתב מתוך
-- קריאה בקוד של האפליקציה: אילו טבלאות, עמודות ופונקציות הקוד מבקש בפועל.
-- כל מה שכאן נוסף למסד ידנית דרך ה-SQL Editor לאורך הזמן, ומעולם לא נשמר
-- כקובץ migration בפרויקט. הקובץ 001_initial_schema.sql מכיל רק את המצב
-- ההתחלתי, ולכן לבדו הוא לא מספיק כדי לשחזר את המערכת.
--
-- ⚠️ אזהרה חשובה לפני הרצה ⚠️
-- אסור להריץ את הקובץ הזה ישירות על ה-production החי.
-- לפני כל הרצה:
--   1. צור עותק / branch / פרויקט בדיקה של המסד.
--   2. הרץ שם קודם, ובדוק שהתחברות למערכת עדיין עובדת (זה הדבר הראשון
--      שנשבר כשמשנים מדיניות הרשאות על טבלת profiles).
--   3. רק אחרי שהכל תקין — שקול הרצה על הסביבה האמיתית.
--
-- יכול להיות שחלק מהדברים כאן כבר קיימים במסד החי. לכן כל פקודה כאן כתובה
-- בצורה בטוחה (idempotent) — כלומר אפשר להריץ אותה שוב בלי לשבור כלום.
--
-- הערה על מה שלא ניתן לשחזר מהקוד: שמות מדויקים של policies שנוצרו ידנית,
-- אילוצים (constraints) שלא באים לידי ביטוי בקוד, ונתונים עצמם. הקובץ מכסה
-- מבנה והרשאות בלבד.
-- ============================================================================

begin;

-- ============================================================================
-- חלק 1 — עמודות שנוספו לטבלאות שכבר קיימות ב-001
-- ============================================================================

-- clubs: הפעלה/השבתה של סניף + מחיר השכרה ברירת מחדל לסניף
alter table clubs    add column if not exists active           boolean not null default true;
alter table clubs    add column if not exists price_per_rental numeric;

-- profiles: הקוד מחפש עובדים/בעלים לפי כתובת מייל (שיבוץ עובד קיים, קידום בעלים)
alter table profiles add column if not exists email text;

-- customers: נקודות מועדון לקוחות, מועדון בית, והסכמה לקבלת עדכונים שיווקיים
alter table customers add column if not exists points            integer not null default 0;
alter table customers add column if not exists home_club_id      uuid references clubs(id);
alter table customers add column if not exists marketing_consent boolean default false;

-- customers.club_id חייב לאפשר NULL:
-- לקוח שנרשם לבד דרך הפורטל הציבורי נוצר בלי שיוך למועדון כלשהו.
-- השיוך שלו נקבע מאוחר יותר דרך home_club_id בצ׳ק אין הראשון שלו.
alter table customers alter column club_id drop not null;

-- rackets: ארכיון (במקום מחיקה) + מחיר ייחודי למחבט שגובר על מחיר הסניף
alter table rackets  add column if not exists archived_at    timestamptz;
alter table rackets  add column if not exists price_override numeric;


-- ============================================================================
-- חלק 2 — התפקיד 'owner'
-- ============================================================================
-- שים לב: role הוא **לא** enum אמיתי ב-Postgres, אלא עמודת text עם אילוץ
-- CHECK. לכן לא משתמשים כאן ב-ALTER TYPE ... ADD VALUE, אלא מחליפים את
-- האילוץ כולו. שם האילוץ ברירת המחדל שנוצר ב-001 הוא profiles_role_check.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add  constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'owner', 'staff'));


-- ============================================================================
-- חלק 3 — טבלאות חדשות
-- ============================================================================

-- checkins — כל סריקה של לקוח, גם כשלא הושכר מחבט.
-- משמש למדידת תנועת לקוחות ולחישוב "לקוחות חדשים מול חוזרים" בדשבורד.
create table if not exists checkins (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references clubs(id)     on delete cascade,
  customer_id    uuid not null references customers(id) on delete cascade,
  checked_in_by  uuid references profiles(id),
  created_at     timestamptz not null default now()
);

-- staff_clubs — שיוך עובד ליותר מסניף אחד (עובד שעובד בכמה סניפים).
-- הסניף ה"ראשי" של העובד נשאר ב-profiles.club_id; זו טבלת השיבוצים הנוספים.
create table if not exists staff_clubs (
  club_id     uuid not null references clubs(id)    on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  primary key (club_id, profile_id)
);

-- club_owners — בעלות על מועדון. בעלים אחד יכול להחזיק כמה סניפים ("רשת").
create table if not exists club_owners (
  club_id     uuid not null references clubs(id)    on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  primary key (club_id, profile_id)
);


-- ============================================================================
-- חלק 4 — אינדקסים
-- ============================================================================
-- האינדקסים על qr_code ועל phone קריטיים לביצועים: בלעדיהם כל סריקת ברקוד
-- מבצעת סריקה מלאה של הטבלה, וזה מאט משמעותית ככל שיש יותר לקוחות ומחבטים.

create index if not exists idx_checkins_club     on checkins(club_id);
create index if not exists idx_checkins_customer on checkins(customer_id);
create index if not exists idx_customers_qr_code on customers(qr_code);
create index if not exists idx_customers_phone   on customers(phone);
create index if not exists idx_rackets_qr_code   on rackets(qr_code);


-- ============================================================================
-- חלק 5 — הפעלת RLS על הטבלאות החדשות
-- ============================================================================
-- (הפקודה בטוחה גם אם RLS כבר מופעל.)

alter table checkins    enable row level security;
alter table staff_clubs enable row level security;
alter table club_owners enable row level security;


-- ============================================================================
-- חלק 6 — פונקציות עזר להרשאות
-- ============================================================================
--
-- ⚠️ הנקודה הכי חשובה בקובץ הזה ⚠️
-- כל שלוש הפונקציות האלה **חייבות** להיות security definer.
--
-- למה: has_club_access קוראת מטבלת staff_clubs, ומדיניות ההרשאות של
-- staff_clubs קוראת בעצמה ל-has_club_access. בלי security definer זה יוצר
-- לולאה אינסופית של בדיקות הרשאה, שתוקעת כל שאילתה — כולל שאילתת ההתחברות,
-- כך שאף אחד לא מצליח להיכנס למערכת.
-- אותו דבר לגבי my_club_id / my_role שקוראות מטבלת profiles.
-- security definer גורם לפונקציה לקרוא את הטבלה ישירות, בלי לעבור שוב
-- דרך מדיניות ההרשאות — וכך שוברת את הלולאה.

create or replace function my_club_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from profiles where id = auth.uid()
$$;

create or replace function my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- has_club_access — האם למשתמש המחובר יש גישה למועדון הזה?
-- נותנת גישה דרך ארבעה מסלולים:
--   1. super_admin — רואה הכל
--   2. הסניף הראשי של המשתמש (profiles.club_id)
--   3. שיבוץ לסניף נוסף (staff_clubs)
--   4. בעלות על הסניף (club_owners)
--
-- זו הפונקציה שמחליפה את הבדיקה הישנה "club_id = my_club_id()" שהייתה ב-001.
-- הבדיקה הישנה נכשלה בשקט עבור כל מי שעבד בסניף שאינו הסניף הראשי שלו:
-- מחיקות ועדכונים פשוט לא קרו, בלי הודעת שגיאה.
create or replace function has_club_access(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    my_role() = 'super_admin'
    or target_club_id = my_club_id()
    or exists (
      select 1 from staff_clubs sc
      where sc.profile_id = auth.uid() and sc.club_id = target_club_id
    )
    or exists (
      select 1 from club_owners co
      where co.profile_id = auth.uid() and co.club_id = target_club_id
    )
$$;


-- ============================================================================
-- חלק 7 — פונקציות RPC שהאפליקציה קוראת להן ישירות
-- ============================================================================

-- register_customer — הרשמת לקוח חדש מהפורטל הציבורי (בלי התחברות).
--
-- למה זה חייב להיות RPC ולא INSERT רגיל:
-- כשהאפליקציה עושה insert ומבקשת את השורה בחזרה (כדי להציג מיד את הברקוד),
-- Postgres בודק גם את הרשאת **הקריאה** על השורה החדשה. לגולש אנונימי אין
-- הרשאת קריאה על customers, ולכן כל ההרשמה נכשלה עם השגיאה:
--   42501 new row violates row-level security policy for table "customers"
-- הפונקציה הזו רצה כ-security definer ולכן עוקפת את הבעיה בצורה מבוקרת,
-- בלי לפתוח הרשאת קריאה גורפת על טבלת הלקוחות.
create or replace function register_customer(
  p_full_name         text,
  p_phone             text,
  p_email             text,
  p_marketing_consent boolean default true
)
returns customers
language plpgsql
security definer
set search_path = public
as $$
declare
  new_customer customers;
begin
  insert into customers (full_name, phone, email, marketing_consent)
  values (p_full_name, p_phone, p_email, p_marketing_consent)
  returning * into new_customer;
  return new_customer;
end;
$$;

grant execute on function register_customer(text, text, text, boolean) to anon, authenticated;


-- find_customer_by_phone — "הברקוד שלי": לקוח מאתר את עצמו לפי טלפון.
-- גם כאן נדרש security definer, כי הפונקציה נקראת ללא התחברות.
create or replace function find_customer_by_phone(p_phone text)
returns customers
language sql
stable
security definer
set search_path = public
as $$
  select * from customers where phone = p_phone limit 1;
$$;

grant execute on function find_customer_by_phone(text) to anon, authenticated;


-- find_customer_by_id — שחזור הלקוח מזיהוי ששמור אצלו בדפדפן (localStorage),
-- כדי שלא יצטרך להירשם שוב בכל כניסה.
create or replace function find_customer_by_id(p_id uuid)
returns customers
language sql
stable
security definer
set search_path = public
as $$
  select * from customers where id = p_id limit 1;
$$;

grant execute on function find_customer_by_id(uuid) to anon, authenticated;


-- get_club_staff — רשימת כל העובדים של סניף מסוים:
-- הסניף הראשי שלהם + משובצים דרך staff_clubs + בעלים דרך club_owners.
--
-- למה דרך RPC ולא שאילתה רגילה על profiles:
-- כדי להציג עובד ששובץ לסניף שני, צריך לקרוא את שורת ה-profiles שלו — אבל
-- מדיניות הקריאה על profiles מוכרחה להישאר פשוטה (ראה הערה בחלק 8), אחרת
-- ההתחברות נשברת. הפונקציה הזו מבודדת את הצורך הזה למקום אחד ובטוח.
create or replace function get_club_staff(target_club_id uuid)
returns setof profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from profiles p
  where (my_role() = 'super_admin' or has_club_access(target_club_id))
    and (
      p.club_id = target_club_id
      or p.id in (select profile_id from staff_clubs where club_id = target_club_id)
      or p.id in (select profile_id from club_owners where club_id = target_club_id)
    );
$$;

grant execute on function get_club_staff(uuid) to authenticated;


-- delete_staff_user — מחיקה מלאה של עובד (גם מהרשאות הכניסה למערכת).
-- מוחקת קודם את השיבוצים והבעלות, ואז את משתמש ההתחברות עצמו —
-- שמחיקתו גוררת אוטומטית גם את שורת ה-profiles.
create or replace function delete_staff_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if my_role() not in ('super_admin', 'admin', 'owner') then
    raise exception 'insufficient privileges';
  end if;

  delete from staff_clubs where profile_id = target_id;
  delete from club_owners where profile_id = target_id;
  delete from auth.users  where id = target_id;   -- מוחק גם את profiles (cascade)
end;
$$;

grant execute on function delete_staff_user(uuid) to authenticated;


-- ============================================================================
-- חלק 8 — מדיניות הרשאות (RLS)
-- ============================================================================
-- כל מדיניות נמחקת קודם (אם קיימת) ואז נוצרת מחדש, כדי שהקובץ יהיה בטוח
-- להרצה חוזרת. כל הקובץ עטוף בטרנזקציה אחת, כך שאין רגע ביניים שבו טבלה
-- נשארת בלי הגנה.

-- ─── CLUBS ──────────────────────────────────────────────────────────────────
drop policy if exists "clubs_select" on clubs;
create policy "clubs_select" on clubs for select using (
  my_role() = 'super_admin' or id = my_club_id() or has_club_access(id)
);

drop policy if exists "clubs_insert" on clubs;
create policy "clubs_insert" on clubs for insert with check (
  my_role() = 'super_admin'
);

drop policy if exists "clubs_update" on clubs;
create policy "clubs_update" on clubs for update using (
  my_role() = 'super_admin' or has_club_access(id)
);


-- ─── PROFILES ───────────────────────────────────────────────────────────────
--
-- ⚠️ אל תסבך את המדיניות הזו ⚠️
-- זו המדיניות ששולטת על שאילתת ההתחברות עצמה. כל ניסיון להרחיב אותה כך
-- שתקרא מ-staff_clubs או מ-club_owners ישירות יוצר לולאת הרשאות, ותוצאתה
-- היא שאף אחד לא מצליח להיכנס למערכת — כולל אתה.
-- הצורך "לראות עובד ששובץ לסניף אחר" נפתר דרך הפונקציה get_club_staff
-- (חלק 7), ולא דרך המדיניות הזו. השאר אותה פשוטה.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select using (
  my_role() = 'super_admin' or club_id = my_club_id()
);

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles for insert with check (
  my_role() in ('super_admin', 'admin', 'owner')
);

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update using (
  my_role() in ('super_admin', 'admin', 'owner') or id = auth.uid()
);

drop policy if exists "profiles_delete" on profiles;
create policy "profiles_delete" on profiles for delete using (
  my_role() in ('super_admin', 'admin', 'owner')
);


-- ─── CUSTOMERS ──────────────────────────────────────────────────────────────
--
-- הערה על הכוונה: כל עובד מחובר יכול לאתר **כל** לקוח. זה מכוון ולא באג —
-- לקוח יכול להגיע לכל סניף, והעובד שם חייב להיות מסוגל לסרוק אותו. הסינון
-- לפי רשת (מי מוצג ברשימת הלקוחות של המנהל) נעשה בצד האפליקציה לפי
-- home_club_id ולפי היסטוריית צ׳ק אין.
--
-- הרשאת ההוספה פתוחה (true) כי הרשמת לקוח מהפורטל הציבורי נעשית ללא התחברות.
drop policy if exists "customers_select" on customers;
create policy "customers_select" on customers for select using (
  my_role() in ('super_admin', 'admin', 'owner', 'staff')
);

drop policy if exists "customers_insert" on customers;
create policy "customers_insert" on customers for insert with check (true);

drop policy if exists "customers_update" on customers;
create policy "customers_update" on customers for update using (
  my_role() in ('super_admin', 'admin', 'owner', 'staff')
);

drop policy if exists "customers_delete" on customers;
create policy "customers_delete" on customers for delete using (
  my_role() in ('super_admin', 'admin', 'owner')
);


-- ─── RACKETS ────────────────────────────────────────────────────────────────
drop policy if exists "rackets_select" on rackets;
create policy "rackets_select" on rackets for select using (has_club_access(club_id));

drop policy if exists "rackets_insert" on rackets;
create policy "rackets_insert" on rackets for insert with check (
  has_club_access(club_id) and my_role() in ('super_admin', 'admin', 'owner')
);

drop policy if exists "rackets_update" on rackets;
create policy "rackets_update" on rackets for update using (has_club_access(club_id));

drop policy if exists "rackets_delete" on rackets;
create policy "rackets_delete" on rackets for delete using (
  my_role() in ('super_admin', 'admin', 'owner') and has_club_access(club_id)
);


-- ─── RENTALS ────────────────────────────────────────────────────────────────
-- שים לב: ב-001 לא הייתה בכלל מדיניות מחיקה ל-rentals. התוצאה הייתה שמחיקת
-- מחבט לצמיתות "הצליחה" כלפי המשתמש אבל לא מחקה כלום בפועל, כי אי אפשר היה
-- למחוק את ההשכרות שמצביעות עליו. לכן חובה שתהיה כאן מדיניות delete.
drop policy if exists "rentals_select" on rentals;
create policy "rentals_select" on rentals for select using (has_club_access(club_id));

drop policy if exists "rentals_insert" on rentals;
create policy "rentals_insert" on rentals for insert with check (has_club_access(club_id));

drop policy if exists "rentals_update" on rentals;
create policy "rentals_update" on rentals for update using (has_club_access(club_id));

drop policy if exists "rentals_delete" on rentals;
create policy "rentals_delete" on rentals for delete using (
  my_role() in ('super_admin', 'admin', 'owner') and has_club_access(club_id)
);


-- ─── CHECKINS ───────────────────────────────────────────────────────────────
drop policy if exists "checkins_select" on checkins;
create policy "checkins_select" on checkins for select using (has_club_access(club_id));

drop policy if exists "checkins_insert" on checkins;
create policy "checkins_insert" on checkins for insert with check (has_club_access(club_id));


-- ─── STAFF_CLUBS ────────────────────────────────────────────────────────────
drop policy if exists "staff_clubs_select" on staff_clubs;
create policy "staff_clubs_select" on staff_clubs for select using (
  my_role() = 'super_admin' or has_club_access(club_id)
);

drop policy if exists "staff_clubs_insert" on staff_clubs;
create policy "staff_clubs_insert" on staff_clubs for insert with check (
  my_role() in ('super_admin', 'admin', 'owner') and has_club_access(club_id)
);

drop policy if exists "staff_clubs_update" on staff_clubs;
create policy "staff_clubs_update" on staff_clubs for update using (
  my_role() in ('super_admin', 'admin', 'owner') and has_club_access(club_id)
);

drop policy if exists "staff_clubs_delete" on staff_clubs;
create policy "staff_clubs_delete" on staff_clubs for delete using (
  my_role() in ('super_admin', 'admin', 'owner') and has_club_access(club_id)
);


-- ─── CLUB_OWNERS ────────────────────────────────────────────────────────────
-- שים לב: המשתמש חייב להיות מסוגל לקרוא את שורות הבעלות של עצמו (profile_id
-- = auth.uid()) — בלי זה תהליך ההתחברות לא מצליח לבנות את רשימת הסניפים שלו.
drop policy if exists "club_owners_select" on club_owners;
create policy "club_owners_select" on club_owners for select using (
  my_role() = 'super_admin' or profile_id = auth.uid() or has_club_access(club_id)
);

drop policy if exists "club_owners_modify" on club_owners;
create policy "club_owners_modify" on club_owners for all
  using      (my_role() = 'super_admin')
  with check (my_role() = 'super_admin');


-- ============================================================================
-- חלק 9 — טריגר יצירת profile אוטומטית בהרשמה
-- ============================================================================
-- גרסה מעודכנת של הטריגר מ-001: מוסיפה שמירה של עמודת email, שנוספה מאוחר
-- יותר ונדרשת לחיפוש עובדים/בעלים לפי מייל.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id, full_name, email, role, club_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    (new.raw_user_meta_data->>'club_id')::uuid
  );
  return new;
end;
$$;

-- הטריגר עצמו כבר קיים מ-001 ומצביע על אותה פונקציה, ולכן לא נוגעים בו.
-- (CREATE OR REPLACE FUNCTION למעלה מספיק כדי לעדכן את ההתנהגות.)


commit;

-- ============================================================================
-- מה לא נכלל כאן בכוונה
-- ============================================================================
-- 1. Edge Function בשם create-staff-user — היא לא חלק ממסד הנתונים אלא קוד
--    שרת נפרד ב-Supabase, ולכן לא ניתנת לתיעוד בקובץ SQL. היא זו שיוצרת
--    משתמשי עובד/מנהל/בעלים חדשים, ומשתמשת ב-service role key.
-- 2. נתונים (מועדונים, עובדים, מחבטים, לקוחות) — הקובץ מתעד מבנה בלבד.
-- 3. הגדרות Auth בפרויקט Supabase (אימות מייל, סיסמאות וכו').
-- ============================================================================
