-- 経営課題提出機能 用テーブル
-- Supabase SQL Editor で実行してください（本番反映前に必須）

-- 入力モード enum
DO $$ BEGIN
  CREATE TYPE "issue_mode" AS ENUM ('text', 'qa');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 提出（1ユーザー×1イベントで1件、編集で上書き）
CREATE TABLE IF NOT EXISTS "issue_submissions" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "eventId"    TEXT NOT NULL,
  "mode"       "issue_mode" NOT NULL,
  "sourceText" TEXT,
  "qaAnswers"  JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "issue_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "issue_submissions_userId_eventId_key"
  ON "issue_submissions"("userId", "eventId");
CREATE INDEX IF NOT EXISTS "issue_submissions_userId_idx"
  ON "issue_submissions"("userId");
CREATE INDEX IF NOT EXISTS "issue_submissions_eventId_idx"
  ON "issue_submissions"("eventId");

ALTER TABLE "issue_submissions"
  ADD CONSTRAINT "issue_submissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_submissions"
  ADD CONSTRAINT "issue_submissions_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 個々の経営課題
CREATE TABLE IF NOT EXISTS "management_issues" (
  "id"           TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "hotTopic"     TEXT,
  "summary"      TEXT NOT NULL,
  "detail"       TEXT,
  "orderIndex"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "management_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "management_issues_submissionId_idx"
  ON "management_issues"("submissionId");

ALTER TABLE "management_issues"
  ADD CONSTRAINT "management_issues_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "issue_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
