import React from 'react';
import './TheoryOfNextLoader.css';
import { useTranslation } from '../../i18n/useTranslation';

export interface TheoryOfNextLoaderProps {
  variant?: 'table' | 'calendar' | 'card' | 'inline' | 'overlay';
  message?: string;
  subMessage?: string;
  columns?: number;
  rows?: number;
  minHeight?: string | number;
  isTableBody?: boolean;
  className?: string;
}

/**
 * Theory of Next Inspired Clinical Database Loader
 * High-precision geometric vector animation, scanning beam, and shimmer skeleton
 * Specially designed for 1-second MySQL database in-flight queries
 */
export const TheoryOfNextLoader: React.FC<TheoryOfNextLoaderProps> = ({
  variant = 'table',
  message,
  subMessage,
  columns = 5,
  rows = 4,
  minHeight = '240px',
  isTableBody = false,
  className = ''
}) => {
  const { t } = useTranslation();

  const displayMessage = message || t('common.loading', 'Đang tải...');
  const displaySubMessage = subMessage;

  // Central Geometric Vector Emblem
  const renderEmblem = () => (
    <div className="d-flex flex-column align-items-center">
      <div className="ton-emblem-wrapper">
        <div className="ton-emblem-ring" />
        <div className="ton-emblem-outer" />
        <div className="ton-emblem-inner" />
        <div className="ton-emblem-core" />
      </div>
      <div className="ton-badge-container">
        <span className="ton-badge-title">
          <span className="ton-pulse-dot" />
          {displayMessage}
        </span>
        {displaySubMessage && <span className="ton-badge-sub">{displaySubMessage}</span>}
      </div>
    </div>
  );

  // Top Scanning Beam
  const renderScanningBeam = () => (
    <div className="ton-scanning-beam-track">
      <div className="ton-scanning-beam" />
    </div>
  );

  // 1. Calendar Overlay Variant (for ShiftRostering Google Calendar)
  if (variant === 'calendar') {
    return (
      <div
        className={`ton-calendar-overlay ${className}`}
        role="status"
        aria-live="polite"
        style={{ minHeight }}
      >
        {renderScanningBeam()}
        {renderEmblem()}
      </div>
    );
  }

  // 2. Card / Metric Variant (for Dashboard KPIs & Staff Cards)
  if (variant === 'card') {
    return (
      <div className={`ton-card-container ${className}`} style={{ minHeight: '120px' }} role="status">
        {renderScanningBeam()}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="ton-shimmer-base" style={{ width: '45%', height: '14px' }} />
          <div className="ton-shimmer-base" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
        </div>
        <div className="ton-shimmer-base my-2" style={{ width: '65%', height: '28px' }} />
        <div className="d-flex align-items-center gap-2">
          <span className="ton-pulse-dot" />
          <span className="text-muted small" style={{ fontSize: '11px' }}>
            {displayMessage}
          </span>
        </div>
      </div>
    );
  }

  // 3. Inline Mini Variant
  if (variant === 'inline') {
    return (
      <div className={`ton-inline-container ${className}`} role="status">
        <span className="ton-pulse-dot" />
        <span>{displayMessage}</span>
      </div>
    );
  }

  // 4. Table Skeleton & Overlay Variant (Default)
  const skeletonContent = (
    <div className={`ton-table-container ${className}`} style={{ minHeight }} role="status">
      {renderScanningBeam()}
      <div className="ton-table-center-overlay">{renderEmblem()}</div>

      {/* Background Shimmer Skeleton Rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="ton-skeleton-row">
          {Array.from({ length: columns }).map((_, cIdx) => {
            const widths = ['22%', '18%', '28%', '14%', '18%', '12%'];
            const w = widths[cIdx % widths.length];
            return (
              <div
                key={cIdx}
                className="ton-shimmer-base ton-skeleton-cell"
                style={{ width: w }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );

  if (isTableBody) {
    return (
      <tr>
        <td colSpan={columns} className="p-0 border-0">
          {skeletonContent}
        </td>
      </tr>
    );
  }

  return skeletonContent;
};

export default TheoryOfNextLoader;
