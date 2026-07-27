import gradio as gr
import torch
import timm
from PIL import Image
from torchvision import transforms
from huggingface_hub import hf_hub_download

# ==========================================
# 1. DOWNLOAD & LOAD MODEL DARI REPO KAMU
# ==========================================
# PENTING: Ganti 'nama_file_modelmu.pth' sesuai dengan nama file asli
# yang kamu upload di repo Faaris21/fire-drone-detection-base (misal: best.pt, model.pth, dsb.)
NAMA_FILE_MODEL = "best_model_convnextv2_base copy.pth"

model_path = hf_hub_download(
    repo_id="Faaris21/fire-drone-detection-base",
    filename=NAMA_FILE_MODEL
)

device = torch.device("cpu")

# Inisialisasi arsitektur convnextv2_base dari timm dengan 2 kelas output
model = timm.create_model('convnextv2_base', pretrained=False, num_classes=2)

# Load bobot hasil training kamu
model.load_state_dict(torch.load(model_path, map_location=device))
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
# 3. FUNGSI PREDIKSI (YANG AKAN JADI API)
# ==========================================
def prediksi(img):
    if img is None:
        return {"Error": 0.0}

    # Ubah gambar ke format RGB & Tensor
    img = img.convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(tensor)
        probs = torch.softmax(output, dim=1)[0]

    # Format return dictionary ini yang akan dikirim sebagai JSON saat API dipanggil
    # Catatan: Sesuaikan urutan [1] dan [0] dengan index kelas saat kamu training
    return {
        "🔥 Terdeteksi Asap / Api": float(probs[1]),
        "🌲 Aman / Tidak Ada Api": float(probs[0])
    }

# ==========================================
# 4. BANGUN INTERFACE GRADIO
# ==========================================
# Gradio otomatis akan membuatkan REST API endpoint "/predict" dari fungsi di atas
demo = gr.Interface(
    fn=prediksi,
    inputs=gr.Image(type="pil", label="Upload Foto / Citra Drone"),
    outputs=gr.Label(num_top_classes=2, label="Hasil Prediksi"),
    title="Backend API - Deteksi Kebakaran Hutan",
    description="Space ini berfungsi sebagai backend model ConvNeXt-V2 untuk dihubungkan ke website custom."
)

if __name__ == "__main__":
    demo.launch()
