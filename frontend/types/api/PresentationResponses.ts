// DTOs for Dashboard / Quick Create (Output)
// Matches backend: com.hust.dto.response.PresentationResponse

export interface PresentationResponse {
  id: number;
  title: string;
  ownerUsername: string;
  editedDate: string; // ISO string (Instant serialized)
}