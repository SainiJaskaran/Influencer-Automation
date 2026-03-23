const generateMessage = require("./utils/messageTemplate");

const template = `
Hi {name},

I came across your {niche} content and really liked your posts.

Would you be open to discussing a potential collaboration?
`;

const message = generateMessage(template, {
  name: "navnoor",
  niche: "skincare"
});

console.log(message);   