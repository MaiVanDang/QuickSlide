// DTO for creating/updating templates from frontend
export interface TemplateSlideRequest {
  layoutJson: string;
  order?: number;
}

export interface TemplateCreateRequest {
  name: string;
  theme?: string;
  description?: string;
  previewImageUrl?: string;
  slides?: TemplateSlideRequest[];
}
