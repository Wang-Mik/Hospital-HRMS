import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { ShieldAlert, PhoneCall, Clock, CheckCircle, Activity } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { SurgeDispatchSession, AlertLevel } from '../api/surgeDispatchApi';

interface ActiveSurgeAlertBannerProps {
  session: SurgeDispatchSession;
  onOpenCockpit: () => void;
  onResolve?: () => void;
}

export const ActiveSurgeAlertBanner: React.FC<ActiveSurgeAlertBannerProps> = ({
  session,
  onOpenCockpit
}) => {
  const { t } = useTranslation();

  const getAlertLevelBadge = (level: AlertLevel) => {
    switch (level) {
      case 'CODE_RED':
        return (
          <Badge bg="danger" className="text-white text-uppercase px-2.5 py-1 fw-bold fs-8">
            CODE RED - BÁO ĐỘNG ĐỎ
          </Badge>
        );
      case 'LEVEL_2_DISASTER':
        return (
          <Badge
            bg="warning"
            text="dark"
            className="text-uppercase px-2.5 py-1 fw-bold fs-8"
          >
            MỨC 2 - ĐIỀU ĐỘNG KHẨN LIÊN KHOA
          </Badge>
        );
      case 'LEVEL_1_SURGE':
      default:
        return (
          <Badge bg="primary" className="text-white text-uppercase px-2.5 py-1 fw-bold fs-8">
            MỨC 1 - TĂNG CƯỜNG & BÙ ĐẮP NHÂN LỰC
          </Badge>
        );
    }
  };

  const getResponseStatusText = (status: string, etaMinutes?: number) => {
    switch (status) {
      case 'ACCEPTED':
      case 'ACCEPTED_15M':
      case 'ACCEPTED_30M': {
        const is30m = status === 'ACCEPTED_30M' || etaMinutes === 30;
        return (
          <span className="badge bg-success text-white d-inline-flex align-items-center gap-1 fs-8">
            <CheckCircle size={12} />{' '}
            {is30m ? t('shifts.surge_resp_accepted_30m') : t('shifts.surge_resp_accepted_15m')}
          </span>
        );
      }
      case 'UNREACHABLE':
        return (
          <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1 fs-8">
            {t('shifts.surge_resp_unreachable')}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge bg-danger text-white d-inline-flex align-items-center gap-1 fs-8">
            {t('shifts.surge_resp_rejected')}
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="badge bg-secondary text-white d-inline-flex align-items-center gap-1 fs-8">
            <Clock size={12} /> {t('shifts.surge_resp_pending')}
          </span>
        );
    }
  };

  const sessionId = session.dispatch_id || session.id || '';

  return (
    <div
      role="alert"
      className="border-start border-4 border-danger bg-danger-subtle text-dark px-3 py-2.5 rounded-3 mb-3 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3"
    >
      <div className="d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle flex-shrink-0"
          style={{ width: '40px', height: '40px' }}
        >
          <ShieldAlert size={22} className="text-warning" />
        </div>
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            {getAlertLevelBadge(session.alert_level)}
            <span className="fw-bold text-danger fs-7">
              {session.department_name || session.department_code}
            </span>
            <span className="text-muted fs-8">•</span>
            <span className="text-muted fs-8">Mã phiên: {sessionId.slice(0, 8)}</span>
          </div>
          <div className="fs-7 text-dark fw-semibold">
            <span>Lý do điều động: {session.reason}</span>
          </div>
          <div className="fs-8 text-muted mt-0.5 d-flex align-items-center gap-2 flex-wrap">
            <span>
              Cán bộ được điều động:{' '}
              <strong>
                {session.responder_name ||
                  session.selected_staff_id ||
                  'Cán bộ trực thường trú'}
              </strong>{' '}
              ({session.selected_staff_id})
            </span>
            <span>•</span>
            <span>
              Trạng thái:{' '}
              {getResponseStatusText(session.response_status, session.estimated_arrival_minutes)}
            </span>
            {session.phone_contact && (
              <>
                <span>•</span>
                <a
                  href={`tel:${session.phone_contact}`}
                  className="text-danger fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
                >
                  <PhoneCall size={12} />
                  <span>{session.phone_contact}</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        <Button
          variant="danger"
          size="sm"
          className="fw-bold d-inline-flex align-items-center gap-1.5 shadow-sm"
          onClick={onOpenCockpit}
        >
          <Activity size={15} />
          <span>Mở Bàn Điều Phối & Liên Lạc</span>
        </Button>
      </div>
    </div>
  );
};

export default ActiveSurgeAlertBanner;
