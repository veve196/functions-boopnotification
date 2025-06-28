import { Client, Databases } from 'node-appwrite';
import { formatMessage } from './helper.js';

export default async ({ req, res, log, error }: any) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT!)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  let boops;

  try {
    boops = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_COLLECTION_ID!,
      process.env.APPWRITE_DOCUMENT_ID!
    );
  } catch (err) {
    error(err);
    return res.json(
      { ok: false, message: 'Failed to retrieve current boop count.' },
      500
    );
  }

  const prevBoops = boops.previousCount || 0;
  const totalBoops = boops.count || 0;
  const todayBoops = totalBoops - prevBoops;
  let template: string;

  if (todayBoops === 0) {
    template =
      process.env.MESSAGE_NO_BOOPS ||
      'No boops for you today, you stupid little bitch.';
  } else if (todayBoops === 1) {
    template = process.env.MESSAGE_SINGLE_BOOP || 'You got booped once today!';
  } else {
    template =
      process.env.MESSAGE_MULTIPLE_BOOPS ||
      'You got booped {todayBoops} times today!';
  }

  const text = formatMessage(template, {
    todayBoops: todayBoops,
    totalBoops: totalBoops,
  });

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'User-Agent': 'Telegram Bot SDK',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text: `${text}\r\nYour current boop count is ${totalBoops}.`,
      disable_web_page_preview: false,
      disable_notification: false,
      reply_to_message_id: null,
      chat_id: process.env.TELEGRAM_RECIPIENT_ID,
    }),
  };

  try {
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_NOTIFICATIONS_TOKEN}/sendMessage`,
      options
    );
    const tgResult = await tgResponse.json();

    if (!tgResponse.ok) {
      error(tgResult);
      return res.json(
        { ok: false, message: 'Failed to send message via telegram api.' },
        500
      );
    }
  } catch (err) {
    error(err);
    return res.json(
      { ok: false, message: 'Failed to send message via telegram api.' },
      500
    );
  }

  try {
    await databases.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_COLLECTION_ID!,
      process.env.APPWRITE_DOCUMENT_ID!,
      {
        previousCount: totalBoops,
      }
    );
  } catch (err) {
    error(err);
    return res.json(
      { ok: false, message: 'Failed to update previous boop count.' },
      500
    );
  }

  return res.json(
    { ok: true, message: 'Boop notification sent sucessfully.' },
    200
  );
};
