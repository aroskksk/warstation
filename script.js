document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     ОСНОВНЫЕ ЭЛЕМЕНТЫ
  ========================= */

  const header = document.querySelector("#header");
  const menuBtn = document.querySelector("#menuBtn");
  const nav = document.querySelector("#nav");
  const topBtn = document.querySelector("#topBtn");

  const bookingForm = document.querySelector("#bookingForm");
  const bookingDuration = document.querySelector("#bookingDuration");
  const bookingDateInput = document.querySelector("#bookingDate");
  const datetimeInput = document.querySelector("#datetime");

  const timeSlots = document.querySelector("#timeSlots");
  const availabilityMessage = document.querySelector(
    "#availabilityMessage"
  );

  const phoneInput = document.querySelector("#phone");

  let selectedDateApi = "";
  let selectedDateDisplay = "";
  let bookingDatePicker = null;

  /* =========================
     ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  ========================= */

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateForApi(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function formatDateForForm(date) {
    return [
      pad(date.getDate()),
      pad(date.getMonth() + 1),
      date.getFullYear()
    ].join(".");
  }

  function getDurationLabel(duration) {
    const labels = {
      60: "1 час",
      90: "1,5 часа",
      120: "2 часа",
      180: "3 часа"
    };

    return labels[duration] || `${duration} минут`;
  }

  function clearSelectedTime() {
    if (datetimeInput) {
      datetimeInput.value = "";
    }

    document.querySelectorAll(".time-slot").forEach((button) => {
      button.classList.remove("selected");
    });
  }

  function clearTimeSlots(message) {
    if (timeSlots) {
      timeSlots.innerHTML = "";
    }

    if (availabilityMessage) {
      availabilityMessage.textContent = message;
    }

    clearSelectedTime();
  }

  function setDateInputEnabled(enabled) {
    if (!bookingDateInput) return;

    bookingDateInput.disabled = !enabled;

    if (bookingDatePicker && bookingDatePicker._input) {
      bookingDatePicker._input.disabled = !enabled;
    }

    bookingDateInput.placeholder = enabled
      ? "Выберите дату"
      : "Сначала выберите продолжительность";
  }

  /* =========================
     ЗАГРУЗКА СВОБОДНОГО ВРЕМЕНИ
  ========================= */

  async function loadAvailableSlots(date) {
    if (
      !timeSlots ||
      !availabilityMessage ||
      !bookingDuration ||
      !datetimeInput
    ) {
      return;
    }

    const duration = Number(bookingDuration.value);

    if (!duration) {
      clearTimeSlots(
        "Сначала выберите продолжительность бронирования."
      );
      return;
    }

    clearSelectedTime();
    timeSlots.innerHTML = "";
    availabilityMessage.textContent =
      "Проверяем свободное время…";

    try {
      const query = new URLSearchParams({
        date,
        duration: String(duration)
      });

      const response = await fetch(
        `/api/availability?${query.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Не удалось загрузить свободное время."
        );
      }

      if (!Array.isArray(result.slots)) {
        throw new Error("Сервер вернул некорректный список времени.");
      }

      const availableSlots = result.slots.filter(
        (slot) => slot.available
      );

      if (availableSlots.length === 0) {
        availabilityMessage.textContent =
          "На эту дату нет подходящего свободного времени.";
        return;
      }

      availabilityMessage.textContent =
        `Выберите время начала. Продолжительность: ${
          result.durationLabel || getDurationLabel(duration)
        }`;

      result.slots.forEach((slot) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "time-slot";
        button.textContent = slot.time;
        button.dataset.time = slot.time;

        if (!slot.available) {
          button.disabled = true;
          button.classList.add("busy");
          button.title =
            "Этот промежуток занят или времени до закрытия недостаточно";
        }

        button.addEventListener("click", () => {
          document
            .querySelectorAll(".time-slot")
            .forEach((item) => {
              item.classList.remove("selected");
            });

          button.classList.add("selected");

          datetimeInput.value =
            `${selectedDateDisplay} ${slot.time}`;
        });

        timeSlots.appendChild(button);
      });
    } catch (error) {
      console.error("Ошибка загрузки времени:", error);

      clearTimeSlots(
        error.message ||
          "Не удалось загрузить свободное время. Попробуйте ещё раз."
      );
    }
  }

  /* =========================
     КАЛЕНДАРЬ
  ========================= */

  if (
    typeof flatpickr !== "undefined" &&
    bookingDateInput
  ) {
    bookingDatePicker = flatpickr(bookingDateInput, {
      locale: "ru",
      minDate: "today",
      dateFormat: "d.m.Y",
      disableMobile: true,
      allowInput: false,

      onChange(selectedDates) {
        const selectedDate = selectedDates[0];

        if (!selectedDate) {
          selectedDateApi = "";
          selectedDateDisplay = "";

          clearTimeSlots("Выберите дату.");
          return;
        }

        selectedDateApi = formatDateForApi(selectedDate);
        selectedDateDisplay = formatDateForForm(selectedDate);

        loadAvailableSlots(selectedDateApi);
      }
    });

    setDateInputEnabled(Boolean(bookingDuration?.value));
  }

  /* =========================
     ВЫБОР ПРОДОЛЖИТЕЛЬНОСТИ
  ========================= */

  if (bookingDuration) {
    bookingDuration.addEventListener("change", () => {
      clearSelectedTime();

      if (!bookingDuration.value) {
        setDateInputEnabled(false);

        selectedDateApi = "";
        selectedDateDisplay = "";

        if (bookingDatePicker) {
          bookingDatePicker.clear();
        }

        clearTimeSlots(
          "Сначала выберите продолжительность и дату."
        );

        return;
      }

      setDateInputEnabled(true);

      if (selectedDateApi) {
        loadAvailableSlots(selectedDateApi);
      } else {
        clearTimeSlots("Теперь выберите дату.");
      }
    });
  }

  /* =========================
     HEADER И КНОПКА НАВЕРХ
  ========================= */

  function updatePageControls() {
    if (header) {
      header.classList.toggle(
        "scrolled",
        window.scrollY > 70
      );
    }

    if (topBtn) {
      topBtn.classList.toggle(
        "visible",
        window.scrollY > 600
      );
    }
  }

  window.addEventListener("scroll", updatePageControls);
  updatePageControls();

  if (topBtn) {
    topBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  /* =========================
     МОБИЛЬНОЕ МЕНЮ
  ========================= */

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      nav.classList.toggle("open");

      const isOpen = nav.classList.contains("open");

      menuBtn.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      const clickedInsideMenu =
        nav.contains(event.target) ||
        menuBtn.contains(event.target);

      if (!clickedInsideMenu) {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* =========================
     АККОРДЕОНЫ
  ========================= */

  document.querySelectorAll(".acc-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;

      if (!panel) return;

      const willOpen = !panel.classList.contains("open");

      button.classList.toggle("active", willOpen);
      panel.classList.toggle("open", willOpen);

      button.setAttribute(
        "aria-expanded",
        String(willOpen)
      );
    });
  });

  /* =========================
     МАСКА ТЕЛЕФОНА
  ========================= */

  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      let value = this.value.replace(/\D/g, "");

      if (value.startsWith("7") || value.startsWith("8")) {
        value = value.substring(1);
      }

      value = value.substring(0, 10);

      let result = "+7";

      if (value.length > 0) {
        result += ` (${value.substring(0, 3)}`;
      }

      if (value.length >= 3) {
        result += `) ${value.substring(3, 6)}`;
      }

      if (value.length >= 6) {
        result += `-${value.substring(6, 8)}`;
      }

      if (value.length >= 8) {
        result += `-${value.substring(8, 10)}`;
      }

      this.value = result;
    });

    phoneInput.addEventListener("focus", function () {
      if (!this.value) {
        this.value = "+7";
      }
    });

    phoneInput.addEventListener("blur", function () {
      if (this.value === "+7") {
        this.value = "";
      }
    });
  }

  /* =========================
     ОТПРАВКА БРОНИРОВАНИЯ
  ========================= */

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton =
        bookingForm.querySelector('button[type="submit"]');

      const data = new FormData(bookingForm);

      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "")
        .replace(/\D/g, "");
      const players = Number(data.get("players"));
      const age = Number(data.get("age"));
      const duration = Number(data.get("duration"));
      const datetime = String(
        data.get("datetime") || ""
      ).trim();
      const comment = String(
        data.get("comment") || ""
      ).trim();

      if (!duration) {
        alert("Выберите продолжительность бронирования.");
        bookingDuration?.focus();
        return;
      }

      if (!selectedDateApi) {
        alert("Выберите дату бронирования.");
        bookingDateInput?.focus();
        return;
      }

      if (!datetime) {
        alert("Выберите свободное время.");
        return;
      }

      if (phone.length !== 11 || !phone.startsWith("7")) {
        alert("Введите корректный номер телефона.");
        phoneInput?.focus();
        return;
      }

      const payload = {
        name,
        phone,
        players,
        age,
        duration,
        datetime,
        comment
      };

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Отправляем…";
        }

        const response = await fetch("/api/booking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 409 && selectedDateApi) {
            await loadAvailableSlots(selectedDateApi);
          }

          throw new Error(
            result.message ||
              "Не удалось отправить заявку."
          );
        }

        alert(
          result.message ||
            "Заявка отправлена! Мы скоро свяжемся с вами."
        );

        bookingForm.reset();

        selectedDateApi = "";
        selectedDateDisplay = "";

        if (bookingDatePicker) {
          bookingDatePicker.clear();
        }

        setDateInputEnabled(false);

        clearTimeSlots(
          "Сначала выберите продолжительность и дату."
        );
      } catch (error) {
        console.error("Ошибка отправки формы:", error);

        alert(
          error.message ||
            "Ошибка отправки. Попробуйте ещё раз."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Забронировать";
        }
      }
    });
  }
});