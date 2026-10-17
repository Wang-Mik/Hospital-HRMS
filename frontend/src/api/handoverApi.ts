import axiosClient from './axiosClient';

export type HandoverCategory = 'SHIFT_HANDOVER' | 'DEPT_BRIEFING' | 'HOSPITAL_BRIEFING';
export type DocType = 'PHYSICAL_BOOK' | 'IMAGE_UPLOAD' | 'DOCUMENT_LINK' | 'TEXT_NOTES';
export type HandoverStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'COMPLETED';

export interface HandoverFilters {
  logged_by?: string;
  acknowledged_by?: string;
  outgoing_shift_id?: string;
  incoming_shift_id?: string;
  department_code?: string;
  handover_category?: HandoverCategory;
  doc_type?: DocType;
  status?: HandoverStatus | string;
  date?: string;
}

export interface ShiftHandoverRecord {
  id: string;
  outgoing_shift_id?: string | null;
  incoming_shift_id?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  handover_category: HandoverCategory;
  doc_type: DocType;
  file_url?: string | null;
  external_link?: string | null;
  physical_book_name?: string | null;
  physical_book_page?: string | null;
  physical_storage_location?: string | null;
  summary_metrics?: string | null;
  critical_notes?: string | null;
  status: HandoverStatus;
  logged_by: string;
  logged_by_name?: string;
  logged_by_role?: string;
  acknowledged_by?: string | null;
  acknowledged_by_name?: string | null;
  acknowledged_by_role?: string;
  outgoing_shift_type?: string;
  outgoing_start_time?: string;
  outgoing_end_time?: string;
  outgoing_on_call_tier?: string;
  outgoing_team_code?: string;
  incoming_shift_type?: string;
  incoming_start_time?: string;
  incoming_end_time?: string;
  created_at: string;
  updated_at?: string;
  checklists?: Array<{
    id: string;
    handover_id: string;
    item_description: string;
    is_verified: boolean;
  }>;
}

export interface CreateHandoverPayload {
  outgoing_shift_id?: string | null;
  incoming_shift_id?: string | null;
  department_code?: string | null;
  handover_category?: HandoverCategory;
  doc_type?: DocType;
  file_url?: string | null;
  external_link?: string | null;
  physical_book_name?: string | null;
  physical_book_page?: string | null;
  physical_storage_location?: string | null;
  summary_metrics?: any;
  critical_notes?: string | null;
  status?: HandoverStatus;
  logged_by: string;
  acknowledged_by?: string | null;
  checklists?: string[];
}

export const handoverApi = {
  getAll: async (filters?: HandoverFilters): Promise<ShiftHandoverRecord[]> => {
    const res = await axiosClient.get('/handovers', { params: filters });
    return res.data?.data || [];
  },

  getById: async (id: string): Promise<ShiftHandoverRecord> => {
    const res = await axiosClient.get(`/handovers/${id}`);
    return res.data?.data;
  },

  create: async (data: CreateHandoverPayload): Promise<ShiftHandoverRecord> => {
    const res = await axiosClient.post('/handovers', data);
    return res.data?.data;
  },

  update: async (id: string, data: Partial<CreateHandoverPayload>): Promise<ShiftHandoverRecord> => {
    const res = await axiosClient.patch(`/handovers/${id}`, data);
    return res.data?.data;
  },

  sign: async (id: string, acknowledged_by: string): Promise<ShiftHandoverRecord> => {
    const res = await axiosClient.post(`/handovers/${id}/sign`, { acknowledged_by });
    return res.data?.data;
  },

  updateChecklistItem: async (itemId: string, is_verified: boolean) => {
    const res = await axiosClient.patch(`/handovers/checklists/${itemId}`, { is_verified });
    return res.data?.data;
  },

  addChecklistItem: async (handoverId: string, item_description: string) => {
    const res = await axiosClient.post(`/handovers/${handoverId}/checklists`, { item_description });
    return res.data?.data;
  }
};

export default handoverApi;
