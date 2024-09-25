import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  let boops;

  try {
    boops = await database.getDocument('web', 'counters', 'veveBoops');
  } catch (err) {
    error(err);
    return res.send(500);
  }

  const prevCount = boops.previousCount || 0;
  const curCount = boops.count || 0;

  if (prevCount == curCount) return res.empty();

  const boopDif = curCount - prevCount;
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'User-Agent': 'Telegram Bot SDK',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text: `You got booped ${boopDif} times today! Your current boop count is ${curCount}.`,
      parse_mode: 'Optional',
      disable_web_page_preview: false,
      disable_notification: false,
      reply_to_message_id: null,
      chat_id: process.env.TELEGRAM_VEVE_ID,
    }),
  };

  try {
    fetch(
      `https://api.telegram.org/${process.env.TELEGRAM_NOTIFICATIONS_TOKEN}/sendMessage`,
      options
    )
      .then((response) => response.json())
      .then((response) => log(response))
      .catch((err) => error(err));

    await database.updateDocument('web', 'counters', 'veveBoops', {
      previousCount: curCount,
    });

    return res.send(200);
  } catch (err) {
    error(err);
    return res.send(500);
  }
};
