// DTOs cho Template Library (Output)

export interface TemplateResponse {
  id: number;
  name: string;
  description?: string;
  theme?: string;
  ownerUsername: string;
  previewImageUrl?: string;
  isPublic: boolean;
  isOwner: boolean;
  createdAt: string;
  editedAt?: string;
}

export interface TemplateSlideResponse {
  id: number;
  layoutJson: string;
  order: number;
}