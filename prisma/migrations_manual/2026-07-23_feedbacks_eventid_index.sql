-- おせっかいのイベント別取得を高速化するインデックス
-- Supabase SQL Editor で実行してください（CONCURRENTLY で稼働中でもロックを最小化）

CREATE INDEX IF NOT EXISTS "feedbacks_eventId_idx" ON "feedbacks"("eventId");
