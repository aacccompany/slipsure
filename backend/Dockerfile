FROM python:3.11-slim

WORKDIR /app

# ติดตั้ง System Libraries สำหรับ OpenCV และ PyZbar
# เปลี่ยนจาก libgl1-mesa-glx เป็น libgl1
RUN apt-get update && apt-get install -y \
    build-essential \
    libzbar0 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# รัน Backend
CMD ["python", "main.py"]
