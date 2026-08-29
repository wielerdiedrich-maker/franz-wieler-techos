"use strict";

const menuButton = document.querySelector("[data-nav-toggle]");
const navigation = document.querySelector("[data-nav]");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navigation.dataset.open = String(!isOpen);
  });

  navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      navigation.dataset.open = "false";
    });
  });
}

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = new Date().getFullYear();

const form = document.querySelector("[data-contact-form]");
const message = document.querySelector("[data-form-message]");
if (form && message) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "Thanks — this demo form is ready to connect to your form provider or email service.";
    form.reset();
  });
}
