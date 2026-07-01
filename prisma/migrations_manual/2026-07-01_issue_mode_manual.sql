-- 「自分で作成する」入力形式（manual）を issue_mode enum に追加
-- Supabase SQL Editor で実行してください

ALTER TYPE "issue_mode" ADD VALUE IF NOT EXISTS 'manual';
