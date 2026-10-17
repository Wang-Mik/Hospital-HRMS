import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Form,
  Button,
  Modal,
  Alert
} from 'react-bootstrap';
import {
  Bell,
  Search,
  CheckCheck,
  Filter,
  Send,
  AlertTriangle,
  FileText,
  CheckSquare,
  RefreshCw,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationItem } from '../api/notificationApi';
import { adminApi } from '../api/adminApi';
import { departmentApi } from '../api/departmentApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export const NotificationsPage: React.FC = () => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffCode = user?.employee_code || 'EMP-DOC-001';
  const isHRorAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'ALERT' | 'ANNOUNCEMENT' | 'TASK' | 'UNREAD'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Broadcast modal state (for HR/Admin)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'ANNOUNCEMENT' as 'ALERT' | 'ANNOUNCEMENT' | 'TASK',
    department_code: 'ALL'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: notifications = [], refetch, isLoading } = useQuery({
    queryKey: ['notifications', currentStaffCode],
    queryFn: () => notificationApi.getByStaffId(currentStaffCode)
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll,
    enabled: isHRorAdmin
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(currentStaffCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast('Đã đánh dấu tất cả thông báo là đã đọc.');
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: any) => adminApi.broadcastNotification(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowBroadcastModal(false);
      setBroadcastForm({ title: '', message: '', type: 'ANNOUNCEMENT', department_code: 'ALL' });
      showToast(res.message || 'Đã phát thông báo thành công.');
    },
    onError: (err: any) => {
      showToast(`Lỗi: ${err.message}`);
    }
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    const matchSearch =
      searchQuery === '' ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (selectedType === 'UNREAD') return !n.is_read;
    if (selectedType === 'ALERT') return n.type === 'ALERT';
    if (selectedType === 'ANNOUNCEMENT') return n.type === 'ANNOUNCEMENT';
    if (selectedType === 'TASK') return n.type === 'TASK';

    return true;
  });

  return (
    <Container fluid className="px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ backgroundColor: '#eff6ff', color: 'var(--wd-blue)', width: '48px', height: '48px' }}
          >
            <Bell size={26} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h4 fw-bold text-dark mb-0">Trung Tâm Thông Báo &amp; Văn Bản Bệnh Viện</h1>
              {unreadCount > 0 && (
                <Badge bg="danger" pill className="px-2.5 py-1">
                  {unreadCount} chưa đọc
                </Badge>
              )}
            </div>
            <p className="text-muted small mb-0 mt-1">
              Thông báo toàn viện, y lệnh chỉ đạo chuyên môn, cảnh báo khẩn cấp và cập nhật quy chế vận hành
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="wd-pill-btn d-flex align-items-center gap-2 px-3 py-1.5"
            onClick={() => refetch()}
            title="Làm mới thông báo"
          >
            <RefreshCw size={15} />
            <span>Làm Mới</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="wd-pill-btn d-flex align-items-center gap-2 px-3 py-1.5"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck size={16} />
              <span>Đọc Tất Cả</span>
            </button>
          )}

          {isHRorAdmin && (
            <button
              type="button"
              className="wd-pill-btn-primary d-flex align-items-center gap-2 px-3 py-1.5"
              onClick={() => setShowBroadcastModal(true)}
            >
              <Send size={15} />
              <span>Phát Thông Báo Mới</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <Alert variant="success" dismissible onClose={() => setToastMessage(null)} className="py-2.5 px-3 mb-4 small rounded-2">
          <CheckCircle2 size={16} className="me-2" />
          {toastMessage}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <div className="wd-card mb-4 p-3.5">
        <Row className="g-3 align-items-center justify-content-between">
          <Col xs={12} md={5}>
            <div className="position-relative">
              <Search size={15} className="position-absolute text-muted" style={{ left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung thông báo, văn bản, tiêu đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wd-input w-100 ps-5"
              />
            </div>
          </Col>

          <Col xs={12} md={7}>
            <div className="d-flex flex-wrap align-items-center justify-content-md-end gap-2">
              <button
                type="button"
                className={`btn btn-sm ${selectedType === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'} py-1.5 px-3 rounded-pill`}
                onClick={() => setSelectedType('ALL')}
              >
                Tất Cả ({notifications.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedType === 'UNREAD' ? 'btn-primary' : 'btn-outline-secondary'} py-1.5 px-3 rounded-pill`}
                onClick={() => setSelectedType('UNREAD')}
              >
                Chưa Đọc ({unreadCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedType === 'ALERT' ? 'btn-danger' : 'btn-outline-danger'} py-1.5 px-3 rounded-pill`}
                onClick={() => setSelectedType('ALERT')}
              >
                Khẩn Cấp (ALERT)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedType === 'ANNOUNCEMENT' ? 'btn-info text-white' : 'btn-outline-info'} py-1.5 px-3 rounded-pill`}
                onClick={() => setSelectedType('ANNOUNCEMENT')}
              >
                Thông Báo Viện
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedType === 'TASK' ? 'btn-warning' : 'btn-outline-warning'} py-1.5 px-3 rounded-pill`}
                onClick={() => setSelectedType('TASK')}
              >
                Chỉ Đạo Nhiệm Vụ
              </button>
            </div>
          </Col>
        </Row>
      </div>

      {/* Notifications List */}
      <div className="d-flex flex-column gap-3">
        {filteredNotifications.length === 0 ? (
          <div className="wd-card p-5 text-center text-muted">
            <Inbox size={40} className="text-secondary opacity-50 mb-2" />
            <h5 className="fw-bold text-dark mb-1">Không Có Thông Báo Nào Phù Hợp</h5>
            <p className="small mb-0">Hộp thông báo hiện không có nội dung mới nào theo bộ lọc đã chọn.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isAlert = notif.type === 'ALERT';
            const isTask = notif.type === 'TASK';
            const isRead = Boolean(notif.is_read);

            return (
              <div
                key={notif.id}
                className={`wd-card p-4 position-relative transition-all mb-3 ${!isRead ? 'border-primary border-opacity-50 shadow-sm' : ''}`}
                style={{
                  backgroundColor: !isRead ? '#f8faff' : '#ffffff',
                  borderLeft: isAlert
                    ? '4px solid #ef4444'
                    : isTask
                    ? '4px solid #f59e0b'
                    : '4px solid #0284c7'
                }}
              >
                <div className="d-flex align-items-start justify-content-between gap-4">
                  <div className="d-flex align-items-start gap-3.5 flex-grow-1">
                    <div
                      className="rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center mt-0.5"
                      style={{
                        backgroundColor: isAlert ? '#fee2e2' : isTask ? '#fef3c7' : '#e0f2fe',
                        color: isAlert ? '#dc2626' : isTask ? '#d97706' : '#0284c7',
                        width: '44px',
                        height: '44px'
                      }}
                    >
                      {isAlert ? <AlertTriangle size={22} /> : isTask ? <CheckSquare size={22} /> : <FileText size={22} />}
                    </div>

                    <div className="flex-grow-1">
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                        <Badge
                          bg={isAlert ? 'danger' : isTask ? 'warning' : 'primary'}
                          text={isTask ? 'dark' : 'white'}
                          className="fw-semibold px-2.5 py-1 rounded-pill"
                          style={{ fontSize: '11px' }}
                        >
                          {isAlert ? 'BÁO ĐỘNG KHẨN CẤP' : isTask ? 'CHỈ ĐẠO NHIỆM VỤ' : 'THÔNG BÁO BỆNH VIỆN'}
                        </Badge>

                        {!isRead && (
                          <span className="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: '10.5px' }}>
                            Mới
                          </span>
                        )}

                        <span className="text-muted small ms-1">
                          {notif.created_at ? new Date(notif.created_at).toLocaleString('vi-VN') : 'Vừa xong'}
                        </span>
                      </div>

                      <h3 className="h6 fw-bold text-dark mb-2" style={{ fontSize: '16px', lineHeight: 1.4 }}>
                        {notif.title}
                      </h3>

                      <p className="text-secondary mb-0" style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="d-flex flex-column align-items-end flex-shrink-0 ms-2">
                    {!isRead ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-1.5 px-3 rounded-pill d-inline-flex align-items-center gap-1.5"
                        style={{ fontSize: '12px' }}
                        onClick={() => markReadMutation.mutate(notif.id)}
                        disabled={markReadMutation.isPending}
                      >
                        <CheckCheck size={14} />
                        <span>Đã đọc</span>
                      </button>
                    ) : (
                      <span className="badge bg-light text-muted border px-2.5 py-1.5 rounded-pill" style={{ fontSize: '11.5px' }}>
                        Đã xem
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Modal for HR/Admin */}
      {isHRorAdmin && (
        <Modal show={showBroadcastModal} onHide={() => setShowBroadcastModal(false)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
              <Send size={18} className="text-primary" />
              Phát Lệnh Thông Báo Nội Bộ Bệnh Viện (Quyền HR / Admin)
            </Modal.Title>
          </Modal.Header>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              broadcastMutation.mutate(broadcastForm);
            }}
          >
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">{lang === 'vi' ? 'Phạm Vi Gửi Thông Báo' : 'Broadcast Scope'}</Form.Label>
                <Form.Select
                  value={broadcastForm.department_code}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, department_code: e.target.value })}
                  className="wd-input"
                >
                  <option value="ALL">{t('admin.target_hospital', 'Toàn Bệnh Viện')}</option>
                  {departments.map((d: any) => (
                    <option key={d.department_code} value={d.department_code}>
                      {d.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">{lang === 'vi' ? 'Phân Loại Thông Báo' : 'Broadcast Type'}</Form.Label>
                <Form.Select
                  value={broadcastForm.type}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value as any })}
                  className="wd-input"
                >
                  <option value="ANNOUNCEMENT">{t('admin.announcement_general', 'Thông Báo Chung')}</option>
                  <option value="ALERT">{t('admin.announcement_emergency', 'Cảnh Báo Khẩn Cấp')}</option>
                  <option value="TASK">{t('admin.announcement_task', 'Giao Việc Điều Hành')}</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Tiêu Đề Thông Báo *</Form.Label>
                <Form.Control
                  type="text"
                  required
                  placeholder="VD: Kế hoạch phân công trực Tết Nguyên Đán..."
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="wd-input"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Nội Dung Chi Tiết *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  required
                  placeholder="Nhập toàn văn thông báo hoặc chỉ đạo gửi đến nhân sự..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="wd-input"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowBroadcastModal(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={broadcastMutation.isPending}>
                {broadcastMutation.isPending ? 'Đang gửi...' : 'Phát Lệnh Thông Báo'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </Container>
  );
};

export default NotificationsPage;
