import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert,
  ButtonGroup
} from 'react-bootstrap';
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  CheckCircle2,
  Search,
  Trash2,
  Info,
  Layers,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../api/taskApi';
import { employeeApi } from '../api/employeeApi';
import { shiftApi } from '../api/shiftApi';
import { useTranslation } from '../i18n/useTranslation';

export interface ClinicalTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_by: string;
  assigned_by_name: string;
  shift_id: string | null;
  shift_label: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'ROUTINE';
  due_date: string;
  created_at: string;
}

export const DailyTasks: React.FC = () => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // TanStack Query: Fetch tasks live from MySQL
  const { data: serverTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.getAll(),
    staleTime: 5000
  });

  // Query employees for dynamic assignment
  const { data: serverEmployees } = useQuery({
    queryKey: ['employeesList'],
    queryFn: () => employeeApi.getAll(),
    staleTime: 60000
  });

  // Query shifts for dynamic shift assignment
  const { data: serverShifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll(),
    staleTime: 30000
  });

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('EMP-DOC-002');
  const [newPriority, setNewPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'ROUTINE'>('HIGH');
  const [newDueDate, setNewDueDate] = useState('2026-09-19 18:00:00');
  const [newShiftId, setNewShiftId] = useState('');

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (payload: any) => taskApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setSuccessToast(`Y lệnh / Nhiệm vụ lâm sàng đã được phân công thành công!`);
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Không thể tạo nhiệm vụ';
      setSuccessToast(`Lỗi: ${msg}`);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSuccessToast('Đã xóa nhiệm vụ khỏi danh sách.');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  });

  // Map server tasks directly from database
  const tasks: ClinicalTask[] = (serverTasks && serverTasks.length > 0)
    ? serverTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        assigned_to: t.assigned_to,
        assigned_to_name: t.assigned_to_name || t.assigned_to,
        assigned_by: t.assigned_by || 'EMP-DOC-001',
        assigned_by_name: t.assigned_by_name || 'Bác sĩ phụ trách',
        shift_id: t.shift_id,
        shift_label: t.shift_type ? `Ca ${t.shift_type}` : 'Khoa Cấp Cứu / ICU',
        status: t.status,
        priority: t.priority || 'HIGH',
        due_date: t.due_date ? t.due_date.slice(0, 16) : 'Trong ca trực',
        created_at: t.created_at
      }))
    : [];

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createTaskMutation.mutate({
      title: newTitle,
      description: newDescription,
      assigned_to: newAssignedTo,
      priority: newPriority,
      due_date: newDueDate,
      shift_id: newShiftId || null
    });
  };

  const handleUpdateStatus = (taskId: string, newStatus: ClinicalTask['status'] | string) => {
    updateStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  const getPriorityBadge = (p: ClinicalTask['priority']) => {
    switch (p) {
      case 'URGENT':
        return <span className="wd-badge-urgent">{t('tasks.priority_urgent', 'Khẩn Cấp')}</span>;
      case 'HIGH':
        return <span className="wd-badge-warning">{t('tasks.priority_high', 'Ưu Tiên Cao')}</span>;
      case 'NORMAL':
        return <span className="wd-badge-neutral">{t('tasks.priority_medium', 'Bình Thường')}</span>;
      case 'ROUTINE':
        return <span className="wd-badge-neutral">{lang === 'vi' ? 'Định Kỳ' : 'Routine'}</span>;
    }
  };

  const getStatusBadge = (status: ClinicalTask['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="wd-badge-success">{lang === 'vi' ? 'Đã Hoàn Thành' : 'Completed'}</span>;
      case 'IN_PROGRESS':
        return <span className="wd-badge-blue">{lang === 'vi' ? 'Đang Thực Hiện' : 'In Progress'}</span>;
      case 'PENDING':
        return <span className="wd-badge-warning">{lang === 'vi' ? 'Chờ Tiếp Nhận' : 'Pending'}</span>;
      case 'CANCELLED':
        return <span className="wd-badge-neutral">{lang === 'vi' ? 'Đã Hủy' : 'Cancelled'}</span>;
    }
  };

  return (
    <Container fluid className="px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="wd-page-title">{t('tasks.title', 'Nhiệm Vụ Lâm Sàng')}</h1>
          <p className="wd-page-subtitle">
            {t('tasks.subtitle', 'Quản lý tiến độ công việc, chỉ đạo lâm sàng và nhiệm vụ điều hành')}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <ButtonGroup size="sm">
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('kanban')}
            >
              <Layers size={14} className="me-1" />
              <span>Bảng Kanban</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('list')}
            >
              <CheckSquare size={14} className="me-1" />
              <span>Bảng Danh Sách</span>
            </button>
          </ButtonGroup>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>Giao Y Lệnh Mới</span>
          </button>
        </div>
      </div>

      {successToast && (
        <Alert
          variant={successToast.startsWith('Lỗi') ? 'danger' : 'success'}
          dismissible
          onClose={() => setSuccessToast(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </Alert>
      )}

      {/* Support Banner */}
      <div className="wd-support-banner">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            Hỗ trợ Quy trình Lâm sàng (AskHR Clinical Protocol)
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            Cần đối chiếu quy trình bàn giao thuốc độc bảng A hoặc quy chế kiểm tra máy thở định kỳ? Liên hệ điều dưỡng trưởng khoa.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Tổng Số Y Lệnh Trong Ngày
            </div>
            <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
              {tasks.length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Toàn viện</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Đang Chờ Tiếp Nhận
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-amber)' }}>
              {tasks.filter((t) => t.status === 'PENDING').length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Cần xử lý ngay</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Đang Thực Hiện Tại Giường
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-blue)' }}>
              {tasks.filter((t) => t.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Theo sát buồng bệnh</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Đã Nghiệm Thu Hoàn Tất
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-green)' }}>
              {tasks.filter((t) => t.status === 'COMPLETED').length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>Đạt chuẩn chỉ số</div>
          </div>
        </Col>
      </Row>

      {/* Filter Bar */}
      <div className="wd-card mb-4 p-3">
        <Row className="g-3">
          <Col xs={12} md={6}>
            <div className="position-relative">
              <Search size={15} className="position-absolute text-muted" style={{ left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder="Tìm tiêu đề nhiệm vụ, chỉ dẫn y lệnh, tên nhân sự thực hiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wd-input w-100 ps-5"
              />
            </div>
          </Col>
          <Col xs={12} md={6} className="d-flex justify-content-md-end gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="wd-select"
              style={{ maxWidth: '220px' }}
            >
              <option value="ALL">{t('common.status', 'Tất Cả Trạng Thái')}</option>
              <option value="PENDING">{lang === 'vi' ? 'Chờ Tiếp Nhận' : 'Pending'}</option>
              <option value="IN_PROGRESS">{lang === 'vi' ? 'Đang Thực Hiện' : 'In Progress'}</option>
              <option value="COMPLETED">{lang === 'vi' ? 'Đã Hoàn Thành' : 'Completed'}</option>
            </select>
          </Col>
        </Row>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <Row className="g-3">
          {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            const colTitle =
              colStatus === 'PENDING'
                ? 'Chờ Tiếp Nhận'
                : colStatus === 'IN_PROGRESS'
                ? 'Đang Thực Hiện'
                : 'Đã Hoàn Thành';

            return (
              <Col xs={12} lg={4} key={colStatus}>
                <div className="p-3 rounded-3 border h-100" style={{ backgroundColor: '#f8fafc', borderColor: 'var(--wd-border)' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--wd-border-light)' }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="wd-badge-neutral">{colTasks.length}</span>
                      <span className="fw-bold text-dark" style={{ fontSize: '13px' }}>{colTitle}</span>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-3">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-4 text-muted small">
                        Không có nhiệm vụ trong mục này
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div key={task.id} className="wd-card mb-0 p-3">
                          <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                            {getPriorityBadge(task.priority)}
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-muted p-0"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Xóa nhiệm vụ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="fw-semibold text-dark mb-1" style={{ fontSize: '14px' }}>
                            {task.title}
                          </div>
                          <div className="text-muted small mb-3" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                            {task.description}
                          </div>

                          <div className="border-top pt-2 mt-2" style={{ borderColor: 'var(--wd-border-light)' }}>
                            <div className="d-flex align-items-center justify-content-between small mb-1">
                              <span className="d-flex align-items-center gap-1.5 text-dark fw-medium" style={{ fontSize: '12px' }}>
                                <User size={12} className="text-muted" />
                                <span>{task.assigned_to_name}</span>
                              </span>
                              <span className="text-muted font-mono" style={{ fontSize: '11px' }}>
                                Hạn: {task.due_date.split(' ')[1] || task.due_date}
                              </span>
                            </div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {task.shift_label}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="d-flex gap-1.5 mt-3 pt-2 border-top" style={{ borderColor: 'var(--wd-border-light)' }}>
                            {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                className="wd-pill-btn-outline w-100 justify-content-center"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                              >
                                Bắt Đầu
                              </button>
                            )}
                            {task.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                className="wd-pill-btn-primary w-100 justify-content-center"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                              >
                                Hoàn Thành
                              </button>
                            )}
                            {task.status === 'COMPLETED' && (
                              <div className="w-100 text-center py-1">
                                <span className="wd-badge-success" style={{ fontSize: '11px' }}>
                                  Đã Nghiệm Thu
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* List View */
        <div className="wd-card">
          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Y LỆNH / NHIỆM VỤ</th>
                  <th>MỨC ƯU TIÊN</th>
                  <th>CÁN BỘ THỰC HIỆN</th>
                  <th>CA TRỰC / BUỒNG BỆNH</th>
                  <th>HẠN HOÀN THÀNH</th>
                  <th>TRẠNG THÁI</th>
                  <th className="text-end">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="fw-semibold text-dark">{t.title}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{t.description.slice(0, 60)}...</div>
                    </td>
                    <td>{getPriorityBadge(t.priority)}</td>
                    <td>
                      <div className="fw-medium text-dark">{t.assigned_to_name}</div>
                      <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{t.assigned_to}</span>
                    </td>
                    <td>
                      <span className="text-secondary" style={{ fontSize: '12px' }}>{t.shift_label}</span>
                    </td>
                    <td>
                      <span className="font-mono text-dark" style={{ fontSize: '12px' }}>{t.due_date}</span>
                    </td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {t.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => handleUpdateStatus(t.id, t.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED')}
                          >
                            {t.status === 'PENDING' ? 'Bắt Đầu' : 'Xong'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="wd-pill-btn"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => handleDeleteTask(t.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Form onSubmit={handleCreateTask}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              Giao Y Lệnh &amp; Phân Công Trực Lâm Sàng
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">Tiêu Đề Y Lệnh / Nhiệm Vụ</label>
              <input
                required
                placeholder="VD: Kiểm tra chỉ số áp lực máy thở Giường 08 ICU..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Chỉ Dẫn Chuyên Môn &amp; Liều Lượng</label>
              <textarea
                rows={3}
                placeholder="Chi tiết phác đồ theo dõi, chỉ số cảnh báo sinh tồn, thiết bị y tế đi kèm..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">Cán Bộ Phân Công</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="wd-select w-100"
                >
                  {serverEmployees && serverEmployees.length > 0 ? (
                    serverEmployees.map((emp: any) => (
                      <option key={emp.id} value={emp.employee_code}>
                        {emp.last_name} {emp.first_name} ({emp.department_name || emp.department_code || emp.role})
                      </option>
                    ))
                  ) : (
                    <option value="EMP-DOC-001">BS.CKII Nguyễn Văn An</option>
                  )}
                </select>
              </Col>
              <Col xs={6}>
                <label className="wd-label">Mức Độ Khẩn</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="wd-select w-100"
                >
                  <option value="URGENT">{t('tasks.priority_urgent', 'Khẩn Cấp')}</option>
                  <option value="HIGH">{t('tasks.priority_high', 'Ưu Tiên Cao')}</option>
                  <option value="NORMAL">{t('tasks.priority_medium', 'Bình Thường')}</option>
                  <option value="ROUTINE">{lang === 'vi' ? 'Định Kỳ Ca' : 'Routine'}</option>
                </select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <label className="wd-label">Ca Trực Phụ Trách</label>
              <select
                value={newShiftId}
                onChange={(e) => setNewShiftId(e.target.value)}
                className="wd-select w-100"
              >
                <option value="">-- Không chỉ định / Chung trong ngày --</option>
                {serverShifts && serverShifts.length > 0 ? (
                  serverShifts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.department_name || s.department_code} — Ca {s.shift_type} ({s.start_time?.slice(11, 16)} - {s.end_time?.slice(11, 16)})
                    </option>
                  ))
                ) : null}
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Thời Hạn Hoàn Thành</label>
              <input
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm:ss"
                className="wd-input w-100 font-mono"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowCreateModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="wd-pill-btn-primary"
            >
              Xác Nhận Giao Nhiệm Vụ
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DailyTasks;
