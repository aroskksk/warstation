const TIMEZONE_OFFSET = "+10:00";
const OPENING_HOUR = 11;
const CLOSING_HOUR = 21;
const SLOT_DURATION_MINUTES = 60;

function pad(value) {
  return String(value).padStart(2, "0");
}

function createArenaDate(date, hours, minutes = 0) {
  return new Date(
    `${date}T${pad(hours)}:${pad(minutes)}:00${TIMEZONE_OFFSET}`
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      message: "Метод не разрешён."
    });
  }

  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Некорректная дата."
      });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

    if (!GOOGLE_API_KEY || !CALENDAR_ID) {
      console.error("Не настроены GOOGLE_API_KEY или GOOGLE_CALENDAR_ID.");

      return res.status(500).json({
        message: "Календарь временно недоступен."
      });
    }

    const dayStart = createArenaDate(date, OPENING_HOUR);
    const dayEnd = createArenaDate(date, CLOSING_HOUR);

    const calendarUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        CALENDAR_ID
      )}/events`
    );

    calendarUrl.searchParams.set("key", GOOGLE_API_KEY);
    calendarUrl.searchParams.set("timeMin", dayStart.toISOString());
    calendarUrl.searchParams.set("timeMax", dayEnd.toISOString());
    calendarUrl.searchParams.set("singleEvents", "true");
    calendarUrl.searchParams.set("orderBy", "startTime");

    const calendarResponse = await fetch(calendarUrl.toString());
    const calendarData = await calendarResponse.json();

    if (!calendarResponse.ok) {
      console.error("Ошибка Google Calendar:", calendarData);

      return res.status(500).json({
        message: "Не удалось получить свободное время."
      });
    }

    const events = Array.isArray(calendarData.items)
      ? calendarData.items
      : [];

    const busyIntervals = events
      .filter((event) => event.start?.dateTime && event.end?.dateTime)
      .map((event) => ({
        start: new Date(event.start.dateTime).getTime(),
        end: new Date(event.end.dateTime).getTime()
      }));

    const slots = [];

    for (
      let hour = OPENING_HOUR;
      hour < CLOSING_HOUR;
      hour += SLOT_DURATION_MINUTES / 60
    ) {
      const slotStart = createArenaDate(date, hour);
      const slotEnd = new Date(
        slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000
      );

      const isBusy = busyIntervals.some((event) => {
        return (
          slotStart.getTime() < event.end &&
          slotEnd.getTime() > event.start
        );
      });

      slots.push({
        time: `${pad(hour)}:00`,
        available: !isBusy
      });
    }

    return res.status(200).json({
      date,
      slots
    });
  } catch (error) {
    console.error("Ошибка availability API:", error);

    return res.status(500).json({
      message: "Ошибка сервера."
    });
  }
}