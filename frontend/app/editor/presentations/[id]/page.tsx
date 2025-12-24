'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, ChevronLeft, ChevronRight, Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { addSlideToProjectApi, deleteSlideApi, getSlidesByProjectApi, updateSlideApi } from '@/lib/api';
import { SlideResponse } from '@/types/api/SlideResponses';
import { isStructuredContent, parseStructuredContent } from '@/lib/utils/structured-content';
import { qcStorage } from '@/lib/utils/qc-storage';
export const dynamic = 'force-dynamic';

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
  // When true, render `text` literally instead of auto-filled (batch/quick-create) content.
  manualText?: boolean;
  style: ElementStyle;
};

type SlideModel = {
  id: number;
  slideIndex: number;
  contentJson: string;
};

const CANVAS_W = 800;
const CANVAS_H = 600;

const FALLBACK_ELEMENTS: TemplateElement[] = [
  {
    id: 1,
    type: 'title',
    slotIndex: 1,
    x: 40,
    y: 40,
    w: 720,
    h: 90,
    text: 'タイトル',
    style: {
      color: '#111827',
      fontFamily: 'inherit',
      fontSize: 40,
      bold: true,
      italic: false,
      underline: false,
      align: 'left',
    },
  },
  {
    id: 2,
    type: 'text',
    slotIndex: 1,
    x: 40,
    y: 150,
    w: 720,
    h: 360,
    text: '内容',
    style: {
      color: '#111827',
      fontFamily: 'inherit',
      fontSize: 18,
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
    },
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toNumberOr = (raw: string, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
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

const parseSlideContentJson = (contentJson: string | null | undefined) => {
  const empty = { layoutKey: 'layout' as 'layout' | 'template', elements: [] as TemplateElement[], data: {} as Record<string, any> };
  if (!contentJson) return empty;
  try {
    const parsed = JSON.parse(contentJson);
    const layoutKey = parsed?.layout ? 'layout' : parsed?.template ? 'template' : 'layout';
    const layout = (parsed?.layout ?? parsed?.template) ?? null;
    const layoutElements = Array.isArray(layout?.elements) ? layout.elements : Array.isArray(parsed?.elements) ? parsed.elements : [];
    const data = (parsed?.data && typeof parsed.data === 'object') ? parsed.data : (parsed && typeof parsed === 'object' ? parsed : {});
    return { layoutKey, elements: ensureSlotIndexes(layoutElements as TemplateElement[]), data: data as Record<string, any> };
  } catch {
    return empty;
  }
};

const resolveElementText = (
  el: TemplateElement,
  data: Record<string, any>,
  assignedTextByElementId: Map<number, string>,
) => {
  const title = (typeof data.title === 'string' && data.title) || (typeof data.name === 'string' ? data.name : '');
  const content = typeof data.content === 'string' ? data.content : '';

  const raw = (el.text || '').trim();
  const lower = raw.toLowerCase();
  const looksLikePlaceholder =
    /\{\{\s*[^}]+\s*\}\}/.test(raw) ||
    ['subject', 'lesson', 'date', 'title', 'content'].some((k) => lower.includes(k));

  if (el.type === 'title') return title;

  // Manual override: user wants literal text (but still allow placeholder tokens to resolve).
  if (el.manualText) {
    if (lower.includes('subject')) return typeof data.subject === 'string' ? data.subject : '';
    if (lower.includes('lesson')) return typeof data.lesson === 'string' ? data.lesson : '';
    if (lower.includes('date')) return new Date().toLocaleDateString();
    if (lower.includes('title')) return title;
    if (lower.includes('content')) return content;
    return raw || '';
  }

  // Default behavior: prefer auto-filled batch/import content when available.
  if (assignedTextByElementId.has(el.id)) return assignedTextByElementId.get(el.id) ?? '';
  if (el.type === 'date') return new Date().toLocaleDateString();
  if (el.type === 'image') return '[画像]';

  if (lower.includes('subject')) return typeof data.subject === 'string' ? data.subject : '';
  if (lower.includes('lesson')) return typeof data.lesson === 'string' ? data.lesson : '';
  if (lower.includes('date')) return new Date().toLocaleDateString();
  if (lower.includes('title')) return title;
  if (lower.includes('content')) return content;
  return raw || '';
};

export default function SlideEditorPage() {
  const router = useRouter();
  const params = useParams();
  const idParamRaw = (params as any)?.id as string | string[] | undefined;
  const idParam = Array.isArray(idParamRaw) ? idParamRaw[0] : idParamRaw;
  const presentationId = Number(idParam);

  const BG_CREATED_PRESENTATIONS_KEY = 'quickslide_bg_created_presentations_v1';
  const BG_CREATED_PRESENTATIONS_INDEX_KEY = 'quickslide_bg_created_presentations_index_v1';

  type BatchNavItem = { id: number; title?: string };
  const [batchNav, setBatchNav] = React.useState<{ items: BatchNavItem[]; index: number } | null>(null);

      const [isLoading, setIsLoading] = React.useState(false);
      const [error, setError] = React.useState<string | null>(null);

      const [slides, setSlides] = React.useState<SlideModel[]>([]);
      const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
      const [hasChanges, setHasChanges] = React.useState(false);
      const [showDeleteModal, setShowDeleteModal] = React.useState(false);
      const [showExitModal, setShowExitModal] = React.useState(false);

      const currentSlide = slides[currentSlideIndex] ?? null;
      const parsedCurrent = React.useMemo(() => parseSlideContentJson(currentSlide?.contentJson), [currentSlide?.contentJson]);

      // Editable data imported from Excel/QuickCreate (stored in contentJson.data).
      // This lets users fix wrong values without re-importing.
      const [slideData, setSlideData] = React.useState<Record<string, any>>({});

      const [elements, setElements] = React.useState<TemplateElement[]>([]);
      const [selectedElementId, setSelectedElementId] = React.useState<number | null>(null);

      const canvasRef = React.useRef<HTMLDivElement | null>(null);
      const [dragging, setDragging] = React.useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
      const [resizing, setResizing] = React.useState<{
        id: number;
        startW: number;
        startH: number;
        startFontSize: number;
        startMouseX: number;
        startMouseY: number;
      } | null>(null);

      const selectedElement = React.useMemo(
        () => elements.find((e) => e.id === selectedElementId) ?? null,
        [elements, selectedElementId],
      );

      React.useEffect(() => {
        const load = async () => {
          if (!Number.isFinite(presentationId)) return;
          try {
            setIsLoading(true);
            setError(null);
            const res = await getSlidesByProjectApi(presentationId);
            const apiSlides: SlideResponse[] = res.data || [];
            const mapped: SlideModel[] = apiSlides
              .slice()
              .sort((a, b) => a.slideIndex - b.slideIndex)
              .map((s) => ({ id: s.id, slideIndex: s.slideIndex, contentJson: s.contentJson }));

            setSlides(mapped);
            setCurrentSlideIndex(0);
            setHasChanges(false);
          } catch (e) {
            console.error('Failed to load slides', e);
            setError('スライド一覧を読み込めませんでした。');
          } finally {
            setIsLoading(false);
          }
        };

        load();
      }, [presentationId]);

      React.useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
          const raw = qcStorage.get(BG_CREATED_PRESENTATIONS_KEY);
          if (!raw) {
            setBatchNav(null);
            return;
          }
          const parsed = JSON.parse(raw);
          const items: BatchNavItem[] = Array.isArray(parsed)
            ? parsed
                .map((x: any) => ({ id: Number(x?.id), title: typeof x?.title === 'string' ? x.title : undefined }))
                .filter((x: any) => Number.isFinite(x.id) && x.id > 0)
            : [];

          if (items.length <= 1) {
            setBatchNav(null);
            return;
          }

          const idxFromId = items.findIndex((p) => p.id === presentationId);
          if (idxFromId >= 0) {
            qcStorage.set(BG_CREATED_PRESENTATIONS_INDEX_KEY, String(idxFromId));
            setBatchNav({ items, index: idxFromId });
            return;
          }

          // Nếu user mở presentation khác không thuộc batch -> ẩn nav.
          setBatchNav(null);
        } catch {
          setBatchNav(null);
        }
      }, [presentationId]);

      React.useEffect(() => {
        // Khi đổi slide: reset selection và nạp elements từ contentJson
        setSelectedElementId(null);
        const next = (parsedCurrent.elements && parsedCurrent.elements.length > 0)
          ? parsedCurrent.elements
          : FALLBACK_ELEMENTS;
        setElements(next);
        // Clone to avoid accidental mutations.
        setSlideData({ ...(parsedCurrent.data || {}) });
      }, [currentSlideIndex, parsedCurrent.elements]);

      const setSlideIndexSafe = (nextIndex: number) => {
        if (nextIndex === currentSlideIndex) return;
        if (hasChanges) {
          const ok = window.confirm('未保存の変更があります。スライドを切り替えると変更が失われます。続行しますか？');
          if (!ok) return;
          setHasChanges(false);
        }
        setCurrentSlideIndex(nextIndex);
      };

      const updateElement = React.useCallback(
        (id: number, updater: (prev: TemplateElement) => TemplateElement) => {
          setElements((prev) => prev.map((el) => (el.id === id ? updater(el) : el)));
          setHasChanges(true);
        },
        [],
      );

      const getCanvasPoint = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: e.clientX, y: e.clientY };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const onMouseDownElement = (e: React.MouseEvent, element: TemplateElement) => {
        e.stopPropagation();
        setSelectedElementId(element.id);

        const target = e.target as HTMLElement;
        if (target?.dataset?.resizeHandle === 'true') return;

        const pt = getCanvasPoint(e);
        setDragging({ id: element.id, offsetX: pt.x - element.x, offsetY: pt.y - element.y });
      };

      const onMouseDownResize = (e: React.MouseEvent, element: TemplateElement) => {
        e.preventDefault();
        e.stopPropagation();
        const pt = getCanvasPoint(e);
        setSelectedElementId(element.id);
        setResizing({
          id: element.id,
          startW: element.w,
          startH: element.h,
          startFontSize: element.style?.fontSize ?? 16,
          startMouseX: pt.x,
          startMouseY: pt.y,
        });
      };

      const onMouseMoveCanvas = (e: React.MouseEvent) => {
        if (dragging) {
          const pt = getCanvasPoint(e);
          updateElement(dragging.id, (el) => {
            const nextX = clamp(pt.x - dragging.offsetX, 0, CANVAS_W - el.w);
            const nextY = clamp(pt.y - dragging.offsetY, 0, CANVAS_H - el.h);
            return { ...el, x: nextX, y: nextY };
          });
          return;
        }

        if (resizing) {
          const pt = getCanvasPoint(e);
          const dx = pt.x - resizing.startMouseX;
          const dy = pt.y - resizing.startMouseY;
          const nextW = clamp(resizing.startW + dx, 40, CANVAS_W);
          const nextH = clamp(resizing.startH + dy, 30, CANVAS_H);
          const scale = resizing.startH > 0 ? nextH / resizing.startH : 1;

          updateElement(resizing.id, (el) => ({
            ...el,
            w: nextW,
            h: nextH,
            style: {
              ...el.style,
              fontSize: clamp(Math.round(resizing.startFontSize * scale), 6, 200),
            },
          }));
        }
      };

      const onMouseUpCanvas = () => {
        if (dragging) setDragging(null);
        if (resizing) setResizing(null);
      };

      const handleAddSlide = () => {
        const run = async () => {
          try {
            const res = await addSlideToProjectApi(presentationId);
            setSlides((prev) => [...prev, { id: res.data.id, slideIndex: res.data.slideIndex, contentJson: res.data.contentJson }]);
            setCurrentSlideIndex(slides.length);
            setHasChanges(false);
          } catch (e) {
            console.error('Add slide failed', e);
            alert('スライドの追加に失敗しました。');
          }
        };
        run();
      };

      const handleDeleteSlide = () => {
        if (slides.length === 1) return;
        setShowDeleteModal(true);
      };

      const confirmDelete = () => {
        const run = async () => {
          try {
            const target = slides[currentSlideIndex];
            if (!target) return;
            await deleteSlideApi(target.id);
            const nextSlides = slides.filter((_, index) => index !== currentSlideIndex);
            setSlides(nextSlides);
            setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
            setShowDeleteModal(false);
            setHasChanges(false);
          } catch (e) {
            console.error('Delete slide failed', e);
            alert('スライドの削除に失敗しました。');
          }
        };
        run();
      };

      const handleSave = async () => {
        if (!currentSlide) return;

        const data = slideData || {};
        const title = (typeof data.title === 'string' && data.title) || (typeof data.name === 'string' ? data.name : `スライド ${currentSlideIndex + 1}`);
        const content = typeof data.content === 'string' ? data.content : '';

        const layoutKey = parsedCurrent.layoutKey;
        const updatedContentJson = JSON.stringify({
          [layoutKey]: { elements },
          data,
        });

        try {
          await updateSlideApi(currentSlide.id, { title, content, updatedContentJson });
          setSlides((prev) => prev.map((s, idx) => (idx === currentSlideIndex ? { ...s, contentJson: updatedContentJson } : s)));
          setHasChanges(false);
        } catch (e) {
          console.error('Save slide failed', e);
          alert('スライドの保存に失敗しました。');
        }
      };

      const handleFinish = () => {
        if (hasChanges) {
          alert('完了する前に変更を保存してください。');
          return;
        }
        router.push(`/save-export?presentationId=${presentationId}`);
      };

      const handleExit = () => {
        if (hasChanges) {
          setShowExitModal(true);
        } else {
          router.push('/dashboard');
        }
      };

      const goToBatchPresentation = (nextIndex: number) => {
        if (!batchNav) return;
        if (nextIndex < 0 || nextIndex >= batchNav.items.length) return;

        if (hasChanges) {
          const ok = window.confirm('未保存の変更があります。プレゼンを切り替えると変更が失われます。続行しますか？');
          if (!ok) return;
          setHasChanges(false);
        }

        const nextId = batchNav.items[nextIndex]?.id;
        if (!nextId) return;
        qcStorage.set(BG_CREATED_PRESENTATIONS_INDEX_KEY, String(nextIndex));
        router.push(`/editor/presentations/${nextId}`);
      };

      const assigned = React.useMemo(() => {
        const data = slideData || {};
        const content = typeof data.content === 'string' ? data.content : '';
        const map = new Map<number, string>();

        if (isStructuredContent(content)) {
          const structured = parseStructuredContent(content);
          for (const el of elements) {
            const idx = Math.max(0, (el.slotIndex ?? 1) - 1);
            if (el.type === 'text') map.set(el.id, structured.texts[idx] ?? '');
            else if (el.type === 'caption') map.set(el.id, structured.captions[idx] ?? '');
            else if (el.type === 'image') map.set(el.id, structured.images[idx] ?? '[画像]');
            else if (el.type === 'date') map.set(el.id, structured.dates[idx] ?? new Date().toLocaleDateString());
          }
          return map;
        }

        const paragraphs = parseParagraphs(content);
        const textBoxes = elements
          .filter((e) => e.type === 'text' || e.type === 'caption')
          .slice()
          .sort((a, b) => (a.y - b.y) || (a.x - b.x));
        textBoxes.forEach((box, idx) => map.set(box.id, paragraphs[idx] ?? ''));
        return map;
      }, [elements, slideData]);

      const getSlideLabel = (slide: SlideModel) => {
        const parsed = parseSlideContentJson(slide?.contentJson);
        const data = parsed.data || {};
        return (typeof data.title === 'string' && data.title) || (typeof data.name === 'string' && data.name) || `スライド ${slide.slideIndex}`;
      };

      return (
        <div className="h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleExit} aria-label="終了" className="text-blue-600 hover:text-blue-700">
                  <BookOpen className="w-6 h-6" />
                </button>
                <h1 className="text-xl text-gray-900">プレビュー＆編集</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleExit} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges} className="bg-green-600 hover:bg-green-700 disabled:bg-green-300">
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
                <Button onClick={handleFinish} className="bg-blue-600 hover:bg-blue-700">
                  完了
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden bg-gray-50">
            <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
              <div className="p-4">
                {batchNav && (
                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500 mb-2">プレゼンテーション</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 font-medium truncate">
                          {batchNav.items[batchNav.index]?.title || `第${batchNav.index + 1}回`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {batchNav.index + 1}/{batchNav.items.length}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-2 border-gray-300"
                          disabled={batchNav.index <= 0}
                          onClick={() => goToBatchPresentation(batchNav.index - 1)}
                          aria-label="前へ"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-2 border-gray-300"
                          disabled={batchNav.index >= batchNav.items.length - 1}
                          onClick={() => goToBatchPresentation(batchNav.index + 1)}
                          aria-label="次へ"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm text-gray-700">スライド一覧</h3>
                  <Button onClick={handleAddSlide} variant="ghost" size="icon" className="p-1 hover:bg-gray-100">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-sm text-gray-500">読み込み中...</div>
                ) : error ? (
                  <div className="text-sm text-red-600">{error}</div>
                ) : (
                  <div className="space-y-2">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        onClick={() => setSlideIndexSafe(index)}
                        className={
                          'w-full p-3 rounded-lg text-left transition-colors border-2 ' +
                          (index === currentSlideIndex
                            ? 'bg-blue-100 border-blue-500'
                            : 'bg-gray-50 border-transparent hover:bg-gray-100')
                        }
                      >
                        <div className="text-xs text-gray-500 mb-1">スライド {index + 1}</div>
                        <div className="text-sm text-gray-900 truncate font-medium">{getSlideLabel(slide) || '（無題）'}</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <Button onClick={handleDeleteSlide} disabled={slides.length === 1} variant="outline" className="w-full border-red-600 text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    スライドを削除
                  </Button>
                </div>
              </div>
            </aside>

            <main className="flex-1 overflow-hidden">
              <div className={selectedElement ? 'h-full grid grid-cols-1 lg:grid-cols-[1fr_340px]' : 'h-full'}>
                <div className="h-full overflow-auto p-6">
                  {isLoading ? (
                    <div className="text-sm text-gray-500">読み込み中...</div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : !currentSlide ? (
                    <div className="text-sm text-gray-500">スライドがありません。</div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div
                        ref={canvasRef}
                        className="relative mx-auto select-none"
                        style={{ width: CANVAS_W, height: CANVAS_H }}
                        onMouseMove={onMouseMoveCanvas}
                        onMouseUp={onMouseUpCanvas}
                        onMouseLeave={onMouseUpCanvas}
                        onMouseDown={() => setSelectedElementId(null)}
                      >
                        <div className="absolute inset-0 rounded-lg border border-dashed border-gray-200" />

                        {elements.map((el) => {
                          const isSelected = el.id === selectedElementId;
                          return (
                            <div
                              key={el.id}
                              className={
                                'absolute rounded border bg-white/90 cursor-move ' +
                                (isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400')
                              }
                              style={{ left: el.x, top: el.y, width: el.w, height: el.h }}
                              onMouseDown={(e) => onMouseDownElement(e, el)}
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
                                    el.style?.align === 'left'
                                      ? 'flex-start'
                                      : el.style?.align === 'center'
                                        ? 'center'
                                        : 'flex-end',
                                }}
                              >
                                {resolveElementText(el, slideData || {}, assigned)}
                              </div>

                              <div
                                data-resize-handle="true"
                                className={
                                  'absolute right-0 bottom-0 w-3 h-3 translate-x-1/2 translate-y-1/2 rounded-sm ' +
                                  (isSelected ? 'bg-blue-600' : 'bg-gray-400')
                                }
                                onMouseDown={(e) => onMouseDownResize(e, el)}
                                style={{ cursor: 'nwse-resize' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="h-full border-l border-gray-200 bg-white overflow-auto p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-900 font-medium">データ編集</div>
                      <div className="text-xs text-gray-500">インポート内容を修正（Excelを再編集不要）</div>
                    </div>
                    {selectedElement ? (
                      <Button variant="ghost" size="icon" onClick={() => setSelectedElementId(null)} className="hover:bg-gray-100" aria-label="プレースホルダーの選択解除">
                        <X className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>タイトル</Label>
                        <Input
                          value={String((slideData?.title ?? slideData?.name ?? '') as any)}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSlideData((prev) => ({ ...(prev || {}), title: next }));
                            setHasChanges(true);
                          }}
                          placeholder="スライドのタイトル"
                        />
                      </div>
                      <div>
                        <Label>科目</Label>
                        <Input
                          value={String((slideData?.subject ?? '') as any)}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSlideData((prev) => ({ ...(prev || {}), subject: next }));
                            setHasChanges(true);
                          }}
                          placeholder="例：日本語"
                        />
                      </div>
                      <div>
                        <Label>課</Label>
                        <Input
                          value={String((slideData?.lesson ?? '') as any)}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSlideData((prev) => ({ ...(prev || {}), lesson: next }));
                            setHasChanges(true);
                          }}
                          placeholder="例：第1課"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>内容</Label>
                        <Textarea
                          value={String((slideData?.content ?? '') as any)}
                          onChange={(e) => {
                            const next = e.target.value;
                            setSlideData((prev) => ({ ...(prev || {}), content: next }));
                            setHasChanges(true);
                          }}
                          rows={6}
                          placeholder="Excelからインポートした内容（ここで直接修正できます）"
                        />
                        <div className="text-xs text-gray-500 mt-1">ヒント：改行で段落を分割すると、内容が テキスト/キャプション の枠に自動で割り当てられます。</div>
                      </div>
                    </div>

                    {selectedElement ? (
                      <>
                        <div className="h-px bg-gray-200" />
                        <div>
                          <div className="text-sm text-gray-900 font-medium">プレースホルダーの属性</div>
                          <div className="text-xs text-gray-500">{selectedElement.type}</div>
                        </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>X</Label>
                          <Input
                            value={String(selectedElement.x)}
                            onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, x: clamp(toNumberOr(e.target.value, el.x), 0, CANVAS_W - el.w) }))}
                          />
                        </div>
                        <div>
                          <Label>Y</Label>
                          <Input
                            value={String(selectedElement.y)}
                            onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, y: clamp(toNumberOr(e.target.value, el.y), 0, CANVAS_H - el.h) }))}
                          />
                        </div>
                        <div>
                          <Label>W</Label>
                          <Input
                            value={String(selectedElement.w)}
                            onChange={(e) =>
                              updateElement(selectedElement.id, (el) => {
                                const w = clamp(toNumberOr(e.target.value, el.w), 40, CANVAS_W);
                                const x = clamp(el.x, 0, CANVAS_W - w);
                                return { ...el, w, x };
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>H</Label>
                          <Input
                            value={String(selectedElement.h)}
                            onChange={(e) =>
                              updateElement(selectedElement.id, (el) => {
                                const h = clamp(toNumberOr(e.target.value, el.h), 30, CANVAS_H);
                                const y = clamp(el.y, 0, CANVAS_H - h);
                                return { ...el, h, y };
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label>テキスト（placeholder）</Label>
                        <Input
                          value={selectedElement.text || ''}
                          onChange={(e) =>
                            updateElement(selectedElement.id, (el) => {
                              const nextText = e.target.value;
                              const raw = (nextText || '').trim();
                              const lower = raw.toLowerCase();
                              const looksLikePlaceholder =
                                /\{\{\s*[^}]+\s*\}\}/.test(raw) ||
                                ['subject', 'lesson', 'date', 'title', 'content'].some((k) => lower.includes(k));
                              // Only treat as manual override when user types literal text.
                              const manualText = raw.length > 0 && !looksLikePlaceholder;
                              return { ...el, text: nextText, manualText };
                            })
                          }
                        />
                        <div className="text-xs text-gray-500 mt-1">例：{'{{subject}}'}、{'{{lesson}}'}、{'{{date}}'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>フォントサイズ</Label>
                          <Input
                            value={String(selectedElement.style?.fontSize ?? 16)}
                            onChange={(e) =>
                              updateElement(selectedElement.id, (el) => ({
                                ...el,
                                style: { ...el.style, fontSize: clamp(toNumberOr(e.target.value, el.style?.fontSize ?? 16), 6, 200) },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="element-align">配置</Label>
                          <select
                            id="element-align"
                            aria-label="配置"
                            title="配置"
                            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                            value={selectedElement.style?.align || 'left'}
                            onChange={(e) =>
                              updateElement(selectedElement.id, (el) => ({
                                ...el,
                                style: { ...el.style, align: e.target.value as TextAlign },
                              }))
                            }
                          >
                            <option value="left">左</option>
                            <option value="center">中央</option>
                            <option value="right">右</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <Label>色</Label>
                        <input
                          type="color"
                          className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                          value={selectedElement.style?.color || '#111827'}
                          title="Chọn màu cho văn bản"
                          placeholder="#111827"
                          onChange={(e) =>
                            updateElement(selectedElement.id, (el) => ({
                              ...el,
                              style: { ...el.style, color: e.target.value },
                            }))
                          }
                        />
                        <Input
                          className="mt-2"
                          value={selectedElement.style?.color || '#111827'}
                          onChange={(e) =>
                            updateElement(selectedElement.id, (el) => ({
                              ...el,
                              style: { ...el.style, color: e.target.value },
                            }))
                          }
                        />
                        <div className="text-xs text-gray-500 mt-1">Chọn màu hoặc nhập mã màu (hex)</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          className={selectedElement.style?.bold ? 'border-blue-600 text-blue-600' : ''}
                          onClick={() => updateElement(selectedElement.id, (el) => ({ ...el, style: { ...el.style, bold: !el.style.bold } }))}
                        >
                          太字
                        </Button>
                        <Button
                          variant="outline"
                          className={selectedElement.style?.italic ? 'border-blue-600 text-blue-600' : ''}
                          onClick={() => updateElement(selectedElement.id, (el) => ({ ...el, style: { ...el.style, italic: !el.style.italic } }))}
                        >
                          斜体
                        </Button>
                        <Button
                          variant="outline"
                          className={selectedElement.style?.underline ? 'border-blue-600 text-blue-600' : ''}
                          onClick={() => updateElement(selectedElement.id, (el) => ({ ...el, style: { ...el.style, underline: !el.style.underline } }))}
                        >
                          下線
                        </Button>
                      </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">プレースホルダーを選択して、位置／サイズ／フォントを調整できます。</div>
                    )}
                  </div>
                </aside>
              </div>
            </main>
          </div>

          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>スライドを削除しますか？</DialogTitle>
                <DialogDescription>このスライドは完全に削除されます。</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  キャンセル
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
                  削除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>変更を破棄しますか？</DialogTitle>
                <DialogDescription>未保存の変更があります。終了してもよろしいですか？</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowExitModal(false)}>
                  続ける
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => router.push('/dashboard')}>
                  終了
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
}