// DTOs cho Tạo/Cập nhật Dự án và Export

export interface PresentationRequest {
  title: string;
  description?: string;
  templateId?: number; 
  
  // Cho Export (Màn hình No. 8)
  formats?: string[]; // PDF, PNG, PPTX
  font?: string; 
  presentationId?: number; // Dùng để xác định dự án cần xuất
}

export interface SlideContentRequest {
  slideId: number;
  title?: string;
  content?: string;
  layoutJson?: string;
}

export interface CreatePresentationFromTemplateRequest {
  templateId: number;
  title?: string;
}