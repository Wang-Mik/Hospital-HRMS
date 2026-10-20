import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { AlertTriangle, CheckCircle2, Lock, Unlock, ShieldCheck, Bell, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

export interface ConfirmDetailItem {
  label: string;
  value: React.ReactNode;
}

export interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  iconType?: 'alert' | 'lock' | 'unlock' | 'shield' | 'broadcast' | 'check';
  isLoading?: boolean;
  details?: ConfirmDetailItem[];
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'warning',
  iconType = 'alert',
  isLoading = false,
  details
}) => {
  const { t } = useTranslation();

  const renderIcon = () => {
    const size = 22;
    switch (iconType) {
      case 'lock':
        return <Lock size={size} />;
      case 'unlock':
        return <Unlock size={size} />;
      case 'shield':
        return <ShieldCheck size={size} />;
      case 'broadcast':
        return <Bell size={size} />;
      case 'check':
        return <CheckCircle2 size={size} />;
      case 'alert':
      default:
        return <AlertTriangle size={size} />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          btnVariant: 'danger' as const
        };
      case 'primary':
        return {
          iconBg: '#e0f2fe',
          iconColor: '#0284c7',
          btnVariant: 'primary' as const
        };
      case 'success':
        return {
          iconBg: '#dcfce7',
          iconColor: '#16a34a',
          btnVariant: 'success' as const
        };
      case 'warning':
      default:
        return {
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          btnVariant: 'warning' as const
        };
    }
  };

  const { iconBg, iconColor, btnVariant } = getVariantStyles();

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static" keyboard={!isLoading} className="wd-confirm-modal">
      <Modal.Header closeButton={!isLoading} className="border-bottom pb-3">
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: '40px', height: '40px', backgroundColor: iconBg, color: iconColor }}
          >
            {renderIcon()}
          </div>
          <div>
            <Modal.Title className="h6 fw-bold text-dark mb-0">{title}</Modal.Title>
            <div className="text-muted small" style={{ fontSize: '11px' }}>
              {t('common.confirm_security_checkpoint', 'Điểm kiểm soát an toàn hệ thống')}
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="py-3 px-4">
        <div className="text-dark fs-6 mb-3" style={{ lineHeight: '1.5' }}>
          {message}
        </div>

        {details && details.length > 0 && (
          <div className="bg-light rounded-3 p-3 border mb-2">
            <div className="d-flex flex-column gap-2">
              {details.map((item, idx) => (
                <div key={idx} className="d-flex align-items-center justify-content-between text-sm py-1 border-bottom border-light">
                  <span className="text-muted small fw-medium">{item.label}:</span>
                  <span className="fw-semibold text-dark text-end font-monospace" style={{ fontSize: '12.5px' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top pt-2.5 pb-2.5 px-4 bg-light bg-opacity-50">
        <Button variant="outline-secondary" size="sm" onClick={onClose} disabled={isLoading} className="px-3 py-1.5">
          {cancelText || t('common.cancel', 'Hủy')}
        </Button>
        <Button
          variant={btnVariant}
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="d-inline-flex align-items-center gap-1.5 px-3 py-1.5 fw-semibold"
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="spin-slow" />
              <span>{t('common.processing', 'Đang xử lý...')}</span>
            </>
          ) : (
            confirmText || t('common.confirm', 'Xác Nhận')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
