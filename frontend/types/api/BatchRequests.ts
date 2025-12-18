// DTOs cho Tạo Hàng loạt

export interface SlideDataDTO {
  name: string;
  content: string;
  isError?: boolean;
  errorMessage?: string;
}

export interface BatchGenerateRequest {
  slides: SlideDataDTO[];
  // Preferred: apply a template deck (multiple slides). Backend will cap slide count to the deck size.
  templateId?: number;
  templateSlideId?: number;
}