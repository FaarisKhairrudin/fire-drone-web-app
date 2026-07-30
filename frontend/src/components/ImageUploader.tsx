import React, { useRef } from 'react';
import { Image as ImageIcon, UploadCloud, RefreshCw } from 'lucide-react';

interface ImageUploaderProps {
  previewUrl: string | null;
  onImageSelected: (file: File) => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  previewUrl,
  onImageSelected,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <ImageIcon size={20} />
        Input Citra Drone
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {previewUrl ? (
        <div>
          <div className="preview-image-wrapper">
            <img src={previewUrl} alt="Drone aerial view" className="preview-image" />
          </div>
          <button
            className="btn-change-image"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <RefreshCw size={14} />
            Ganti Citra Drone
          </button>
        </div>
      ) : (
        <div
          className="dropzone-container"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UploadCloud className="dropzone-icon" strokeWidth={1.8} />
          <div className="dropzone-title">Tarik & Lepas Foto Citra Drone</div>
          <div className="dropzone-sub">atau klik untuk memilih file (.jpg, .png)</div>
        </div>
      )}
    </div>
  );
};
