import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { predictFire, HF_SPACE_URL, PredictionResult } from './api/gradioClient';

export const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Cek status aktif backend Space secara langsung
  useEffect(() => {
    fetch(`${HF_SPACE_URL}/config`)
      .then((res) => {
        setIsConnected(res.ok);
      })
      .catch(() => {
        setIsConnected(false);
      });
  }, []);

  const handleImageSelected = async (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setIsLoading(true);

    try {
      const res = await predictFire(file);
      setResult(res);
      setIsConnected(true);
    } catch (err: any) {
      console.error("Gagal melakukan prediksi:", err);
      setError(err?.message || "Gagal menghubungi server prediksi Hugging Face.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header isConnected={isConnected} />

      <main className="adaptive-grid">
        <ImageUploader
          previewUrl={previewUrl}
          onImageSelected={handleImageSelected}
          isLoading={isLoading}
        />

        <ResultCard
          result={result}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default App;
