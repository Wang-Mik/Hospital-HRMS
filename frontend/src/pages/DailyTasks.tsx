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
  FileText,
  Calendar
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../api/taskApi';
import { employeeApi } from '../api/employeeApi';
import { shiftApi } from '../api/shiftApi';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../store/authStore';
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';

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
  const { data: serverTasks, isLoading: isTasksLoading } = useQuery({
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

  const user = useAuthStore((s) => s.user);
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const myDeptCode = user?.department_code;

  // Business Rule: Department Head (e.g. Nguyễn Văn B) can only assign tasks to staff in their own department
  const assignableEmployees = React.useMemo(() => {
    if (!serverEmployees) return [];
    if (isDeptHead && myDeptCode) {
      return serverEmployees.filter((emp: any) => emp.department_code === myDeptCode);
    }
    return serverEmployees;
  }, [serverEmployees, isDeptHead, myDeptCode]);

  const assignableShifts = React.useMemo(() => {
    if (!serverShifts) return [];
    if (isDeptHead && myDeptCode) {
      return serverShifts.filter((s: any) => s.department_code === myDeptCode);
    }
    return serverShifts;
  }, [serverShifts, isDeptHead, myDeptCode]);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('EMP-DOC-002');

  // Synchronize default assignee with first allowed staff
  React.useEffect(() => {
    if (assignableEmployees.length > 0) {
      const exists = assignableEmployees.some((e: any) => e.employee_code === newAssignedTo);
      if (!exists) {
        setNewAssignedTo(assignableEmployees[0].employee_code);
      }
    }
  }, [assignableEmployees]);
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
      setSuccessToast(t('tasks.create_toast_success', 'Y lệnh / Nhiệm vụ lâm sàng đã được phân công thành công!'));
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('common.error_occurred', 'Không thể tạo nhiệm vụ');
      setSuccessToast(`${t('common.error', 'Lỗi')}: ${msg}`);
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
      setSuccessToast(t('common.success_operation', 'Đã xóa nhiệm vụ khỏi danh sách.'));
      setTimeout(() => setSuccessToast(null), 3000);
    }
  });

  // Map server tasks directly from database
  const tasks: ClinicalTask[] = (serverTasks && serverTasks.length > 0)
    ? serverTasks.map((taskItem: any) => ({
        id: taskItem.id,
        title: taskItem.title,
        description: taskItem.description || '',
        assigned_to: taskItem.assigned_to,
        assigned_to_name: taskItem.assigned_to_name || taskItem.assigned_to,
        assigned_by: taskItem.assigned_by || 'EMP-DOC-001',
        assigned_by_name: taskItem.assigned_by_name || t('tasks.attending_physician', 'Bác sĩ phụ trách'),
        shift_id: taskItem.shift_id,
        shift_label: taskItem.shift_type ? `${t('shifts.morning', 'Ca')} ${taskItem.shift_type}` : t('attendance.emergency_icu_dept', 'Khoa Cấp Cứu / ICU'),
        status: taskItem.status,
        priority: taskItem.priority || 'HIGH',
        due_date: taskItem.due_date ? taskItem.due_date.slice(0, 16) : t('tasks.during_shift', 'Trong ca trực'),
        created_at: taskItem.created_at
      }))
    : [];

  const filteredTasks = tasks.filter((tItem) => {
    const matchesStatus = statusFilter === 'ALL' || tItem.status === statusFilter;
    const matchesSearch =
      tItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tItem.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tItem.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase());
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
        return <span className="wd-badge-neutral">{t('tasks.priority_routine', 'Định Kỳ')}</span>;
    }
  };

  const getStatusBadge = (status: ClinicalTask['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="wd-badge-success">{t('common.completed', 'Đã Hoàn Thành')}</span>;
      case 'IN_PROGRESS':
        return <span className="wd-badge-blue">{t('common.in_progress', 'Đang Thực Hiện')}</span>;
      case 'PENDING':
        return <span className="wd-badge-warning">{t('tasks.col_todo', 'Chờ Tiếp Nhận')}</span>;
      case 'CANCELLED':
        return <span className="wd-badge-neutral">{t('status.cancelled', 'Đã Hủy')}</span>;
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
              <CheckSquare size={14} className="me-1" />
              <span>{t('tasks.view_kanban', 'Bảng Kanban')}</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
              onClick={() => setViewMode('list')}
            >
              <FileText size={14} className="me-1" />
              <span>{t('tasks.view_list', 'Bảng Danh Sách')}</span>
            </button>
          </ButtonGroup>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>{t('tasks.new_task_btn', 'Giao Y Lệnh Mới')}</span>
          </button>
        </div>
      </div>

      {successToast && (
        <Alert
          variant={successToast.startsWith(t('common.error', 'Lỗi')) ? 'danger' : 'success'}
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
            {t('tasks.askhr_protocol_title', 'Hỗ Trợ Quy Trình Lâm Sàng')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {t('tasks.askhr_protocol_desc', 'Cần đối chiếu quy trình bàn giao thuốc độc bảng A hoặc quy chế kiểm tra máy thở định kỳ? Liên hệ điều dưỡng trưởng khoa.')}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('tasks.stat_total', 'Tổng Số Y Lệnh Trong Ngày')}
            </div>
            <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
              {tasks.length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('tasks.stat_total_sub', 'Toàn viện')}</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('tasks.stat_pending', 'Đang Chờ Tiếp Nhận')}
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-amber)' }}>
              {tasks.filter((tItem) => tItem.status === 'PENDING').length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('tasks.stat_pending_sub', 'Cần xử lý ngay')}</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('tasks.stat_in_progress', 'Đang Thực Hiện Tại Giường')}
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-blue)' }}>
              {tasks.filter((tItem) => tItem.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('tasks.stat_in_progress_sub', 'Theo sát buồng bệnh')}</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('tasks.stat_completed', 'Đã Nghiệm Thu Hoàn Tất')}
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-green)' }}>
              {tasks.filter((tItem) => tItem.status === 'COMPLETED').length}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('tasks.stat_completed_sub', 'Đạt chuẩn chỉ số')}</div>
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
                placeholder={t('tasks.search_placeholder', 'Tìm tiêu đề nhiệm vụ, chỉ dẫn y lệnh, tên nhân sự thực hiện...')}
                aria-label={t('tasks.search_placeholder', 'Tìm tiêu đề nhiệm vụ, chỉ dẫn y lệnh, tên nhân sự thực hiện...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wd-input w-100 ps-5"
              />
            </div>
          </Col>
          <Col xs={12} md={6} className="d-flex justify-content-md-end gap-2">
            <select
              aria-label={t('common.status', 'Tất Cả Trạng Thái')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="wd-select"
              style={{ maxWidth: '220px' }}
            >
              <option value="ALL">{t('common.status', 'Tất Cả Trạng Thái')}</option>
              <option value="PENDING">{t('tasks.col_todo', 'Chờ Tiếp Nhận')}</option>
              <option value="IN_PROGRESS">{t('tasks.col_in_progress', 'Đang Thực Hiện')}</option>
              <option value="COMPLETED">{t('tasks.col_done', 'Đã Hoàn Thành')}</option>
            </select>
          </Col>
        </Row>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        isTasksLoading ? (
          <Row className="g-3">
            {[1, 2, 3].map((idx) => (
              <Col xs={12} lg={4} key={idx}>
                <TheoryOfNextLoader variant="card" />
              </Col>
            ))}
          </Row>
        ) : (
        <Row className="g-3">
          {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((colStatus) => {
            const colTasks = filteredTasks.filter((tItem) => tItem.status === colStatus);
            const colTitle =
              colStatus === 'PENDING'
                ? t('tasks.col_todo', 'Chờ Tiếp Nhận')
                : colStatus === 'IN_PROGRESS'
                ? t('tasks.col_in_progress', 'Đang Thực Hiện')
                : t('tasks.col_done', 'Đã Hoàn Thành');

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
                        {t('tasks.empty_col', 'Không có nhiệm vụ trong mục này')}
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
                              title={t('common.delete', 'Xóa')}
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
                                {t('tasks.due_label', 'Hạn')}: {task.due_date.split(' ')[1] || task.due_date}
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
                                {t('tasks.btn_start', 'Bắt Đầu')}
                              </button>
                            )}
                            {task.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                className="wd-pill-btn-primary w-100 justify-content-center"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                              >
                                {t('tasks.btn_complete', 'Hoàn Thành')}
                              </button>
                            )}
                            {task.status === 'COMPLETED' && (
                              <div className="w-100 text-center py-1">
                                <span className="wd-badge-success" style={{ fontSize: '11px' }}>
                                  {t('tasks.btn_accepted', 'Đã Nghiệm Thu')}
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
      )
    ) : (
      <div className="wd-card">
          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>{t('tasks.th_task', 'Y LỆNH / NHIỆM VỤ')}</th>
                  <th>{t('tasks.th_priority', 'MỨC ƯU TIÊN')}</th>
                  <th>{t('tasks.th_assignee', 'CÁN BỘ THỰC HIỆN')}</th>
                  <th>{t('tasks.th_shift_ward', 'CA TRỰC / BUỒNG BỆNH')}</th>
                  <th>{t('tasks.th_due_date', 'HẠN HOÀN THÀNH')}</th>
                  <th>{t('common.status', 'TRẠNG THÁI').toUpperCase()}</th>
                  <th className="text-end">{t('common.actions', 'THAO TÁC').toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {isTasksLoading ? (
                  <TheoryOfNextLoader isTableBody columns={7} rows={4} />
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted small">
                      {t('tasks.no_tasks', 'Không có nhiệm vụ nào phù hợp với bộ lọc.')}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((tItem) => (
                  <tr key={tItem.id}>
                    <td>
                      <div className="fw-semibold text-dark">{tItem.title}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{tItem.description.slice(0, 60)}...</div>
                    </td>
                    <td>{getPriorityBadge(tItem.priority)}</td>
                    <td>
                      <div className="fw-medium text-dark">{tItem.assigned_to_name}</div>
                      <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{tItem.assigned_to}</span>
                    </td>
                    <td>
                      <span className="text-secondary" style={{ fontSize: '12px' }}>{tItem.shift_label}</span>
                    </td>
                    <td>
                      <span className="font-mono text-dark" style={{ fontSize: '12px' }}>{tItem.due_date}</span>
                    </td>
                    <td>{getStatusBadge(tItem.status)}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {tItem.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                            onClick={() => handleUpdateStatus(tItem.id, tItem.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED')}
                          >
                            {tItem.status === 'PENDING' ? t('tasks.btn_start', 'Bắt Đầu') : t('tasks.btn_done_short', 'Xong')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="wd-pill-btn"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => handleDeleteTask(tItem.id)}
                        >
                          {t('common.delete', 'Xóa')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
              {t('tasks.modal_title', 'Giao Y Lệnh & Phân Công Trực Lâm Sàng')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">{t('tasks.modal_task_title', 'Tiêu Đề Y Lệnh / Nhiệm Vụ')}</label>
              <input
                required
                placeholder={t('tasks.modal_task_placeholder', 'VD: Kiểm tra chỉ số áp lực máy thở Giường 08 ICU...')}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('tasks.modal_instructions', 'Chỉ Dẫn Chuyên Môn & Liều Lượng')}</label>
              <textarea
                rows={3}
                placeholder={t('tasks.modal_instructions_placeholder', 'Chi tiết phác đồ theo dõi, chỉ số cảnh báo sinh tồn, thiết bị y tế đi kèm...')}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">{t('tasks.assignee', 'Cán Bộ Phân Công')}</label>
                <select
                  aria-label={t('tasks.assignee', 'Cán Bộ Phân Công')}
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="wd-select w-100"
                >
                  {assignableEmployees && assignableEmployees.length > 0 ? (
                    assignableEmployees.map((emp: any) => (
                      <option key={emp.id} value={emp.employee_code}>
                        {emp.last_name} {emp.first_name} ({emp.department_name || emp.department_code || emp.role})
                      </option>
                    ))
                  ) : (
                    <option value="EMP-DOC-001">{t('staff.emp_doc_001', 'BS.CKII Nguyễn Văn An')}</option>
                  )}
                </select>
              </Col>
              <Col xs={6}>
                <label className="wd-label">{t('tasks.priority', 'Mức Độ Khẩn')}</label>
                <select
                  aria-label={t('tasks.priority', 'Mức Độ Khẩn')}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="wd-select w-100"
                >
                  <option value="URGENT">{t('tasks.priority_urgent', 'Khẩn Cấp')}</option>
                  <option value="HIGH">{t('tasks.priority_high', 'Ưu Tiên Cao')}</option>
                  <option value="NORMAL">{t('tasks.priority_medium', 'Bình Thường')}</option>
                  <option value="ROUTINE">{t('tasks.priority_routine_shift', 'Định Kỳ Ca')}</option>
                </select>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('tasks.modal_shift', 'Ca Trực Phụ Trách')}</label>
              <select
                aria-label={t('tasks.modal_shift', 'Ca Trực Phụ Trách')}
                value={newShiftId}
                onChange={(e) => setNewShiftId(e.target.value)}
                className="wd-select w-100"
              >
                <option value="">{t('tasks.modal_no_shift', '-- Không chỉ định / Chung trong ngày --')}</option>
                {assignableShifts && assignableShifts.length > 0 ? (
                  assignableShifts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.department_name || s.department_code} — {t('shifts.morning', 'Ca')} {s.shift_type} ({s.start_time?.slice(11, 16)} - {s.end_time?.slice(11, 16)})
                    </option>
                  ))
                ) : null}
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('tasks.due_date', 'Thời Hạn Hoàn Thành')}</label>
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
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              className="wd-pill-btn-primary"
            >
              {t('tasks.modal_confirm', 'Xác Nhận Giao Nhiệm Vụ')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DailyTasks;
