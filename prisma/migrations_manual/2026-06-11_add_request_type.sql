-- 経営課題に「相談種別（ヒアリング / 依頼）」カラムを追加
-- Supabase SQL Editor で実行してください

ALTER TABLE "management_issues"
  ADD COLUMN IF NOT EXISTS "requestType" TEXT;
