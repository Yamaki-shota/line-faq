import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, validateSignature } from '@line/bot-sdk';

const cfg = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
};
const client = new Client(cfg);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET / ⇒ Verify 用
  if (req.method === 'GET') return res.status(200).send('ok');

  // 署名検証
  const sig = req.headers['x-line-signature'] as string;
  if (!validateSignature(JSON.stringify(req.body), cfg.channelSecret, sig)) {
    return res.status(403).send('invalid signature');
  }

  // イベント処理
  for (const ev of req.body.events) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const query = ev.message.text;

      // Dify Workflow 呼び出し
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
      ).then(r => r.json());

      await client.replyMessage(ev.replyToken, {
        type: 'text',
        text: resp.output ?? '回答が取得できませんでした。',
      });
    }
  }
  res.status(200).json({ status: 'ok' });
}
