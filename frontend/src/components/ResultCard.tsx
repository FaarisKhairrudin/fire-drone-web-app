import React from 'react';
import { AlertOctagon, CheckCircle2, BarChart3, Info } from 'lucide-react';

export interface PredictionResult {
  fireProbability: number;
  noFireProbability: number;
  latencySeconds: number;
  rawJsonString?: string;
}

interface ResultCardProps {
  result: PredictionResult | null;
  isLoading: boolean;
  error?: string | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <BarChart3 size={20} />
          Hasil Analisis AI
        </div>
        <div className="result-badge empty">
          <div className="loading-spinner"></div>
          <div className="badge-text-wrapper">
            <h3 className="badge-text-title">Menganalisis Citra...</h3>
            <p className="badge-text-desc">AI sedang memproses gambar melalui model ConvNeXt-V2.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <BarChart3 size={20} />
          Hasil Analisis AI
        </div>
        <div className="result-badge warning">
          <AlertOctagon size={28} />
          <div className="badge-text-wrapper">
            <h3 className="badge-text-title">Gambar Tidak Sesuai</h3>
            <p className="badge-text-desc">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card">
        <div className="card-header">
          <BarChart3 size={20} />
          Hasil Analisis AI
        </div>
        <div className="result-badge empty">
          <Info size={24} />
          <div className="badge-text-wrapper">
            <h3 className="badge-text-title">Menunggu Citra Drone</h3>
            <p className="badge-text-desc">Upload foto citra drone di sebelah kiri untuk melihat hasil klasifikasi deteksi kebakaran.</p>
          </div>
        </div>
      </div>
    );
  }

  const clampedFire = Math.min(Math.max(result.fireProbability, 0), 1);
  const clampedNoFire = Math.min(Math.max(result.noFireProbability, 0), 1);
  const firePercentage = (clampedFire * 100).toFixed(1);
  const noFirePercentage = (clampedNoFire * 100).toFixed(1);
  const isFire = clampedFire >= 0.5;

  return (
    <div className="card">
      <div className="card-header">
        <BarChart3 size={20} />
        Hasil Analisis AI
      </div>

      <div className={`result-badge ${isFire ? 'danger' : 'safe'}`}>
        {isFire ? <AlertOctagon size={28} /> : <CheckCircle2 size={28} />}
        <div className="badge-text-wrapper">
          <h3 className="badge-text-title">
            {isFire ? 'Terdeteksi Api' : 'Kondisi Aman / Bebas Api'}
          </h3>
          <p className="badge-text-desc">
            {isFire
              ? 'Citra mengindikasikan adanya pola titik api kebakaran hutan.'
              : 'Tidak terdeteksi titik api kebakaran pada citra drone ini.'}
          </p>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric-header">
          <span>Terdeteksi Api</span>
          <span>{firePercentage}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill fill-danger"
            style={{ width: `${firePercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="metric-row">
        <div className="metric-header">
          <span>Aman / Bebas Api</span>
          <span>{noFirePercentage}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill fill-safe"
            style={{ width: `${noFirePercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="meta-grid">
        <div>
          <span className="meta-col-label">Model Backbone</span>
          <strong className="meta-col-val">ConvNeXt-V2 Base</strong>
        </div>
        <div>
          <span className="meta-col-label">Waktu Inferensi</span>
          <strong className="meta-col-val">{result.latencySeconds} Detik</strong>
        </div>
      </div>
    </div>
  );
};
