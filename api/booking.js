const ALLOWED_DURATIONS = [60, 90, 120, 180];

function getDurationLabel(duration) {
  const labels = {
    60: "1 час",
    90: "1,5 часа",
    120: "2 часа",
    180: "3 часа"
  };

  return labels[duration] || `${duration} минут`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      message: "Метод не разрешён."
    });
  }

  try {
    const {
      name,
      phone,
      players,
      age,
      duration,
      datetime,
      comment = ""
    } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").replace(/\D/g, "");
    const playersNumber = Number(players);
    const ageNumber = Number(age);
    const durationMinutes = Number(duration);
    const cleanDatetime = String(datetime || "").trim();
    const cleanComment = String(comment || "").trim();

    /* =========================
       ПРОВЕРКА ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
    ========================= */

    if (
      !cleanName ||
      !cleanPhone ||
      !playersNumber ||
      !ageNumber ||
      !durationMinutes ||
      !cleanDatetime
    ) {
      return res.status(400).json({
        message: "Заполните все обязательные поля."
      });
    }

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({
        message: "Введите корректное имя."
      });
    }

    if (
      cleanPhone.length !== 11 ||
      !cleanPhone.startsWith("7")
    ) {
      return res.status(400).json({
        message: "Введите корректный номер телефона."
      });
    }

    if (
      !Number.isInteger(playersNumber) ||
      playersNumber < 1 ||
      playersNumber > 10
    ) {
      return res.status(400).json({
        message: "Количество игроков должно быть от 1 до 10."
      });
    }

    if (
      !Number.isInteger(ageNumber) ||
      ageNumber < 6 ||
      ageNumber > 99
    ) {
      return res.status(400).json({
        message: "Укажите корректный возраст игроков."
      });
    }

    if (!ALLOWED_DURATIONS.includes(durationMinutes)) {
      return res.status(400).json({
        message: "Выберите корректную продолжительность."
      });
    }

    if (cleanComment.length > 500) {
      return res.status(400).json({
        message: "Комментарий слишком длинный."
      });
    }

    /* =========================
       ПЕРЕМЕННЫЕ VERCEL
    ========================= */

    const {
      GOOGLE_API_KEY,
      GOOGLE_CALENDAR_ID,
      TELEGRAM_TOKEN,
      TELEGRAM_CHAT_ID,
      TIMEZONE_OFFSET = "+10:00"
    } = process.env;

    if (
      !GOOGLE_API_KEY ||
      !GOOGLE_CALENDAR_ID ||
      !TELEGRAM_TOKEN ||
      !TELEGRAM_CHAT_ID
    ) {
      console.error(
        "Не настроены переменные окружения для бронирования."
      );

      return res.status(500).json({
        message: "Сервис бронирования временно недоступен."
      });
    }

    /* =========================
       РАЗБОР ДАТЫ
    ========================= */

    const datetimeMatch = cleanDatetime.match(
      /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/
    );

    if (!datetimeMatch) {
      return res.status(400).json({
        message: "Некорректный формат даты и времени."
      });
    }

    const [, day, month, year, hours, minutes] =
      datetimeMatch;

    const start = new Date(
      `${year}-${month}-${day}T${hours}:${minutes}:00${TIMEZONE_OFFSET}`
    );

    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        message: "Выбрана некорректная дата."
      });
    }

    if (start.getTime() <= Date.now()) {
      return res.status(400).json({
        message: "Выберите будущую дату и время."
      });
    }

    const end = new Date(
      start.getTime() + durationMinutes * 60 * 1000
    );

    /* =========================
       ПРОВЕРКА ВРЕМЕНИ РАБОТЫ
    ========================= */

    const openingTime = new Date(
      `${year}-${month}-${day}T11:00:00${TIMEZONE_OFFSET}`
    );

    const closingTime = new Date(
      `${year}-${month}-${day}T21:00:00${TIMEZONE_OFFSET}`
    );

    if (
      start.getTime() < openingTime.getTime() ||
      end.getTime() > closingTime.getTime()
    ) {
      return res.status(400).json({
        message:
          "Выбранное бронирование выходит за пределы времени работы арены."
      });
    }

    /* =========================
       ПРОВЕРКА GOOGLE CALENDAR
    ========================= */

    const calendarUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        GOOGLE_CALENDAR_ID
      )}/events`
    );

    calendarUrl.searchParams.set("key", GOOGLE_API_KEY);
    calendarUrl.searchParams.set(
      "timeMin",
      start.toISOString()
    );
    calendarUrl.searchParams.set(
      "timeMax",
      end.toISOString()
    );
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");

    const calendarResponse = await fetch(
      calendarUrl.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      console.error(
        "Ошибка Google Calendar:",
        calendarData
      );

      return res.status(500).json({
        message:
          "Не удалось проверить календарь. Попробуйте позже."
      });
    }

    const events = Array.isArray(calendarData.items)
      ? calendarData.items
      : [];

    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();

    const hasConflict = events.some((event) => {
      const eventStartValue =
        event.start?.dateTime || event.start?.date;

      const eventEndValue =
        event.end?.dateTime || event.end?.date;

      if (!eventStartValue || !eventEndValue) {
        return false;
      }

      const eventStart = new Date(eventStartValue).getTime();
      const eventEnd = new Date(eventEndValue).getTime();

      if (
        Number.isNaN(eventStart) ||
        Number.isNaN(eventEnd)
      ) {
        return false;
      }

      return (
        startTimestamp < eventEnd &&
        endTimestamp > eventStart
      );
    });

    if (hasConflict) {
      return res.status(409).json({
        message:
          "Это время уже занято. Пожалуйста, выберите другое время."
      });
    }

    /* =========================
       СООБЩЕНИЕ В TELEGRAM
    ========================= */

    const durationLabel =
      getDurationLabel(durationMinutes);

    const formattedPhone =
      `+${cleanPhone}`;

    const text = [
      "🎮 Новая заявка WARSTATION",
      "",
      `👤 Имя: ${cleanName}`,
      `📞 Телефон: ${formattedPhone}`,
      `👥 Количество игроков: ${playersNumber}`,
      `🎂 Возраст участников: ${ageNumber}`,
      `📅 Дата и время: ${cleanDatetime}`,
      `⏱ Продолжительность: ${durationLabel}`,
     `🕓 Окончание: ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,

      "",
      "💬 Комментарий:",
      cleanComment || "Нет"
    ].join("\n");

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

    const telegramData =
      await telegramResponse.json();

    if (
      !telegramResponse.ok ||
      telegramData.ok !== true
    ) {
      console.error(
        "Ошибка Telegram:",
        telegramData
      );

      return res.status(500).json({
        message:
          "Не удалось отправить заявку. Попробуйте позже."
      });
    }

    return res.status(200).json({
      message:
        "Заявка отправлена! Мы скоро свяжемся с вами."
    });
  } catch (error) {
    console.error(
      "Ошибка API бронирования:",
      error
    );

    return res.status(500).json({
      message: "Ошибка сервера. Попробуйте позже."
    });
  }
}