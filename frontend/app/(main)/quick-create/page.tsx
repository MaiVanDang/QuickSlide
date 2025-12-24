'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Image as ImageIcon, Layout as LayoutIcon, Shuffle, Save, Trash2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTemplateSlidesApi } from '@/lib/api';
import { qcStorage } from '@/lib/utils/qc-storage';
import type { TemplateSlideResponse } from '@/types/api/TemplateResponses';

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
  style: ElementStyle;
};

const CANVAS_W = 800;
const CANVAS_H = 600;

const QC_LAYOUT_KEY = 'quickslide_qc_layout_v1';
const QC_LAYOUTS_KEY = 'quickslide_qc_layouts_v1';
const QC_FORM_KEY = 'quickslide_qc_form_v1';
const QC_TEMPLATE_ID_KEY = 'quickslide_qc_template_id_v1';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const defaultStyleFor = (type: ElementType): ElementStyle => {
  const baseFontSize = type === 'title' ? 32 : 18;
  return {
    color: '#111827',
    fontFamily: 'Noto Sans JP',
    fontSize: baseFontSize,
    bold: type === 'title',
    italic: false,
    underline: false,
    align: 'left',
  };
};

const defaultBoxFor = (type: ElementType) => {
  switch (type) {
    case 'title':
      return { w: 520, h: 80 };
    case 'text':
      return { w: 520, h: 160 };
    case 'image':
      return { w: 360, h: 220 };
    case 'caption':
      return { w: 360, h: 60 };
    case 'variable':
      return { w: 320, h: 60 };
    case 'date':
      return { w: 260, h: 60 };
    default:
      return { w: 320, h: 80 };
  }
};

const defaultTextFor = (type: ElementType, preset?: 'subject' | 'lesson', slotIndex?: number) => {
  const suffix = typeof slotIndex === 'number' ? ` #${slotIndex}` : '';
  if (type === 'variable') {
    if (preset === 'subject') return '{{科目}}';
    if (preset === 'lesson') return '{{授業}}';
    return '{{variable}}';
  }
  switch (type) {
    case 'title':
      return 'タイトル';
    case 'text':
      return `内容${suffix}`;
    case 'image':
      return `画像${suffix}`;
    case 'caption':
      return `画像キャプション${suffix}`;
    case 'date':
      return '{{date}}';
    default:
      return '';
  }
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

// Deterministic starter layout (avoid Date.now() during SSR to prevent hydration mismatch)
const STARTER_ELEMENTS: TemplateElement[] = [
  {
    id: 1,
    type: 'title',
    x: 40,
    y: 40,
    w: 520,
    h: 80,
    text: defaultTextFor('title'),
    style: defaultStyleFor('title'),
  },
  {
    id: 2,
    type: 'text',
    x: 40,
    y: 140,
    w: 520,
    h: 180,
    text: defaultTextFor('text'),
    style: defaultStyleFor('text'),
  },
];

type LayoutVariant = 0 | 1 | 2 | 3 | 4 | 5;
const VARIANT_COUNT = 6;

const applyLayout = (elements: TemplateElement[], variant: LayoutVariant): TemplateElement[] => {
  const M = 40;
  const G = 20;
  const fullW = CANVAS_W - M * 2;
  const colW = Math.floor((fullW - G) / 2);

  const byType = (t: ElementType) => elements.filter((e) => e.type === t);
  const vars = byType('variable');
  const title = byType('title')[0] ?? null;
  const date = byType('date')[0] ?? null;
  const image = byType('image')[0] ?? null;
  const caption = byType('caption')[0] ?? null;
  const texts = byType('text');

  const varSubject = vars.find((v) => (v.text || '').includes('subject')) ?? vars[0] ?? null;
  const varLesson = vars.find((v) => (v.text || '').includes('lesson')) ?? vars.find((v) => v.id !== varSubject?.id) ?? null;

  const set = new Map<number, Partial<TemplateElement>>();
  const place = (el: TemplateElement | null, next: Partial<TemplateElement>) => {
    if (!el) return;
    set.set(el.id, next);
  };

  // 0) Title top, meta, single column
  if (variant === 0) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });

    let y = metaY + 70;
    if (image) {
      place(image, { x: M, y, w: fullW, h: 240 });
      y += 240 + 10;
      if (caption) {
        place(caption, { x: M, y, w: fullW, h: 60 });
        y += 60 + 20;
      }
    }
    texts.forEach((t, idx) => place(t, { x: M, y: y + idx * 180, w: fullW, h: 160 }));
  }

  // 1) Image right, text left
  if (variant === 1) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    const contentY = metaY + 70;

    if (image) place(image, { x: M + colW + G, y: contentY, w: colW, h: 260 });
    if (caption) place(caption, { x: M + colW + G, y: contentY + 270, w: colW, h: 60 });
    texts.forEach((t, idx) => place(t, { x: M, y: contentY + idx * 180, w: colW, h: 160 }));
  }

  // 2) Image left, text right
  if (variant === 2) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    const contentY = metaY + 70;

    if (image) place(image, { x: M, y: contentY, w: colW, h: 260 });
    if (caption) place(caption, { x: M, y: contentY + 270, w: colW, h: 60 });
    const rightX = M + colW + G;
    texts.forEach((t, idx) => place(t, { x: rightX, y: contentY + idx * 180, w: colW, h: 160 }));
  }

  // 3) Left: title/meta, Right: text
  if (variant === 3) {
    const leftX = M;
    const rightX = M + colW + G;
    place(title, { x: leftX, y: M, w: colW, h: 120 });
    let y = M + 130;
    if (varSubject) {
      place(varSubject, { x: leftX, y, w: colW, h: 50 });
      y += 60;
    }
    if (varLesson) {
      place(varLesson, { x: leftX, y, w: colW, h: 50 });
      y += 60;
    }
    if (date) {
      place(date, { x: leftX, y, w: colW, h: 50 });
      y += 60;
    }
    if (image) place(image, { x: leftX, y, w: colW, h: 220 });
    if (caption) place(caption, { x: leftX, y: y + 230, w: colW, h: 60 });

    texts.forEach((t, idx) => place(t, { x: rightX, y: M + idx * 180, w: colW, h: 160 }));
  }

  // 4) Two-column text under title, optional image bottom
  if (variant === 4) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    const contentY = metaY + 70;

    texts.forEach((t, idx) => {
      const isLeft = idx % 2 === 0;
      const row = Math.floor(idx / 2);
      place(t, { x: isLeft ? M : M + colW + G, y: contentY + row * 180, w: colW, h: 160 });
    });

    const rows = Math.max(1, Math.ceil(texts.length / 2));
    const imgY = contentY + rows * 180 + 10;
    if (image) place(image, { x: M, y: imgY, w: fullW, h: 220 });
    if (caption) place(caption, { x: M, y: imgY + 230, w: fullW, h: 60 });
  }

  // 5) Hero image top
  if (variant === 5) {
    if (image) place(image, { x: M, y: M, w: fullW, h: 260 });
    if (caption) place(caption, { x: M, y: M + 270, w: fullW, h: 60 });
    const titleY = M + (caption ? 340 : 290);
    place(title, { x: M, y: titleY, w: fullW, h: 80 });
    const metaY = titleY + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    const contentY = metaY + 70;
    texts.forEach((t, idx) => place(t, { x: M, y: contentY + idx * 160, w: fullW, h: 140 }));
  }

  return elements.map((el) => {
    const next = set.get(el.id);
    if (!next) return el;
    const w = clamp(next.w ?? el.w, 40, CANVAS_W);
    const h = clamp(next.h ?? el.h, 30, CANVAS_H);
    const x = clamp(next.x ?? el.x, 0, CANVAS_W - w);
    const y = clamp(next.y ?? el.y, 0, CANVAS_H - h);
    return { ...el, ...next, x, y, w, h };
  });
};

// Layout placeholder step for Quick Create
export default function QuickCreatePlaceholderPage() {
  const router = useRouter();

  const canvasRef = React.useRef<HTMLDivElement | null>(null);

  const [elements, setElements] = React.useState<TemplateElement[]>(() => ensureSlotIndexes(STARTER_ELEMENTS));
  const [selectedElementId, setSelectedElementId] = React.useState<number | null>(null);
  const [hasChanges, setHasChanges] = React.useState(true);
  const [layoutVariant, setLayoutVariant] = React.useState<LayoutVariant>(0);

  const [templateId, setTemplateId] = React.useState<number | null>(null);
  const [templateSlides, setTemplateSlides] = React.useState<TemplateSlideResponse[] | null>(null);
  const [isLoadingTemplateSlides, setIsLoadingTemplateSlides] = React.useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [customLayoutJsons, setCustomLayoutJsons] = React.useState<string[]>([]);

  const isTemplateMode = templateId != null;
  const slideCount = isTemplateMode
    ? (templateSlides?.length ?? 1)
    : (customLayoutJsons.length > 0 ? customLayoutJsons.length : 1);
  const showSlideNav = slideCount > 1;

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
    // Reset any previously-entered form data when re-entering layout step
    qcStorage.remove(QC_FORM_KEY);
    const rawTemplateId = qcStorage.get(QC_TEMPLATE_ID_KEY);
    const nextTemplateId = rawTemplateId ? Number(rawTemplateId) : null;

    if (nextTemplateId && Number.isFinite(nextTemplateId)) {
      setTemplateId(nextTemplateId);
      setIsLoadingTemplateSlides(true);
      setHasChanges(false);
      setLayoutVariant(0);
      setActiveSlideIndex(0);

      getTemplateSlidesApi(nextTemplateId)
        .then((res) => {
          const slides = (res.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTemplateSlides(slides);
          const firstLayout = slides[0]?.layoutJson ?? null;
          if (firstLayout) {
            qcStorage.set(QC_LAYOUT_KEY, firstLayout);
            setElements(ensureSlotIndexes(parseElementsFromLayoutJson(firstLayout)));
          } else {
            setElements(ensureSlotIndexes(STARTER_ELEMENTS));
          }
        })
        .catch((err) => {
          console.error('Load template slides failed', err);
          setTemplateSlides(null);
          setTemplateId(null);
          qcStorage.remove(QC_TEMPLATE_ID_KEY);
          setCustomLayoutJsons([JSON.stringify({ elements: ensureSlotIndexes(STARTER_ELEMENTS) })]);
          setElements(ensureSlotIndexes(STARTER_ELEMENTS));
          setHasChanges(true);
        })
        .finally(() => setIsLoadingTemplateSlides(false));
      return;
    }

    setTemplateId(null);
    setTemplateSlides(null);

    const savedLayoutsRaw = qcStorage.get(QC_LAYOUTS_KEY);
    if (savedLayoutsRaw) {
      try {
        const parsed = JSON.parse(savedLayoutsRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => typeof x === 'string')) {
          setCustomLayoutJsons(parsed);
          setActiveSlideIndex(0);
          const loaded = parseElementsFromLayoutJson(parsed[0] ?? null);
          if (loaded.length) {
            setElements(ensureSlotIndexes(loaded));
            setHasChanges(false);
            setLayoutVariant(0);
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    const saved = qcStorage.get(QC_LAYOUT_KEY);
    const loaded = parseElementsFromLayoutJson(saved);
    if (loaded.length) {
      setCustomLayoutJsons([saved as string]);
      setActiveSlideIndex(0);
      setElements(ensureSlotIndexes(loaded));
      setHasChanges(false);
      setLayoutVariant(0);
      return;
    }

    const starterJson = JSON.stringify({ elements: ensureSlotIndexes(STARTER_ELEMENTS) });
    setCustomLayoutJsons([starterJson]);
    setActiveSlideIndex(0);
    setElements(ensureSlotIndexes(STARTER_ELEMENTS));
    setHasChanges(true);
    setLayoutVariant(0);
  }, []);

  const commitActiveCustomLayout = React.useCallback(() => {
    if (isTemplateMode) return;
    setCustomLayoutJsons((prev) => {
      const next = prev.length ? prev.slice() : [];
      const json = JSON.stringify({ elements });
      const idx = Math.min(activeSlideIndex, Math.max(0, next.length - 1));
      if (next.length === 0) next.push(json);
      else next[idx] = json;
      return next;
    });
  }, [activeSlideIndex, elements, isTemplateMode]);

  const loadSlideAtIndex = React.useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= slideCount) return;
      setSelectedElementId(null);
      setActiveSlideIndex(nextIndex);

      if (isTemplateMode) {
        const lj = templateSlides?.[nextIndex]?.layoutJson ?? null;
        setElements(ensureSlotIndexes(parseElementsFromLayoutJson(lj)));
        setHasChanges(false);
        return;
      }

      setCustomLayoutJsons((prev) => {
        const next = prev.slice();
        // Commit current before switching
        if (next.length) {
          const currentJson = JSON.stringify({ elements });
          const currentIdx = Math.min(activeSlideIndex, next.length - 1);
          next[currentIdx] = currentJson;
        }
        const lj = next[nextIndex] ?? null;
        setElements(ensureSlotIndexes(parseElementsFromLayoutJson(lj)));
        return next;
      });
    },
    [activeSlideIndex, elements, isTemplateMode, slideCount, templateSlides],
  );

  const updateElement = React.useCallback(
    (id: number, updater: (prev: TemplateElement) => TemplateElement) => {
      if (isTemplateMode) return;
      setElements((prev) => prev.map((el) => (el.id === id ? updater(el) : el)));
      setHasChanges(true);
    },
    [isTemplateMode],
  );

  const addElement = (type: ElementType, preset?: 'subject' | 'lesson') => {
    if (isTemplateMode) return;
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const { w, h } = defaultBoxFor(type);

    const style = defaultStyleFor(type);
    if (type === 'caption') {
      style.fontSize = 14;
      style.italic = true;
      style.color = '#374151';
    }

    if (type === 'image') {
      style.bold = true;
      style.align = 'center';
    }

    setElements((prev) => {
      const existingOfType = prev.filter((e) => e.type === type);
      const maxSlotIndex = Math.max(0, ...existingOfType.map((e) => e.slotIndex ?? 0));
      const slotIndex = maxSlotIndex > 0 ? maxSlotIndex + 1 : existingOfType.length + 1;

      const newElement: TemplateElement = {
        id,
        type,
        slotIndex,
        x: 40,
        y: 40,
        w,
        h,
        text: defaultTextFor(type, preset, slotIndex),
        style,
      };

      return applyLayout([...prev, newElement], layoutVariant);
    });
    setSelectedElementId(id);
    setHasChanges(true);
  };

  const deleteSelected = () => {
    if (isTemplateMode) return;
    if (!selectedElementId) return;
    setElements((prev) => applyLayout(prev.filter((el) => el.id !== selectedElementId), layoutVariant));
    setSelectedElementId(null);
    setHasChanges(true);
  };

  const getCanvasPoint = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: e.clientX, y: e.clientY };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDownElement = (e: React.MouseEvent, element: TemplateElement) => {
    if (isTemplateMode) return;
    e.stopPropagation();
    setSelectedElementId(element.id);

    const target = e.target as HTMLElement;
    if (target?.dataset?.resizeHandle === 'true') return;

    const pt = getCanvasPoint(e);
    setDragging({
      id: element.id,
      offsetX: pt.x - element.x,
      offsetY: pt.y - element.y,
    });
  };

  const onMouseDownResize = (e: React.MouseEvent, element: TemplateElement) => {
    if (isTemplateMode) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = getCanvasPoint(e);
    setSelectedElementId(element.id);
    setResizing({
      id: element.id,
      startW: element.w,
      startH: element.h,
      startFontSize: element.style.fontSize,
      startMouseX: pt.x,
      startMouseY: pt.y,
    });
  };

  const onMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isTemplateMode) return;
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

  const addSlide = () => {
    if (isTemplateMode) return;
    // Commit current
    commitActiveCustomLayout();
    setCustomLayoutJsons((prev) => {
      const next = prev.length ? prev.slice() : [];
      next.push(JSON.stringify({ elements: ensureSlotIndexes(STARTER_ELEMENTS) }));
      return next;
    });
    const nextIndex = slideCount;
    setActiveSlideIndex(nextIndex);
    setSelectedElementId(null);
    setElements(ensureSlotIndexes(STARTER_ELEMENTS));
    setHasChanges(true);
  };

  const deleteSlide = () => {
    if (isTemplateMode) return;
    if (slideCount <= 1) return;
    const currentJson = JSON.stringify({ elements });
    const nextLayouts = (customLayoutJsons.length ? customLayoutJsons.slice() : [currentJson]);
    const currentIdx = Math.min(activeSlideIndex, nextLayouts.length - 1);
    nextLayouts[currentIdx] = currentJson;
    nextLayouts.splice(activeSlideIndex, 1);
    if (nextLayouts.length === 0) nextLayouts.push(JSON.stringify({ elements: ensureSlotIndexes(STARTER_ELEMENTS) }));

    const nextIndex = Math.max(0, Math.min(activeSlideIndex, nextLayouts.length - 1));
    setCustomLayoutJsons(nextLayouts);
    setActiveSlideIndex(nextIndex);
    setSelectedElementId(null);
    const loaded = parseElementsFromLayoutJson(nextLayouts[nextIndex] ?? null);
    setElements(loaded.length ? ensureSlotIndexes(loaded) : ensureSlotIndexes(STARTER_ELEMENTS));
    setHasChanges(true);
  };

  const saveLayoutAndContinue = () => {
    if (isTemplateMode) {
      // Using template deck; placeholder step is just for reviewing layouts.
      router.push('/quick-create/form');
      return;
    }

    const currentJson = JSON.stringify({ elements });
    const nextLayouts = customLayoutJsons.length ? customLayoutJsons.slice() : [currentJson];
    const idx = Math.min(activeSlideIndex, nextLayouts.length - 1);
    nextLayouts[idx] = currentJson;

    qcStorage.set(QC_LAYOUTS_KEY, JSON.stringify(nextLayouts));
    qcStorage.set(QC_LAYOUT_KEY, nextLayouts[0]);
    qcStorage.remove(QC_TEMPLATE_ID_KEY);
    setHasChanges(false);
    router.push('/quick-create/form');
  };

  const chooseTemplateFromLibrary = () => {
    router.push('/templates?select=quick-create');
  };

  const cycleAutoLayout = () => {
    if (isTemplateMode) return;
    const next = (((layoutVariant + 1) % VARIANT_COUNT) as LayoutVariant);
    setLayoutVariant(next);
    setElements((prev) => applyLayout(prev, next));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-gray-900">レイアウト作成</h1>
          <p className="text-sm text-gray-600">新しいレイアウトを作成するか、テンプレートライブラリから選択</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/dashboard')} variant="outline" className="border-gray-300">
            キャンセル
          </Button>
          <Button onClick={cycleAutoLayout} variant="outline" className="border-gray-300" disabled={isTemplateMode || elements.length === 0}>
            <Shuffle className="w-4 h-4 mr-2" />
            自動レイアウト
          </Button>
          <Button onClick={chooseTemplateFromLibrary} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <LayoutIcon className="w-4 h-4 mr-2" />
            テンプレートを選択
          </Button>
          <Button onClick={saveLayoutAndContinue} disabled={elements.length === 0} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            保存して続行
          </Button>
        </div>
      </div>

      <div className={
        showSlideNav
          ? 'grid grid-cols-1 lg:grid-cols-[180px_1fr_320px] gap-6'
          : 'grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6'
      }>
        {showSlideNav && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-700 mb-3">
              スライド: {slideCount}
              {isTemplateMode && isLoadingTemplateSlides ? '（読み込み中...）' : ''}
            </div>
            <div className="space-y-2">
              {Array.from({ length: slideCount }).map((_, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant={idx === activeSlideIndex ? 'default' : 'outline'}
                  className={idx === activeSlideIndex ? 'w-full justify-start bg-blue-600 hover:bg-blue-700' : 'w-full justify-start border-gray-300'}
                  onClick={() => loadSlideAtIndex(idx)}
                >
                  スライド {idx + 1}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div
            ref={canvasRef}
            className="relative mx-auto select-none"
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onMouseMove={onMouseMoveCanvas}
            onMouseUp={onMouseUpCanvas}
            onMouseLeave={onMouseUpCanvas}
            onMouseDown={() => (isTemplateMode ? null : setSelectedElementId(null))}
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
                      color: el.style.color,
                      fontFamily: el.style.fontFamily,
                      fontSize: el.style.fontSize,
                      fontWeight: el.style.bold ? 700 : 400,
                      fontStyle: el.style.italic ? 'italic' : 'normal',
                      textDecoration: el.style.underline ? 'underline' : 'none',
                      textAlign: el.style.align,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: el.style.align === 'left' ? 'flex-start' : el.style.align === 'center' ? 'center' : 'flex-end',
                    }}
                  >
                    {el.text || ''}
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

        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div>
            <div className="text-sm text-gray-700 mb-2">プレースホルダーを追加</div>

            {!isTemplateMode && (
              <div className="flex items-center gap-2 mb-3">
                <Button type="button" variant="outline" className="border-gray-300" onClick={addSlide}>
                  スライドを追加
                </Button>
                <Button type="button" variant="outline" className="border-gray-300" disabled={slideCount <= 1} onClick={deleteSlide}>
                  スライドを削除
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => addElement('title')} disabled={isTemplateMode}>
                <Type className="w-4 h-4 mr-2" />
                タイトル
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => addElement('text')} disabled={isTemplateMode}>
                内容
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => addElement('image')} disabled={isTemplateMode}>
                <ImageIcon className="w-4 h-4 mr-2" />
                画像
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => addElement('caption')} disabled={isTemplateMode}>
                キャプション
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => addElement('variable', 'subject')} disabled={isTemplateMode}>
                {'{{科目}}'}
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => addElement('variable', 'lesson')} disabled={isTemplateMode}>
                {'{{授業}}'}
              </Button>
              <Button variant="outline" className="justify-start col-span-2" onClick={() => addElement('date')} disabled={isTemplateMode}>
                <Calendar className="w-4 h-4 mr-2" />
                日付
              </Button>
            </div>
          </div>

          {selectedElement ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">選択中: {selectedElement.type}</div>
                <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50" onClick={deleteSelected} disabled={isTemplateMode}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除
                </Button>
              </div>

              <div className="space-y-2">
                <Label>表示内容</Label>
                <Input
                  value={selectedElement.text || ''}
                  disabled={isTemplateMode}
                  onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, text: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">編集するプレースホルダーを選択してください。</p>
          )}

          {hasChanges && <p className="text-xs text-gray-500">未保存の変更があります。</p>}
        </div>
      </div>
    </div>
  );
}