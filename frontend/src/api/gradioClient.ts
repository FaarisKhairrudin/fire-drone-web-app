import { client } from "@gradio/client";

// Repository ID & URL HuggingFace Space Backend
export const HF_SPACE_ID = "Faaris21/fire-drone-space";
export const HF_SPACE_URL = "https://faaris21-fire-drone-space.hf.space";
export const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || "";

export interface PredictionResult {
  fireProbability: number;
  noFireProbability: number;
  latencySeconds: number;
  rawJsonString?: string;
}

let clientInstance: any = null;

/**
 * Mendapatkan atau inisialisasi koneksi Gradio Client dengan Token HF (jika ada)
 */
export async function getGradioClient() {
  if (!clientInstance) {
    try {
      clientInstance = await client(HF_SPACE_ID, {
        hf_token: HF_TOKEN ? (HF_TOKEN as `hf_${string}`) : undefined,
      });
    } catch (err) {
      console.warn("Gradio JS Client connect warn:", err);
      clientInstance = null;
    }
  }
  return clientInstance;
}

/**
 * Direct REST API Fallback untuk Gradio 5 dengan dukungan Hugging Face Bearer Auth
 */
async function predictViaRest(imageFile: Blob | File): Promise<any> {
  const commonHeaders: Record<string, string> = {};
  if (HF_TOKEN) {
    commonHeaders["Authorization"] = `Bearer ${HF_TOKEN}`;
  }

  // 1. Upload File ke endpoint /gradio_api/upload
  const formData = new FormData();
  formData.append("files", imageFile, "drone_image.jpg");

  const uploadRes = await fetch(`${HF_SPACE_URL}/gradio_api/upload`, {
    method: "POST",
    headers: commonHeaders,
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`Gagal mengunggah citra: HTTP ${uploadRes.status}`);
  }

  const uploadData = await uploadRes.json();
  const uploadedPath = Array.isArray(uploadData) ? uploadData[0] : uploadData;

  // 2. Panggil endpoint /gradio_api/call/prediksi
  const callHeaders: Record<string, string> = {
    ...commonHeaders,
    "Content-Type": "application/json",
  };

  const callRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/prediksi`, {
    method: "POST",
    headers: callHeaders,
    body: JSON.stringify({
      data: [{ path: uploadedPath, meta: { _type: "gradio.FileData" } }],
    }),
  });

  if (!callRes.ok) {
    throw new Error(`Gagal memanggil endpoint prediksi: HTTP ${callRes.status}`);
  }

  const { event_id } = await callRes.json();

  // 3. Ambil hasil dari stream SSE
  const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/prediksi/${event_id}`, {
    headers: commonHeaders,
  });

  const textOutput = await streamRes.text();

  const dataLines = textOutput.split("\n").filter((line) => line.startsWith("data:"));
  if (dataLines.length === 0) {
    throw new Error("Tidak menerima data respons dari server backend.");
  }

  const lastDataLine = dataLines[dataLines.length - 1].replace(/^data:\s*/, "");
  const parsedData = JSON.parse(lastDataLine);
  return Array.isArray(parsedData) ? parsedData[0] : parsedData;
}

/**
 * Memanggil fungsi prediksi pada Gradio backend
 * @param imageFile Blob/File gambar yang di-upload
 */
export async function predictFire(imageFile: Blob | File): Promise<PredictionResult> {
  const startTime = performance.now();
  let rawData: any = null;

  // 1. Coba via @gradio/client
  try {
    const c = await getGradioClient();
    if (c && typeof c.predict === "function") {
      const res = await c.predict("/prediksi", [imageFile]);
      rawData = res?.data ? res.data[0] : res;
    }
  } catch (err) {
    console.warn("Gradio client predict error, switching to direct REST API:", err);
  }

  // 2. Jika client gagal atau error, gunakan Direct REST API Fallback
  if (!rawData) {
    rawData = await predictViaRest(imageFile);
  }

  const endTime = performance.now();
  const latencySeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));

  return parsePredictionData(rawData, latencySeconds);
}

function parsePredictionData(data: any, latencySeconds: number): PredictionResult {
  console.log("[Backend Response Raw Data]:", data);
  const jsonStrForDebug = JSON.stringify(data || {});

  // Jika backend mengembalikan pesan error resmi dari Hugging Face (misal kuota)
  if (data && data.error) {
    throw new Error(`Backend Error: ${data.error}`);
  }

  let fireProb = 0.0;
  let noFireProb = 0.0;

  // Pencarian rekursif untuk menemukan angka probabilitas
  function searchObject(obj: any) {
    if (!obj) return;

    if (typeof obj === "object") {
      for (const [key, val] of Object.entries(obj)) {
        // Jika format respons adalah object dictionary key -> number
        if (typeof key === "string" && typeof val === "number") {
          if (key.includes("Terdeteksi") || (key.includes("Api") && !key.includes("Tidak Ada"))) {
            fireProb = val;
          } else if (key.includes("Aman") || key.includes("Tidak Ada")) {
            noFireProb = val;
          }
        }

        // Jika format respons adalah Array of Objects { label: "...", confidence: ... }
        if (key === "label" && typeof val === "string") {
          const conf = obj.confidence !== undefined ? Number(obj.confidence) : Number(obj.score || 0);
          if (val.includes("Terdeteksi") || (val.includes("Api") && !val.includes("Tidak Ada"))) {
            fireProb = conf;
          } else if (val.includes("Aman") || val.includes("Tidak Ada")) {
            noFireProb = conf;
          }
        }

        // Cari lebih dalam ke dalam array/nested object
        if (typeof val === "object" && val !== null) {
          searchObject(val);
        }
      }
    }
  }

  searchObject(data);

  // Fallback matematis: Jika hanya satu probabilitas yang terisi
  if (fireProb > 0 && noFireProb === 0) {
    noFireProb = parseFloat((1.0 - fireProb).toFixed(4));
  } else if (noFireProb > 0 && fireProb === 0) {
    fireProb = parseFloat((1.0 - noFireProb).toFixed(4));
  }

  return {
    fireProbability: fireProb,
    noFireProbability: noFireProb,
    latencySeconds,
    rawJsonString: jsonStrForDebug,
  };
}
