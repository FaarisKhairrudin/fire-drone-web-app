import os
import gradio as gr
import torch
import timm
import open_clip
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
NAMA_FILE_MODEL = "best_model_convnextv2_base_TL_forestyt.pth"
MOBILECLIP_MODEL_NAME = "MobileCLIP-S1"
MOBILECLIP_PRETRAINED = "datacompdr"
FOREST_PROMPTS = [
    "a drone aerial photo of a forest canopy",
    "an aerial view of a dense forest with trees",
    "a photo of forest vegetation and green trees",
]
NON_FOREST_PROMPTS = [
    "a photo that is not a forest",
    "an urban street scene with buildings and roads",
    "a photo of a city, indoor scene, or open non-forest area",
]
FOREST_MIN_CONFIDENCE = 0.55

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
# 2. GUARD CLASSIFICATION: MOBILECLIP
# ==========================================
guard_model, _, guard_preprocess = open_clip.create_model_and_transforms(
    MOBILECLIP_MODEL_NAME,
    pretrained=MOBILECLIP_PRETRAINED,
)
guard_model = guard_model.to(device)
guard_model.eval()
guard_tokenizer = open_clip.get_tokenizer(MOBILECLIP_MODEL_NAME)


def build_guard_text_features():
    prompt_groups = [FOREST_PROMPTS, NON_FOREST_PROMPTS]
    class_features = []

    with torch.no_grad():
        for prompts in prompt_groups:
            tokens = guard_tokenizer(prompts).to(device)
            text_features = guard_model.encode_text(tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            class_features.append(text_features.mean(dim=0))

    stacked = torch.stack(class_features)
    return stacked / stacked.norm(dim=-1, keepdim=True)


guard_text_features = build_guard_text_features()

# ==========================================
# 3. PREPROCESSING GAMBAR
# ==========================================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# ==========================================
# 4. FUNGSI GUARD DAN PREDIKSI
# ==========================================
def validate_forest_image(img):
    if img is None:
        raise gr.Error("Tidak ada gambar yang diunggah.")

    img = img.convert("RGB")
    tensor = guard_preprocess(img).unsqueeze(0).to(device)

    with torch.no_grad():
        image_features = guard_model.encode_image(tensor)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        logits = guard_model.logit_scale.exp() * image_features @ guard_text_features.T
        probabilities = logits.softmax(dim=-1)[0]

    forest_probability = float(probabilities[0])
    non_forest_probability = float(probabilities[1])

    if non_forest_probability >= forest_probability or forest_probability < FOREST_MIN_CONFIDENCE:
        raise gr.Error(
            "Gambar ditolak: input tidak terdeteksi sebagai foto forest. "
            f"Skor forest hanya {forest_probability:.2%}."
        )

    return forest_probability, non_forest_probability


def prediksi_core(img):
    if img is None:
        return {"Error": 0.0}

    validate_forest_image(img)

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
# 5. BANGUN INTERFACE GRADIO
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
    # Jalankan server di 0.0.0.0 agar bisa diakses oleh Cloud / Hugging Face
    demo.launch(server_name="0.0.0.0", server_port=7860)
