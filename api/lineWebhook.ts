import { Hono } from 'hono';
import { middleware, Client } from '@line/bot-sdk';
import { fromNodeMiddleware } from 'hono/adapter/node';

const cfg = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
};
const client = new Client(cfg);
const app = new Hono();

/** ──────────────── 署名検証 ──────────────── */
app.use('*', fromNodeMiddleware(middleware(cfg)));

/** ──────────────── Verify 用 (GET) ──────────────── */
app.get('/', (c) => c.text('ok'));

/** ──────────────── Webhook 本処理 (POST) ──────────────── */
app.post('/', async (c) => {
  const body: any = await c.req.json();

  for (const ev of body.events) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const query = ev.message.text;

      // ── Dify Workflow 呼び出し
      const resp = await fetch(
        `${process.env.DIFY_API}/workflows/${process.env.DIFY_WORKFLOW_ID}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.DIFY_TOKEN}`,
          },
          body: JSON.stringify({ query }),
        },
      ).then((r) => r.json());

      // ── LINE へ返信
      await client.replyMessage(ev.replyToken, {
        type: 'text',
        text: resp.output ?? '回答が取得できませんでした。',
      });
    }
  }

  return c.json({ status: 'ok' });
});

export default app;
