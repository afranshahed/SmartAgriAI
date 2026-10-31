FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH=models/plant_disease_efficientnet.keras \
    LABELS_PATH=models/class_names.txt \
    USE_EFFICIENTNET_PREPROCESS=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
# Copy the real inference artifacts explicitly. Keep these paths in sync with
# MODEL_PATH/LABELS_PATH so a Docker build cannot silently omit the model.
COPY models/plant_disease_efficientnet.keras models/plant_disease_model.h5 models/class_names.txt models/labels.json ./models/

EXPOSE 8001

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8001}\""]
