-- Default categories are copied to each user's own namespace.
-- They remain editable and archivable like user-created categories.
INSERT INTO public.categories (user_id, name, kind, icon)
SELECT p.id, defaults.name, defaults.kind, defaults.icon
FROM public.profiles AS p
CROSS JOIN (
  VALUES
    ('income'::text, 'เงินเดือน'::text, 'briefcase#teal'::text),
    ('income'::text, 'รายได้เสริม'::text, 'more#teal'::text),
    ('income'::text, 'โบนัส'::text, 'gift#amber'::text),
    ('income'::text, 'ดอกเบี้ย'::text, 'briefcase#sky'::text),
    ('income'::text, 'อื่น ๆ'::text, 'more#graphite'::text),
    ('expense'::text, 'อาหาร'::text, 'utensils#tomato'::text),
    ('expense'::text, 'เดินทาง'::text, 'bus#sky'::text),
    ('expense'::text, 'ช้อปปิ้ง'::text, 'cart#fuchsia'::text),
    ('expense'::text, 'ที่อยู่อาศัย'::text, 'home#amber'::text),
    ('expense'::text, 'สุขภาพ'::text, 'heart#lime'::text),
    ('expense'::text, 'การศึกษา'::text, 'book#indigo'::text),
    ('expense'::text, 'บันเทิง'::text, 'game#fuchsia'::text),
    ('expense'::text, 'ของใช้ส่วนตัว'::text, 'gift#teal'::text),
    ('expense'::text, 'บิลและสาธารณูปโภค'::text, 'more#amber'::text),
    ('expense'::text, 'อื่น ๆ'::text, 'more#graphite'::text)
) AS defaults(kind, name, icon)
ON CONFLICT (user_id, name, kind) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );

  INSERT INTO public.categories (user_id, name, kind, icon)
  VALUES
    (NEW.id, 'เงินเดือน', 'income', 'briefcase#teal'),
    (NEW.id, 'รายได้เสริม', 'income', 'more#teal'),
    (NEW.id, 'โบนัส', 'income', 'gift#amber'),
    (NEW.id, 'ดอกเบี้ย', 'income', 'briefcase#sky'),
    (NEW.id, 'อื่น ๆ', 'income', 'more#graphite'),
    (NEW.id, 'อาหาร', 'expense', 'utensils#tomato'),
    (NEW.id, 'เดินทาง', 'expense', 'bus#sky'),
    (NEW.id, 'ช้อปปิ้ง', 'expense', 'cart#fuchsia'),
    (NEW.id, 'ที่อยู่อาศัย', 'expense', 'home#amber'),
    (NEW.id, 'สุขภาพ', 'expense', 'heart#lime'),
    (NEW.id, 'การศึกษา', 'expense', 'book#indigo'),
    (NEW.id, 'บันเทิง', 'expense', 'game#fuchsia'),
    (NEW.id, 'ของใช้ส่วนตัว', 'expense', 'gift#teal'),
    (NEW.id, 'บิลและสาธารณูปโภค', 'expense', 'more#amber'),
    (NEW.id, 'อื่น ๆ', 'expense', 'more#graphite')
  ON CONFLICT (user_id, name, kind) DO NOTHING;

  RETURN NEW;
END;
$$;
