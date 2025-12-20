export type StructuredContent = {
  images: string[];
  captions: string[];
  texts: string[];
  dates: string[];
};

/**
 * Chuẩn hoá chuỗi `content` trước khi parse theo cấu trúc.
 * - Đổi CRLF -> LF
 * - Hỗ trợ người dùng gõ dạng escape ("\\\\--", "\\\\-") rồi quy về token ("\\--", "\\-")
 */
const normalizeDelimiters = (raw: string) => {
  const s = (raw || '').replace(/\r\n/g, '\n');
  const tokenNormalized = s.replace(/\\\\--/g, '\\--').replace(/\\\\-/g, '\\-');
  return tokenNormalized;
};

/** Trả về `true` nếu `content` có token phân tách cấu trúc ("\\-" hoặc "\\--"). */
export const isStructuredContent = (raw: string) => {
  const normalized = normalizeDelimiters(raw);
  return normalized.includes('\\--') || normalized.includes('\\-');
};

/**
 * Tách 1 section thành các slot theo token.
 * Nếu trong chuỗi có token tách slot (ví dụ "\\-"), sẽ giữ cả phần rỗng để hỗ trợ “bỏ qua slot”.
 */
const splitByToken = (raw: string, token: string) => {
  const s = (raw || '').trim();
  if (!s) return [];

  if ((raw || '').includes(token)) {
    return (raw || '').split(token).map((p) => p.trim());
  }

  return [s];
};

/** Chuẩn hoá ngày dạng `D/M/YYYY` thành `DD/MM/YYYY`. Nếu không khớp pattern thì giữ nguyên. */
export const normalizeDate = (raw: string) => {
  const t = (raw || '').trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{1,4})$/);
  if (!m) return t;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Parse `content` theo cấu trúc 4 section, phân tách bởi "\\--" theo thứ tự:
 * Ảnh -> Caption -> Text -> Date.
 * Trong mỗi section, các slot được phân tách bởi "\\-".
 */
export const parseStructuredContent = (raw: string): StructuredContent => {
  const normalized = normalizeDelimiters(raw);

  const sections = normalized.split('\\--').map((s) => s.trim());
  const images = splitByToken(sections[0] ?? '', '\\-');
  const captions = splitByToken(sections[1] ?? '', '\\-');
  const texts = splitByToken(sections[2] ?? '', '\\-');
  const dates = splitByToken(sections[3] ?? '', '\\-').map(normalizeDate);

  return { images, captions, texts, dates };
};
