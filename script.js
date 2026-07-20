document.addEventListener("DOMContentLoaded", () => {
const bookingDateInput = document.querySelector("#bookingDate");
const datetimeInput = document.querySelector("#datetime");
const timeSlots = document.querySelector("#timeSlots");
const availabilityMessage = document.querySelector(
  "#availabilityMessage"
);

let selectedDateDisplay = "";
let selectedDateApi = "";

function formatDateForApi(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForForm(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

async function loadAvailableSlots(date) {
  if (!timeSlots || !availabilityMessage) return;

  timeSlots.innerHTML = "";
  availabilityMessage.textContent = "Проверяем свободное время…";

  try {
    const response = await fetch(
      `/api/availability?date=${encodeURIComponent(date)}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Ошибка загрузки времени");
    }

    const availableSlots = result.slots.filter(
      (slot) => slot.available
    );

    if (availableSlots.length === 0) {
      availabilityMessage.textContent =
        "На эту дату свободного времени нет.";
      return;
    }

    availabilityMessage.textContent =
      "Выберите подходящее время:";

    result.slots.forEach((slot) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "time-slot";
      button.textContent = slot.time;

      if (!slot.available) {
        button.disabled = true;
        button.classList.add("busy");
        button.title = "Это время занято";
      }

      button.addEventListener("click", () => {
        document
          .querySelectorAll(".time-slot")
          .forEach((item) => item.classList.remove("selected"));

        button.classList.add("selected");

        datetimeInput.value =
          `${selectedDateDisplay} ${slot.time}`;
      });

      timeSlots.appendChild(button);
    });
  } catch (error) {
    console.error(error);

    availabilityMessage.textContent =
      "Не удалось загрузить свободное время. Попробуйте ещё раз.";
  }
}

if (
  typeof flatpickr !== "undefined" &&
  bookingDateInput
) {
  flatpickr(bookingDateInput, {
    locale: "ru",
    minDate: "today",
    dateFormat: "d.m.Y",
    disableMobile: true,

    onChange(selectedDates) {
      const selectedDate = selectedDates[0];

      if (!selectedDate) return;

      selectedDateApi = formatDateForApi(selectedDate);
      selectedDateDisplay = formatDateForForm(selectedDate);

      if (datetimeInput) {
        datetimeInput.value = "";
      }

      loadAvailableSlots(selectedDateApi);
    }
  });
}

  const header = document.querySelector("#header");
  const menuBtn = document.querySelector("#menuBtn");
  const nav = document.querySelector("#nav");
  const topBtn = document.querySelector("#topBtn");
  const bookingForm = document.querySelector("#bookingForm");

  window.addEventListener("scroll", () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 70);
    if (topBtn) topBtn.classList.toggle("visible", window.scrollY > 600);
  });

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => nav.classList.remove("open"))
    );
  }

  if (topBtn) {
    topBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const data = new FormData(bookingForm);

    const payload = {
    name: data.get("name"),
    phone: data.get("phone").replace(/\D/g, ""),
        players: data.get("players"),
        age: data.get("age"),
        datetime: data.get("datetime"),
        comment: data.get("comment")
      };

      try {
        const response = await fetch("/api/booking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        alert(result.message);

        if (response.ok) {
          bookingForm.reset();
        }
      } catch (error) {
        alert("Ошибка отправки. Попробуйте ещё раз.");
      }
    });
  }

  document.querySelectorAll(".acc-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;

      if (!panel) return;

      button.classList.toggle("active");
      panel.classList.toggle("open");
    });
  });
  const phoneInput = document.querySelector("#phone");

if (phoneInput) {

    phoneInput.addEventListener("input", function (e) {

        let value = this.value.replace(/\D/g, "");

        if (value.startsWith("7")) {
            value = value.substring(1);
        }

        if (value.startsWith("8")) {
            value = value.substring(1);
        }

        value = value.substring(0, 10);

        let result = "+7";

        if (value.length > 0)
            result += " (" + value.substring(0, 3);

        if (value.length >= 3)
            result += ") " + value.substring(3, 6);

        if (value.length >= 6)
            result += "-" + value.substring(6, 8);

        if (value.length >= 8)
            result += "-" + value.substring(8, 10);

        this.value = result;
    });
  }
});