export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Метод не разрешён" });
  }

  try {
    const { name, phone, players, age, datetime, comment } = req.body;

    if (!name || !phone || !players || !age || !datetime) {
      return res.status(400).json({
        message: "Заполните все обязательные поля."
      });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const [datePart, timePart] = datetime.split(" ");
    const [day, month, year] = datePart.split(".");

    const start = new Date(`${year}-${month}-${day}T${timePart}:00+03:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const calendarUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?key=${GOOGLE_API_KEY}` +
      `&timeMin=${start.toISOString()}` +
      `&timeMax=${end.toISOString()}` +
      `&singleEvents=true` +
      `&orderBy=startTime`;

    const calendarResponse = await fetch(calendarUrl);
    const calendarData = await calendarResponse.json();
    console.log(calendarData);
console.log("ITEMS:", calendarData.items);
console.log("COUNT:", calendarData.items?.length);
    console.log(
  "GOOGLE RESPONSE:",
  JSON.stringify(calendarData, null, 2)
);
    if (!calendarResponse.ok) {
      return res.status(500).json({
        message: "Не удалось проверить календарь. Попробуйте позже."
      });
    }

    const busyEvents = calendarData.items || [];
    console.log("CHECK FROM:", start.toISOString());
console.log("CHECK TO:", end.toISOString());
console.log("EVENTS COUNT:", busyEvents.length);
console.log("EVENTS:", busyEvents.map(e => ({
  summary: e.summary,
  start: e.start,
  end: e.end
})));
    console.log("CALENDAR DATA:", JSON.stringify(calendarData, null, 2));
console.log("BUSY EVENTS:", busyEvents.length);
console.log("CHECK FROM:", start.toISOString());
console.log("CHECK TO:", end.toISOString());


    if (busyEvents.length > 0) {
      return res.status(409).json({
        message: "Это время уже занято. Пожалуйста, выберите другое время."
      });
    }

    const text = `
🎮 Новая заявка WARSTATION

👤 Имя: ${name}
📞 Телефон: ${phone}
👥 Количество игроков: ${players}
🎂 Возраст участников: ${age}
📅 Дата и время: ${datetime}

💬 Комментарий:
${comment || "Нет"}
`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text
        })
      }
    );

    if (!telegramResponse.ok) {
      return res.status(500).json({
        message: "Не удалось отправить заявку. Попробуйте позже."
      });
    }

    return res.status(200).json({
      message: "Заявка отправлена! Мы скоро свяжемся с вами."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Ошибка сервера. Попробуйте позже."
    });
  }
}