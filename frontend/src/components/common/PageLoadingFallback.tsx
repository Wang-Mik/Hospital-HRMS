import React from 'react';
import { Spinner } from 'react-bootstrap';

export const PageLoadingFallback: React.FC = () => {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center w-100"
      style={{
        minHeight: '60vh',
        backgroundColor: 'transparent'
      }}
      role="status"
      aria-live="polite"
      aria-label="Đang tải dữ liệu trang..."
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <Spinner
          animation="border"
          variant="primary"
          style={{ width: '2rem', height: '2rem', borderWidth: '0.2em' }}
        />
      </div>
      <span className="small text-muted fw-semibold" style={{ fontSize: '12px' }}>
        Đang tải trang...
      </span>
    </div>
  );
};

export default PageLoadingFallback;
