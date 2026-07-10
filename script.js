document.addEventListener("DOMContentLoaded", () => {
  if (typeof flatpickr !== "undefined") {
    flatpickr("#datetime", {
      locale: "ru",
      enableTime: true,
      time_24hr: true,
      minuteIncrement: 30,
      minDate: "today",
      minTime: "11:00",
      maxTime: "21:00",
      dateFormat: "d.m.Y H:i",
      disableMobile: true
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