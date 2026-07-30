import React from 'react';
import { Layers } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  isLocal?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, isLocal }) => {
  let statusText = 'Checking API Status...';
  if (isConnected) {
    statusText = isLocal ? 'Backend API Connected (Lokal)' : 'Backend API Connected (Cloud)';
  } else {
    statusText = 'Backend Offline';
  }

  return (
    <header className="header-wrapper">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <div>
          <h1 className="brand-title">Drone Forest Vision</h1>
          <p className="brand-sub">Sistem Deteksi Kebakaran Hutan Real-Time (v1.4 Hybrid)</p>
        </div>
      </div>

      <div className={`status-badge ${isConnected ? '' : 'offline'}`}>
        <span className="status-dot"></span>
        {statusText}
      </div>
    </header>
  );
};
