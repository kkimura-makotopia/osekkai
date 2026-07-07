-- 事業内容サマリ（自己紹介を「経歴・プロフィール(bio)」と「事業内容サマリ」に分割）
-- Supabase SQL Editor で実行してください

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "businessSummary" TEXT;
