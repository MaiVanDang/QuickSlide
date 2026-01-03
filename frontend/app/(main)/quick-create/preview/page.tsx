'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getTemplateSlidesApi, quickCreateSlideApi } from '@/lib/api';
import { qcStorage } from '@/lib/utils/qc-storage';
import { isStructuredContent, parseStructuredContent } from '@/lib/utils/structured-content';
import type { TemplateSlideResponse } from '@/types/api/TemplateResponses';

type ElementType = 'title' | 'text' | 'image' | 'caption' | 'variable' | 'date';

type TextAlign = 'left' | 'center' | 'right';

type ElementStyle = {
  color: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
};

type TemplateElement = {
  id: number;
  type: ElementType;
  slotIndex?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  style: ElementStyle;
};

const ensureSlotIndexes = (els: TemplateElement[]): TemplateElement[] => {
  const counters = new Map<ElementType, number>();
  return els.map((el) => {
    if (typeof el.slotIndex === 'number' && el.slotIndex > 0) return el;
    const prev = counters.get(el.type) ?? 0;
    const next = prev + 1;
    counters.set(el.type, next);
    return { ...el, slotIndex: next };
  });
};

type QuickCreateFormData = {
  subject: string;
  lesson: string;
  content: string;
};

const CANVAS_W = 800;
const CANVAS_H = 600;

const QC_LAYOUT_KEY = 'quickslide_qc_layout_v1';
const QC_LAYOUTS_KEY = 'quickslide_qc_layouts_v1';
const QC_FORM_KEY = 'quickslide_qc_form_v1';
const QC_TEMPLATE_ID_KEY = 'quickslide_qc_template_id_v1';

const splitSlideBlocks = (raw: string, dropEmpty: boolean) => {
  const normalized = (raw || '').replace(/\r\n/g, '\n');
  if (!normalized.trim()) return [];

  let parts = normalized.split(/\n\s*---\s*\n/g);
  if (parts.length === 1 && normalized.includes('---')) {
    parts = normalized.split(/\s*---\s*/g);
  }

  const out = parts.map((p) => (p || '').trim());
  if (dropEmpty) return out.filter(Boolean);
  return out.some((s) => s.trim()) ? out : [];
};

const parseTitleAndBodyFromBlock = (rawBlock: string) => {
  const normalized = (rawBlock || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return { title: '', body: '' };

  const lines = normalized.split('\n');
  let idx = 0;
  while (idx < lines.length && !String(lines[idx] ?? '').trim()) idx += 1;
  const title = idx < lines.length ? String(lines[idx] ?? '').trim() : '';
  idx += 1;

  const body = lines.slice(idx).join('\n').trim();
  return { title, body };
};

const parseElementsFromLayoutJson = (layoutJson: string | null): TemplateElement[] => {
  if (!layoutJson) return [];
  try {
    const parsed = JSON.parse(layoutJson);
    const elements = Array.isArray(parsed?.elements) ? parsed.elements : [];
    return elements;
  } catch {
    return [];
  }
};

const parseParagraphs = (raw: string) => {
  const normalized = (raw || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const result: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const joined = current.join('\n').trim();
    if (joined) result.push(joined);
    current = [];
  };

  for (const line of lines) {
    const t = line.trim();
    const isHardSeparator = /^(-{3,}|—{3,}|–{3,})$/.test(t);
    const isBulletSeparator = /^-\s+/.test(t);
    if (!t) {
      flush();
      continue;
    }
    if (isHardSeparator) {
      flush();
      continue;
    }
    if (isBulletSeparator) {
      flush();
      current.push(t.replace(/^-\s+/, ''));
      continue;
    }
    current.push(line);
  }
  flush();

  return result;
};

const countTextBoxesInLayoutJson = (layoutJson: string | null) => {
  const els = parseElementsFromLayoutJson(layoutJson);
  return els.filter((e) => e.type === 'text' || e.type === 'caption').length;
};

const resolveElementText = (
  el: TemplateElement,
  form: QuickCreateFormData,
  slideTitle: string,
  assignedTextByElementId: Map<number, string>,
) => {
  if (el.type === 'title') return slideTitle;
  if (assignedTextByElementId.has(el.id)) return assignedTextByElementId.get(el.id) ?? '';
  if (el.type === 'date') return new Date().toLocaleDateString();
  if (el.type === 'image') return '[画像]';

  const raw = (el.text || '').trim();
  if (raw.includes('subject')) return form.subject;
  if (raw.includes('lesson')) return form.lesson;
  if (raw.includes('date')) return new Date().toLocaleDateString();
  return raw || '';
};

export const dynamic = 'force-dynamic';

export default function QuickCreatePreviewPage() {
  const router = useRouter();

  const [layoutJson, setLayoutJson] = React.useState<string | null>(null);
  const [elements, setElements] = React.useState<TemplateElement[]>([]);
  const [formData, setFormData] = React.useState<QuickCreateFormData | null>(null);
  const [templateId, setTemplateId] = React.useState<number | null>(null);
  const [templateSlides, setTemplateSlides] = React.useState<TemplateSlideResponse[] | null>(null);
  const [customLayoutJsons, setCustomLayoutJsons] = React.useState<string[] | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [isLoadingTemplateSlides, setIsLoadingTemplateSlides] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const contentBlocks = React.useMemo(() => splitSlideBlocks(formData?.content ?? '', true), [formData?.content]);
  const hasPerSlideContents = contentBlocks.length > 1;
  const explicitSlideCount = Math.max(contentBlocks.length, 1);

  const previewSlideCount = templateSlides && templateSlides.length > 0
    ? templateSlides.length
    : customLayoutJsons && customLayoutJsons.length > 0
      ? customLayoutJsons.length
      : explicitSlideCount;
  const showNav = previewSlideCount > 1;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedLayoutsRaw = qcStorage.get(QC_LAYOUTS_KEY);
    if (savedLayoutsRaw) {
      try {
        const parsed = JSON.parse(savedLayoutsRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => typeof x === 'string')) {
          setCustomLayoutJsons(parsed);
        } else {
          setCustomLayoutJsons(null);
        }
      } catch {
        setCustomLayoutJsons(null);
      }
    } else {
      setCustomLayoutJsons(null);
    }

    const savedLayout = qcStorage.get(QC_LAYOUT_KEY);
    const savedForm = qcStorage.get(QC_FORM_KEY);

    if (!savedLayout) {
      router.replace('/quick-create');
      return;
    }
    if (!savedForm) {
      router.replace('/quick-create/form');
      return;
    }

    const initialLayout = (savedLayoutsRaw && (() => {
      try {
        const parsed = JSON.parse(savedLayoutsRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return parsed[0];
      } catch {
        return null;
      }
      return null;
    })()) || savedLayout;

    setLayoutJson(initialLayout);
    setElements(ensureSlotIndexes(parseElementsFromLayoutJson(initialLayout)));

    const templateIdRaw = qcStorage.get(QC_TEMPLATE_ID_KEY);
    const nextTemplateId = templateIdRaw ? Number(templateIdRaw) : null;
    setTemplateId(nextTemplateId && Number.isFinite(nextTemplateId) ? nextTemplateId : null);

    try {
      const parsed = JSON.parse(savedForm);
      setFormData({
        subject: parsed.subject ?? '',
        lesson: parsed.lesson ?? '',
        content: parsed.content ?? '',
      });
    } catch {
      router.replace('/quick-create/form');
    }
  }, [router]);

  React.useEffect(() => {
    if (activeSlideIndex >= previewSlideCount) setActiveSlideIndex(0);
  }, [activeSlideIndex, previewSlideCount]);

  React.useEffect(() => {
    if (!templateId) {
      setTemplateSlides(null);
      setActiveSlideIndex(0);
      return;
    }

    // Template deck takes precedence over custom layout list
    setCustomLayoutJsons(null);

    const run = async () => {
      try {
        setIsLoadingTemplateSlides(true);
        setError(null);

        const res = await getTemplateSlidesApi(templateId);
        const slides = (res.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setTemplateSlides(slides);
        setActiveSlideIndex(0);

        const firstLayout = slides[0]?.layoutJson ?? null;
        if (firstLayout) {
          setLayoutJson(firstLayout);
          setElements(ensureSlotIndexes(parseElementsFromLayoutJson(firstLayout)));
        }
      } catch (e) {
        console.error('Load template slides failed', e);
        setTemplateSlides(null);
      } finally {
        setIsLoadingTemplateSlides(false);
      }
    };

    run();
  }, [templateId]);

  const goToSlide = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= previewSlideCount) return;
    setActiveSlideIndex(nextIndex);

    const nextLayout = templateSlides?.[nextIndex]?.layoutJson
      ?? customLayoutJsons?.[nextIndex]
      ?? null;
    if (nextLayout) {
      setLayoutJson(nextLayout);
      setElements(ensureSlotIndexes(parseElementsFromLayoutJson(nextLayout)));
    }
  };

  const handleCreate = async () => {
    if (!formData || !layoutJson) return;

    try {
      setIsCreating(true);
      setError(null);

      const blocks = splitSlideBlocks(formData.content, true);
      const firstBlock = blocks[0] ?? formData.content;
      const firstParsed = parseTitleAndBodyFromBlock(firstBlock);
      const requestTitle = firstParsed.title?.trim() ?? '';

      if (!requestTitle) {
        setError('内容の1行目にタイトルを入力してください。');
        return;
      }

      // Backend requires `title` not blank.
      // - If user split content by "---", backend will parse each block (first line = title).
      // - If not split, we send body-only content so the title line isn't duplicated into slide text.
      const requestContent = blocks.length > 1 ? formData.content : firstParsed.body;
      const basePayload = { ...formData, title: requestTitle, content: requestContent };

      const res = await quickCreateSlideApi(
        templateId && Number.isFinite(templateId)
          ? {
              ...basePayload,
              templateId,
            }
          : {
              ...basePayload,
              ...(customLayoutJsons && customLayoutJsons.length > 0
                ? { layoutJsons: customLayoutJsons }
                : { layoutJson }),
            },
      );

      qcStorage.remove(QC_FORM_KEY);

      router.push(`/editor/presentations/${res.data.id}`);
    } catch (err: any) {
      console.error('Quick create failed', err);
      setError('タイトルのみで本文がありません。内容を入力してください。');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">プレビュー</h1>
          <p className="text-sm text-gray-600">作成前にレイアウトを確認</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/quick-create/form')} variant="outline" className="border-gray-300">
            戻る
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !formData} className="bg-blue-600 hover:bg-blue-700">
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                スライドを作成
              </>
            )}
          </Button>
        </div>
      </div>

      {showNav && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            スライド {activeSlideIndex + 1}/{previewSlideCount}
            {templateSlides && isLoadingTemplateSlides ? '（読み込み中...）' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="border-gray-300" disabled={activeSlideIndex <= 0} onClick={() => goToSlide(activeSlideIndex - 1)}>
              前へ
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-gray-300"
              disabled={activeSlideIndex >= previewSlideCount - 1}
              onClick={() => goToSlide(activeSlideIndex + 1)}
            >
              次へ
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="border border-gray-200 p-6 bg-white">
        <div className="mx-auto relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
          {/* Sửa nền slide tại đây */}
          <div
            className="absolute inset-0 rounded-lg shadow-md overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom right, #ffffff, #f0f9ff)',
              border: '1px solid #e2e8f0'
            }}
          />

          {formData && (() => {
            const globalParsed = parseTitleAndBodyFromBlock(formData.content);
            const globalTitle = globalParsed.title ?? '';
            const globalBody = globalParsed.body ?? '';

            const perSlideParsed = hasPerSlideContents
              ? parseTitleAndBodyFromBlock(contentBlocks[activeSlideIndex] ?? '')
              : globalParsed;
            const perSlideTitle = (perSlideParsed.title ?? '').trim() || globalTitle;
            const perSlideContent = hasPerSlideContents ? (perSlideParsed.body ?? '') : globalBody;
            const slideForm: QuickCreateFormData = { ...formData, content: perSlideContent };

            const assigned = new Map<number, string>();
            if (isStructuredContent(slideForm.content)) {
              const structured = parseStructuredContent(slideForm.content);
              for (const el of elements) {
                const idx = Math.max(0, (el.slotIndex ?? 1) - 1);
                if (el.type === 'text') assigned.set(el.id, structured.texts[idx] ?? '');
                else if (el.type === 'caption') assigned.set(el.id, structured.captions[idx] ?? '');
                else if (el.type === 'image') assigned.set(el.id, structured.images[idx] ?? '[画像]');
                else if (el.type === 'date') assigned.set(el.id, structured.dates[idx] ?? new Date().toLocaleDateString());
              }
            } else {
              const paragraphs = parseParagraphs(slideForm.content);

              // Template deck + không có content tách theo slide => chia đoạn theo số ô text/caption của từng slide (giống backend legacy)
              let startIndex = 0;
              if (templateSlides && templateSlides.length > 0 && !hasPerSlideContents) {
                for (let i = 0; i < activeSlideIndex; i++) {
                  startIndex += countTextBoxesInLayoutJson(templateSlides[i]?.layoutJson ?? null);
                }
              }

              // Đổ nội dung vào các ô dạng text (text/caption) theo thứ tự: trên->dưới, trái->phải
              const textBoxes = elements
                .filter((e) => e.type === 'text' || e.type === 'caption')
                .slice()
                .sort((a, b) => (a.y - b.y) || (a.x - b.x));

              textBoxes.forEach((box, idx) => {
                assigned.set(box.id, paragraphs[startIndex + idx] ?? '');
              });
            }

            return elements.map((el) => {
              const value = resolveElementText(el, slideForm, perSlideTitle, assigned);
              if (el.type === 'image' && typeof value === 'string' && value.startsWith('http')) {
                return (
                  <div
                    key={el.id}
                    className="absolute rounded border border-gray-200 bg-white/90 flex items-center justify-center"
                    style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                  >
                    <img src={value} alt="slide-img" className="max-w-full max-h-full object-contain" />
                  </div>
                );
              }
              return (
                <div
                  key={el.id}
                  className="absolute rounded border border-gray-200 bg-white/90"
                  style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                >
                  <div
                    className="w-full h-full p-2 overflow-hidden"
                    style={{
                      color: el.style?.color || '#111827',
                      fontFamily: el.style?.fontFamily || 'inherit',
                      fontSize: el.style?.fontSize || 16,
                      fontWeight: el.style?.bold ? 700 : 400,
                      fontStyle: el.style?.italic ? 'italic' : 'normal',
                      textDecoration: el.style?.underline ? 'underline' : 'none',
                      textAlign: el.style?.align || 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:
                        el.style?.align === 'left' ? 'flex-start' : el.style?.align === 'center' ? 'center' : 'flex-end',
                    }}
                  >
                    {value}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Card>
    </div>
  );
}