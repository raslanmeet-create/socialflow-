-- ==============================================================
-- إعداد جداول قاعدة بيانات "الوكيل الذكي لشركة رسلان للتسويق"
-- انسخ هذا الكود بالكامل وضعه في Supabase -> SQL Editor ثم اضغط Run
-- ==============================================================

-- 1. جدول ملفات المستخدمين (المفاتيح، الصفحات المربوطة، إعدادات الرد التلقائي)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    meta_access_token TEXT,
    groq_api_key TEXT,
    selected_pages JSONB DEFAULT '[]'::jsonb,
    auto_reply_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل ميزة الأمان لكل مستخدم (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. جدول المنشورات المجدولة وتاريخ النشر
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    first_comment TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    media_types TEXT DEFAULT 'image',
    publish_time TIMESTAMPTZ,
    platforms JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'published', 'failed'
    post_results JSONB DEFAULT '{}'::jsonb,
    is_story BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own posts" ON public.scheduled_posts;
CREATE POLICY "Users can manage own posts" 
ON public.scheduled_posts FOR ALL 
USING (auth.uid() = user_id);

-- 3. تريجر (دالة تلقائية) لإنشاء بروفايل فور تسجيل أي مستخدم جديد عبر جوجل
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================
-- 4. أعمدة الصلاحيات وإدارة المشتركين والاشتراكات
-- ==============================================================
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_period TEXT DEFAULT '1_month';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- تعيين حساب رسلان كمدير رئيسي دائم
UPDATE public.user_profiles 
SET role = 'admin', status = 'active', subscription_period = 'lifetime'
WHERE email = 'raslan.meet@gmail.com';
