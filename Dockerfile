
FROM python:3.12-slim

WORKDIR /app

COPY . .

EXPOSE 80

CMD ["sh", "-c", "python server.py ${PORT:-80}"]
