import gradio as gr
import torch
import timm
from PIL import Image
from torchvision import transforms
from huggingface_hub import hf_hub_download
import spaces

# ==========================================
# 1. DOWNLOAD & LOAD MODEL DARI REPO KAMU
# ==========================================
NAMA_FILE_MODEL = "best_model_convnextv2_base copy.pth"

model_path = hf_hub_download(
    repo_id="Faaris21/fire-drone-detection-base",
    filename=NAMA_FILE_MODEL
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Inisialisasi arsitektur convnextv2_base dari timm dengan 1 kelas output (binary classification)
model = timm.create_model('convnextv2_base', pretrained=False, num_classes=1)

# Load bobot hasil training kamu
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
# 3. FUNGSI PREDIKSI (YANG AKAN JADI API)
# ==========================================
@spaces.GPU
def prediksi(img):
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

