export interface QuickCreateRequest {
  subject: string;
  lesson: string;
  title: string;
  content: string;
  templateId?: number;
  layoutJson?: string;
  layoutJsons?: string[];
}
