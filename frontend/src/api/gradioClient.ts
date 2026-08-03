import { client } from "@gradio/client";

// URL & Endpoint Backend
export const HF_SPACE_ID = "Faaris21/fire-drone-space";
export const HF_SPACE_URL = "https://faaris21-fire-drone-space.hf.space";
export const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || "";

export interface PredictionResult {
  fireProbability: number;
  noFireProbability: number;
  latencySeconds: number;
  rawJsonString?: string;
  source?: "local" | "cloud";
}

let clientInstance: any = null;

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
 * Cek status backend Hugging Face Space.
 */
export async function checkBackendStatus(): Promise<{ isConnected: boolean; isLocal: boolean }> {
  try {
    const cloudRes = await fetch(`${HF_SPACE_URL}/config`, { signal: AbortSignal.timeout(3000) });
    if (cloudRes.ok) {
      return { isConnected: true, isLocal: false };
    }
  } catch (err) {
    // Cloud backend offline
  }

  return { isConnected: false, isLocal: false };
}

/**
 * Direct REST API call ke URL backend spesifik (lokal atau cloud)
 */
async function predictViaRestUrl(baseUrl: string, imageFile: Blob | File): Promise<any> {
  const commonHeaders: Record<string, string> = {};
  if (baseUrl.includes("hf.space") && HF_TOKEN) {
    commonHeaders["Authorization"] = `Bearer ${HF_TOKEN}`;
  }

  const formData = new FormData();
  formData.append("files", imageFile, "drone_image.jpg");

  const uploadRes = await fetch(`${baseUrl}/gradio_api/upload`, {
    method: "POST",
    headers: commonHeaders,
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`Gagal mengunggah citra ke ${baseUrl}: HTTP ${uploadRes.status}`);
  }

  const uploadData = await uploadRes.json();
  const uploadedPath = Array.isArray(uploadData) ? uploadData[0] : uploadData;

  const callHeaders: Record<string, string> = {
    ...commonHeaders,
    "Content-Type": "application/json",
  };

  const callRes = await fetch(`${baseUrl}/gradio_api/call/prediksi`, {
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

  const streamRes = await fetch(`${baseUrl}/gradio_api/call/prediksi/${event_id}`, {
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
 * Memanggil fungsi prediksi melalui Hugging Face Space backend.
 */
export async function predictFire(imageFile: Blob | File): Promise<PredictionResult> {
  const startTime = performance.now();
  let rawData: any = null;
  let source: "local" | "cloud" = "cloud";

  try {
    const c = await getGradioClient();
    if (c && typeof c.predict === "function") {
      const res = await c.predict("/prediksi", [imageFile]);
      rawData = res?.data ? res.data[0] : res;
      source = "cloud";
    }
  } catch (err) {
    console.warn("Gradio client predict error, switching to direct REST API Cloud:", err);
  }

  if (!rawData) {
    rawData = await predictViaRestUrl(HF_SPACE_URL, imageFile);
    source = "cloud";
  }

  const endTime = performance.now();
  const latencySeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));

  const result = parsePredictionData(rawData, latencySeconds);
  result.source = source;
  return result;
}

function parsePredictionData(data: any, latencySeconds: number): PredictionResult {
  console.log("[Backend Response Raw Data]:", data);
  const jsonStrForDebug = JSON.stringify(data || {});

  if (data && data.error) {
    const backendMessage = typeof data.error === "string"
      ? data.error
      : data.error?.message || data.error?.detail || "Terjadi kesalahan pada backend.";
    throw new Error(backendMessage);
  }

  let fireProb = 0.0;
  let noFireProb = 0.0;

  function searchObject(obj: any) {
    if (!obj) return;

    if (typeof obj === "object") {
      for (const [key, val] of Object.entries(obj)) {
        if (typeof key === "string" && typeof val === "number") {
          if (key.includes("Terdeteksi") || (key.includes("Api") && !key.includes("Tidak Ada"))) {
            fireProb = val;
          } else if (key.includes("Aman") || key.includes("Tidak Ada")) {
            noFireProb = val;
          }
        }

        if (key === "label" && typeof val === "string") {
          const conf = obj.confidence !== undefined ? Number(obj.confidence) : Number(obj.score || 0);
          if (val.includes("Terdeteksi") || (val.includes("Api") && !val.includes("Tidak Ada"))) {
            fireProb = conf;
          } else if (val.includes("Aman") || val.includes("Tidak Ada")) {
            noFireProb = conf;
          }
        }

        if (typeof val === "object" && val !== null) {
          searchObject(val);
        }
      }
    }
  }

  searchObject(data);

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
