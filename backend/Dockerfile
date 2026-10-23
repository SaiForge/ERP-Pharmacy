# Single-stage: python:3.12-slim with uv for fast installs
FROM python:3.12-slim

WORKDIR /app

# Install uv (ultra-fast installer)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into system Python (no venv needed — pre-built wheels for 3.12)
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy backend application source
COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
