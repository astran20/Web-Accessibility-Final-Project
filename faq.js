const supportForm = document.querySelector("#support-form");
const formResponse = document.querySelector("#form-response");

supportForm.addEventListener("submit", event => {
  event.preventDefault();

  const email = supportForm.elements.email;
  const message = supportForm.elements.message;
  const emailError = document.querySelector("#email-error");
  const messageError = document.querySelector("#message-error");
  const emailValue = email.value.trim();
  const messageValue = message.value.trim();
  let firstInvalidField = null;

  emailError.textContent = emailValue
    ? email.validity.valid ? "" : "Enter a valid email address, such as name@school.edu."
    : "Enter your school email address.";
  messageError.textContent = messageValue
    ? ""
    : "Please enter your message before submitting.";
  formResponse.textContent = "";

  for (const [field, error] of [[email, emailError], [message, messageError]]) {
    if (error.textContent) {
      error.hidden = false;
      field.setAttribute("aria-invalid", "true");
      if (!firstInvalidField) firstInvalidField = field;
    } else {
      error.hidden = true;
      field.removeAttribute("aria-invalid");
    }
  }

  if (firstInvalidField) {
    firstInvalidField.focus();
    return;
  }

  formResponse.textContent = "Demo only — your message has not been sent.";
});

supportForm.addEventListener("input", event => {
  formResponse.textContent = "";
  const error = event.target.id === "school-email"
    ? document.querySelector("#email-error")
    : event.target.id === "support-message"
      ? document.querySelector("#message-error")
      : null;
  if (error && event.target.id === "school-email") {
    const email = event.target;
    if (!email.value.trim()) {
      error.textContent = "Enter your school email address.";
      error.hidden = false;
      email.setAttribute("aria-invalid", "true");
    } else if (!email.validity.valid) {
      error.textContent = "Enter a valid email address, such as name@school.edu.";
      error.hidden = false;
      email.setAttribute("aria-invalid", "true");
    } else {
      error.textContent = "";
      error.hidden = true;
      email.removeAttribute("aria-invalid");
    }
  } else if (error && !event.target.value.trim()) {
    error.textContent = "Please enter your message before submitting.";
    error.hidden = false;
    event.target.setAttribute("aria-invalid", "true");
  } else if (error) {
    error.hidden = true;
    error.textContent = "";
    event.target.removeAttribute("aria-invalid");
  }
});
