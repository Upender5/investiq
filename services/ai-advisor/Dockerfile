FROM python:3.12-slim AS base

WORKDIR /app

RUN addgroup --system investiq && adduser --system --ingroup investiq investiq

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

RUN chown -R investiq:investiq /app
USER investiq

EXPOSE 9001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9001"]
