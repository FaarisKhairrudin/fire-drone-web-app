# Drone Forest Vision - Web Application

Aplikasi web klasifikasi deteksi kebakaran hutan menggunakan model ConvNeXt-V2 (React + Vite & Python Gradio API).

## Prasyarat
- Node.js (v18+)
- Python 3.12 (untuk mode backend lokal)

---

## Panduan Menjalankan Aplikasi

Langkah pertama, clone repository ini terlebih dahulu:
```bash
git clone https://github.com/FaarisKhairrudin/fire-drone-web-app.git
cd fire-drone-web-app
```

### Mode 1: Cloud Mode (Backend Hugging Face Space + Frontend)
Gunakan mode ini jika tidak ingin menjalankan backend Python di laptop.

1. Masuk ke folder frontend dan install dependensi:
   ```bash
   cd frontend
   npm install
   ```

2. Buka folder `frontend` dan buat file `.env`:
   - Copy file `.env.example` menjadi `.env`
   - Buka file `.env` yang baru dibuat.
   - Isi `VITE_HF_TOKEN` dengan token Hugging Face Anda jika ingin menggunakan Cloud Mode tanpa limit (opsional). 
     > **Cara mendapatkan token Hugging Face:** 
     > 1. Buat akun / login di [huggingface.co](https://huggingface.co/)
     > 2. Buka **Settings** -> **Access Tokens**
     > 3. Klik **Create new token**
     > 4. Pada pilihan **Token Type**, pilih **Read** (ini sudah cukup untuk menjalankan model).
     > 5. Beri nama token, klik create, dan copy token tersebut.

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
