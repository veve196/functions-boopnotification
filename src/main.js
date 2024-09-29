import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  let boops;

  try {
    boops = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      process.env.APPWRITE_DOCUMENT_ID
    );
  } catch (err) {
    error(err);
  }

  const prevCount = boops.previousCount || 0;
  const curCount = boops.count || 0;
  const boopDif = curCount - prevCount;
  let text;

  if (boopDif === 0) {
    text = 'No boops for you today, you stupid little bitch.';
  } else if (boopDif === 1) {
    text = 'You got booped once today!';
  } else {
    text = `You got booped ${boopDif} times today!`;
  }

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'User-Agent': 'Telegram Bot SDK',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      text: `${text}\r\nYour current boop count is ${curCount}.`,
      disable_web_page_preview: false,
      disable_notification: false,
      reply_to_message_id: null,
      chat_id: process.env.TELEGRAM_USER_ID,
    }),
  };

  try {
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_NOTIFICATIONS_TOKEN}/sendMessage`,
      options
    )
      .then((response) => response.json())
      .then((response) => log(response))
      .catch((err) => error(err));

    await database.updateDocument('web', 'counters', 'veveBoops', {
      previousCount: curCount,
    });
  } catch (err) {
    error(err);
  }

  return res.empty();
};
