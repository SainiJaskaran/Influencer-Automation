function generateMessage(template, data) {

  let message = template;

  for (const key in data) {

    const value = data[key];

    message = message.replace(
      new RegExp(`{${key}}`, "g"),
      value
    );
  }

  return message;
}

module.exports = generateMessage;