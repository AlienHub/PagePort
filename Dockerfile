FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY examples ./examples
COPY docs ./docs
COPY skill ./skill
COPY README.md ./

ENV HOST=0.0.0.0
ENV PORT=4123

EXPOSE 4123

CMD ["node", "server.js"]
