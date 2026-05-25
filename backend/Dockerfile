# ============================================================
# Odonto-Oracle Backend — Dockerfile para Google Cloud Run
# ============================================================
# Base: Python 3.10 slim para imagen compacta y rápida

FROM python:3.10-slim

# Metadatos
LABEL maintainer="Odonto-Oracle Hackathon Team"
LABEL description="FastAPI backend del CDSS clínico Odonto-Oracle"
LABEL version="2.0.0"

# Evita mensajes interactivos de apt y asegura Python sin buffer
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar primero requirements para aprovechar la caché de capas de Docker
COPY requirements.txt .

# Instalar dependencias del sistema necesarias para algunas librerías Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código fuente
COPY . .

# Crear directorio de PDFs estáticos para que FastAPI pueda servir archivos
RUN mkdir -p /app/static/pdfs

# Cloud Run asigna el puerto a través de la variable de entorno PORT (default 8080)
ENV PORT=8080

# Exponer el puerto para Cloud Run
EXPOSE 8080

# Comando de arranque: Uvicorn escucha en 0.0.0.0 en el puerto de Cloud Run
# --workers 1 es recomendado para Cloud Run (escala horizontalmente con instancias)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
