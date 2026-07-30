# Drone Forest Vision - Web Application

Aplikasi web klasifikasi deteksi kebakaran hutan menggunakan model ConvNeXt-V2 (React + Vite & Python Gradio API).

## Prasyarat
- Node.js (v18+)
- Python 3.12 (untuk mode backend lokal)

---

## Panduan Menjalankan Aplikasi

### Mode 1: Cloud Mode (Backend Hugging Face Space + Frontend)
Gunakan mode ini jika tidak ingin menjalankan backend Python di laptop.

1. Masuk ke folder frontend dan install dependensi:
   ```bash
   cd frontend
   npm install
   ```

2. Buat file `.env` (opsional):
   ```bash
   cp .env.example .env
   ```
   Isi `VITE_HF_TOKEN` dengan token Hugging Face Anda jika ada.

3. Jalankan aplikasi frontend:
   ```bash
   npm run dev
   ```

Akses aplikasi di browser: `http://localhost:3000`

---

### Mode 2: Local Mode (Backend Python Laptop + Frontend)
Gunakan mode ini untuk inferensi offline, tanpa batas kuota, dan lebih cepat.

1. Install dependensi backend Python:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Jalankan server backend Python:
   ```bash
   python app.py
   ```
   (Backend lokal berjalan di `http://127.0.0.1:7860`)

3. Buka terminal baru, lalu jalankan frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Frontend akan otomatis mendeteksi dan menggunakan backend lokal di laptop Anda.
