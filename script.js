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
  const revealItems = document.querySelectorAll(".reveal");
  const bookingForm = document.querySelector("#bookingForm");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("active");
    });
  }, { threshold: 0.15 });

  revealItems.forEach((item) => observer.observe(item));

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
        phone: data.get("phone"),
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

        if (!response.ok) {
          alert(result.message);
          return;
        }

        alert(result.message);
        bookingForm.reset();
      } catch (error) {
        alert("Ошибка отправки. Попробуйте ещё раз.");
      }
    });
  }

  const accButtons = document.querySelectorAll(".acc-btn");

  accButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;

      if (!panel) return;

      button.classList.toggle("active");
      panel.classList.toggle("open");
    });
  });
});