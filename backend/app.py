import os
import gradio as gr
import torch
import timm
from PIL import Image
from torchvision import transforms
from huggingface_hub import hf_hub_download

# Penanganan kondisional modul spaces (khusus HuggingFace ZeroGPU)
try:
    import spaces
    HAS_SPACES = True
except ImportError:
    HAS_SPACES = False

# ==========================================
# 1. LOGIKA PEMANGGILAN MODEL 3 TINGKAT
# ==========================================
NAMA_FILE_MODEL = "best_model_convnextv2_base copy.pth"

# Path 1: Folder outputs/models/ proyek laptop lokal
LOCAL_PATH_1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../outputs/models", NAMA_FILE_MODEL))
# Path 2: Folder demo-app/models/
LOCAL_PATH_2 = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", NAMA_FILE_MODEL))

if os.path.exists(LOCAL_PATH_1):
    print(f" [OK] Menggunakan model lokal dari: {LOCAL_PATH_1}")
    model_path = LOCAL_PATH_1
elif os.path.exists(LOCAL_PATH_2):
    print(f" [OK] Menggunakan model lokal dari: {LOCAL_PATH_2}")
    model_path = LOCAL_PATH_2
else:
    print(" [INFO] Model lokal tidak ditemukan. Men-download dari Hugging Face Hub...")
    model_path = hf_hub_download(
        repo_id="Faaris21/fire-drone-detection-base",
        filename=NAMA_FILE_MODEL
    )

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f" Device yang digunakan: {device}")

# Inisialisasi arsitektur convnextv2_base dari timm dengan 1 kelas output (binary classification)
model = timm.create_model('convnextv2_base', pretrained=False, num_classes=1)

# Load bobot hasil training
model.load_state_dict(torch.load(model_path, map_location=device))
model.to(device)
model.eval()

# ==========================================
# 2. PREPROCESSING GAMBAR
# ==========================================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# ==========================================
# 3. FUNGSI PREDIKSI
# ==========================================
def prediksi_core(img):
    if img is None:
        return {"Error": 0.0}

    # Ubah gambar ke format RGB & Tensor
    img = img.convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(tensor)
        prob_fire = float(torch.sigmoid(output)[0][0])
        prob_nofire = 1.0 - prob_fire

    return {
        "🔥 Terdeteksi Asap / Api": prob_fire,
        "🌲 Aman / Tidak Ada Api": prob_nofire
    }

# Gunakan dekorator spaces.GPU jika berjalan di HuggingFace Space
if HAS_SPACES:
    prediksi = spaces.GPU(prediksi_core)
else:
    prediksi = prediksi_core

# ==========================================
# 4. BANGUN INTERFACE GRADIO
# ==========================================
demo = gr.Interface(
    fn=prediksi,
    inputs=gr.Image(type="pil", label="Upload Foto / Citra Drone"),
    outputs=gr.Label(num_top_classes=2, label="Hasil Prediksi"),
    title="Backend API - Deteksi Kebakaran Hutan",
    description="Space ini berfungsi sebagai backend model ConvNeXt-V2 untuk dihubungkan ke website custom.",
    api_name="prediksi"
)

if __name__ == "__main__":
    # Jalankan server lokal di port 7860
    demo.launch(server_name="127.0.0.1", server_port=7860)
