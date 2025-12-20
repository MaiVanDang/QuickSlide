import axiosClient from './axios-client';
import { LoginRequest, RegisterRequest } from '@/types/api/AuthRequests';
import { AuthResponse } from '@/types/api/AuthResponses';
import { PresentationResponse } from '@/types/api/PresentationResponses';
import { TemplateResponse, TemplateSlideResponse } from '@/types/api/TemplateResponses';
import { TemplateCreateRequest } from '@/types/api/TemplateRequests';
import { QuickCreateRequest } from '@/types/api/SlideRequests';
import { BatchGenerateRequest, SlideDataDTO } from '@/types/api/BatchRequests';
import { SlideResponse } from '@/types/api/SlideResponses';
import { CreatePresentationFromTemplateRequest } from '@/types/api/PresentationRequests';

// --- API: Auth ---

export const loginApi = (data: LoginRequest) => {
  return axiosClient.post<AuthResponse>('/auth/login', data);
};

export const registerApi = (data: RegisterRequest) => {
  return axiosClient.post('/auth/register', data);
};

// --- API: Dashboard/Projects ---

export const getRecentProjectsApi = () => {
  // Endpoint: GET /api/presentations/recents
  return axiosClient.get<PresentationResponse[]>('/presentations/recents');
};

export const createPresentationFromTemplateApi = (data: CreatePresentationFromTemplateRequest) => {
  // Endpoint: POST /api/presentations/from-template
  return axiosClient.post<PresentationResponse>('/presentations/from-template', data);
};

// --- API: Templates ---

export const getTemplatesApi = (type: 'public' | 'mine' = 'public') => {
  // Endpoint: GET /api/templates?type=public|mine
  return axiosClient.get<TemplateResponse[]>('/templates', { params: { type } });
};

export const createTemplateApi = (data: TemplateCreateRequest) => {
  // Endpoint: POST /api/templates
  return axiosClient.post<TemplateResponse>('/templates', data);
};

export const deleteTemplateApi = (id: number) => {
  // Endpoint: DELETE /api/templates/{id}
  return axiosClient.delete(`/templates/${id}`);
};

export const getTemplateSlidesApi = (templateId: number) => {
  // Endpoint: GET /api/templates/{id}/slides
  return axiosClient.get<TemplateSlideResponse[]>(`/templates/${templateId}/slides`);
};

export const getTemplateApi = (templateId: number) => {
  // Endpoint: GET /api/templates/{id}
  return axiosClient.get<TemplateResponse>(`/templates/${templateId}`);
};

export const updateTemplateApi = (templateId: number, data: TemplateCreateRequest) => {
  // Endpoint: PUT /api/templates/{id}
  return axiosClient.put<TemplateResponse>(`/templates/${templateId}`, data);
};

export const quickCreateSlideApi = (data: QuickCreateRequest) => {
  // Endpoint: POST /api/slides/quick-create
  return axiosClient.post<PresentationResponse>('/slides/quick-create', data);
};

// --- API: Slides (Editor) ---

export const getSlidesByProjectApi = (projectId: number) => {
  // Endpoint: GET /api/slides/project/{projectId}
  return axiosClient.get<SlideResponse[]>(`/slides/project/${projectId}`);
};

export const addSlideToProjectApi = (projectId: number) => {
  // Endpoint: POST /api/slides/project/{projectId}
  return axiosClient.post<SlideResponse>(`/slides/project/${projectId}`);
};

export const updateSlideApi = (slideId: number, data: { title: string; content: string; updatedContentJson?: string }) => {
  // Endpoint: PUT /api/slides/{id}
  return axiosClient.put<void>(`/slides/${slideId}`, data);
};

export const deleteSlideApi = (slideId: number) => {
  // Endpoint: DELETE /api/slides/{id}
  return axiosClient.delete<void>(`/slides/${slideId}`);
};

// --- API: Export ---

export const exportPresentationApi = (presentationId: number, data: { fileName: string; formats: string[]; font?: string }) => {
  // Endpoint: POST /api/presentations/{id}/export
  return axiosClient.post<Blob>(`/presentations/${presentationId}/export`, data, { responseType: 'blob' });
};

// --- API: Batch ---

export const uploadBatchFileApi = (file: File) => {
  // Endpoint: POST /api/batch/upload (multipart/form-data)
  const form = new FormData();
  form.append('file', file);
  return axiosClient.post<SlideDataDTO[]>('/batch/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const generateBatchSlidesApi = (data: BatchGenerateRequest) => {
  // Endpoint: POST /api/batch/generate
  return axiosClient.post<PresentationResponse[]>('/batch/generate', data);
};

// ... Có thể bổ sung thêm các hàm API khác khi cần.