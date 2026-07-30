import React from 'react';
import { Layers } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isConnected }) => {
  return (
    <header className="header-wrapper">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <div>
          <h1 className="brand-title">Drone Forest Vision</h1>
          <p className="brand-sub">Sistem Deteksi Kebakaran Hutan Real-Time (v1.4)</p>
        </div>
      </div>

      <div className={`status-badge ${isConnected ? '' : 'offline'}`}>
        <span className="status-dot"></span>
        {isConnected ? 'Backend API Connected' : 'Checking API Status...'}
      </div>
    </header>
  );
};
