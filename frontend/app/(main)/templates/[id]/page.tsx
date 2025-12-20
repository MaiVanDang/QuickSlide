'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, Calendar, Image as ImageIcon, Layout, Save, Trash2, Type, Variable, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { createTemplateApi, deleteTemplateApi, getTemplateApi, getTemplateSlidesApi, updateTemplateApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

type ElementType = 'title' | 'text' | 'image' | 'caption' | 'variable' | 'date';

type LayoutVariant =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19;
const VARIANT_COUNT = 20;

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toNumberOr = (raw: string, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

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
      return { w: 520, h: 140 };
    case 'image':
      return { w: 260, h: 180 };
    case 'caption':
      return { w: 520, h: 60 };
    case 'variable':
      return { w: 320, h: 60 };
    case 'date':
      return { w: 260, h: 60 };
    default:
      return { w: 320, h: 80 };
  }
};

const defaultTextFor = (type: ElementType, slotIndex?: number) => {
  const suffix = typeof slotIndex === 'number' ? ` #${slotIndex}` : '';
  switch (type) {
    case 'title':
      return 'Tiêu đề';
    case 'text':
      return `Nội dung${suffix}`;
    case 'caption':
      return `Chú thích${suffix}`;
    case 'variable':
      return '{{variable}}';
    case 'image':
      return `Ảnh${suffix}`;
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

const parseElementsFromLayoutJson = (layoutJson: string | null | undefined): TemplateElement[] => {
  if (!layoutJson) return [];
  try {
    const parsed = JSON.parse(layoutJson);
    const elements = Array.isArray(parsed?.elements) ? parsed.elements : [];
    return elements;
  } catch {
    return [];
  }
};

const applyLayout = (elements: TemplateElement[], variant: LayoutVariant): TemplateElement[] => {
  const M = 40;
  const G = 20;
  const fullW = CANVAS_W - M * 2;
  const colW = Math.floor((fullW - G) / 2);
  const rowH = 160;

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

  // 6) Title + hero image, two-column text below
  if (variant === 6) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    const heroY = metaY + 70;
    if (image) place(image, { x: M, y: heroY, w: fullW, h: 240 });
    if (caption) place(caption, { x: M, y: heroY + 250, w: fullW, h: 60 });
    const contentY = heroY + (image ? 320 : 0);
    texts.forEach((t, idx) => {
      const isLeft = idx % 2 === 0;
      const row = Math.floor(idx / 2);
      place(t, { x: isLeft ? M : M + colW + G, y: contentY + row * 180, w: colW, h: rowH });
    });
  }

  // 7) Title top, text stack, image bottom
  if (variant === 7) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (date) place(date, { x: M + fullW - 200, y: metaY, w: 200, h: 50 });
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    let y = metaY + 70;
    texts.forEach((t, idx) => {
      place(t, { x: M, y: y + idx * 150, w: fullW, h: 140 });
    });
    y += Math.max(1, texts.length) * 150 + 10;
    if (image) place(image, { x: M, y, w: fullW, h: 220 });
    if (caption) place(caption, { x: M, y: y + 230, w: fullW, h: 60 });
  }

  // 8) Title left, meta right; content two columns
  if (variant === 8) {
    const leftX = M;
    const rightX = M + colW + G;
    place(title, { x: leftX, y: M, w: colW, h: 120 });
    let y = M;
    if (date) {
      place(date, { x: rightX, y, w: colW, h: 50 });
      y += 60;
    }
    if (varSubject) {
      place(varSubject, { x: rightX, y, w: colW, h: 50 });
      y += 60;
    }
    if (varLesson) {
      place(varLesson, { x: rightX, y, w: colW, h: 50 });
      y += 60;
    }
    const contentY = M + 140;
    texts.forEach((t, idx) => {
      const isLeft = idx % 2 === 0;
      const row = Math.floor(idx / 2);
      place(t, { x: isLeft ? leftX : rightX, y: contentY + row * 180, w: colW, h: rowH });
    });
    const rows = Math.max(1, Math.ceil(texts.length / 2));
    const bottomY = contentY + rows * 180 + 10;
    if (image) place(image, { x: leftX, y: bottomY, w: fullW, h: 200 });
    if (caption) place(caption, { x: leftX, y: bottomY + 210, w: fullW, h: 60 });
  }

  // 9) Left image panel, right title+text
  if (variant === 9) {
    const leftX = M;
    const rightX = M + colW + G;
    if (image) place(image, { x: leftX, y: M, w: colW, h: 320 });
    if (caption) place(caption, { x: leftX, y: M + 330, w: colW, h: 60 });
    let y = M;
    place(title, { x: rightX, y, w: colW, h: 100 });
    y += 110;
    if (varSubject) {
      place(varSubject, { x: rightX, y, w: colW, h: 50 });
      y += 60;
    }
    if (varLesson) {
      place(varLesson, { x: rightX, y, w: colW, h: 50 });
      y += 60;
    }
    if (date) {
      place(date, { x: rightX, y, w: colW, h: 50 });
      y += 60;
    }
    texts.forEach((t, idx) => place(t, { x: rightX, y: y + idx * 170, w: colW, h: rowH }));
  }

  // 10) Meta row top, title below, split content
  if (variant === 10) {
    const metaY = M;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    place(title, { x: M, y: metaY + 60, w: fullW, h: 90 });
    const contentY = metaY + 160;
    if (image) place(image, { x: M + colW + G, y: contentY, w: colW, h: 260 });
    if (caption) place(caption, { x: M + colW + G, y: contentY + 270, w: colW, h: 60 });
    texts.forEach((t, idx) => place(t, { x: M, y: contentY + idx * 170, w: colW, h: rowH }));
  }

  // 11) Title right, image left, text full bottom
  if (variant === 11) {
    const leftX = M;
    const rightX = M + colW + G;
    if (image) place(image, { x: leftX, y: M, w: colW, h: 260 });
    if (caption) place(caption, { x: leftX, y: M + 270, w: colW, h: 60 });
    place(title, { x: rightX, y: M, w: colW, h: 120 });
    const metaY = M + 130;
    if (varSubject) place(varSubject, { x: rightX, y: metaY, w: colW, h: 50 });
    if (varLesson) place(varLesson, { x: rightX, y: metaY + 60, w: colW, h: 50 });
    if (date) place(date, { x: rightX, y: metaY + 120, w: colW, h: 50 });
    const contentY = M + 360;
    texts.forEach((t, idx) => place(t, { x: M, y: contentY + idx * 150, w: fullW, h: 140 }));
  }

  // 12) Title top; meta vertical right; image optional bottom-right
  if (variant === 12) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const contentY = M + 90;
    const rightX = M + colW + G;
    let metaY = contentY;
    if (date) {
      place(date, { x: rightX, y: metaY, w: colW, h: 50 });
      metaY += 60;
    }
    if (varSubject) {
      place(varSubject, { x: rightX, y: metaY, w: colW, h: 50 });
      metaY += 60;
    }
    if (varLesson) {
      place(varLesson, { x: rightX, y: metaY, w: colW, h: 50 });
      metaY += 60;
    }
    texts.forEach((t, idx) => place(t, { x: M, y: contentY + idx * 170, w: colW, h: rowH }));
    const imgY = Math.max(metaY + 10, contentY + Math.max(1, texts.length) * 170 + 10);
    if (image) place(image, { x: rightX, y: imgY, w: colW, h: 200 });
    if (caption) place(caption, { x: rightX, y: imgY + 210, w: colW, h: 60 });
  }

  // 13) Wide image left, stacked text right
  if (variant === 13) {
    const leftW = Math.floor(fullW * 0.58);
    const rightW = fullW - leftW - G;
    const leftX = M;
    const rightX = M + leftW + G;
    place(title, { x: leftX, y: M, w: fullW, h: 80 });
    const y = M + 90;
    if (image) place(image, { x: leftX, y, w: leftW, h: 320 });
    if (caption) place(caption, { x: leftX, y: y + 330, w: leftW, h: 60 });
    let metaY = y;
    if (varSubject) {
      place(varSubject, { x: rightX, y: metaY, w: rightW, h: 50 });
      metaY += 60;
    }
    if (varLesson) {
      place(varLesson, { x: rightX, y: metaY, w: rightW, h: 50 });
      metaY += 60;
    }
    if (date) {
      place(date, { x: rightX, y: metaY, w: rightW, h: 50 });
      metaY += 60;
    }
    texts.forEach((t, idx) => place(t, { x: rightX, y: metaY + idx * 170, w: rightW, h: rowH }));
  }

  // 14) Title row with date, then hero image, then text
  if (variant === 14) {
    place(title, { x: M, y: M, w: fullW - 220, h: 80 });
    if (date) place(date, { x: M + fullW - 200, y: M + 15, w: 200, h: 50 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    const y = metaY + 70;
    if (image) place(image, { x: M, y, w: fullW, h: 240 });
    if (caption) place(caption, { x: M, y: y + 250, w: fullW, h: 60 });
    const contentY = y + (image ? 320 : 0);
    texts.forEach((t, idx) => place(t, { x: M, y: contentY + idx * 150, w: fullW, h: 140 }));
  }

  // 15) Text first, image in the middle
  if (variant === 15) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y: metaY, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y: metaY, w: 200, h: 50 });
    let y = metaY + 70;
    if (texts[0]) {
      place(texts[0], { x: M, y, w: fullW, h: 160 });
      y += 170;
    }
    if (image) {
      place(image, { x: M, y, w: fullW, h: 220 });
      if (caption) place(caption, { x: M, y: y + 230, w: fullW, h: 60 });
      y += 300;
    }
    texts.slice(1).forEach((t, idx) => place(t, { x: M, y: y + idx * 150, w: fullW, h: 140 }));
  }

  // 16) Three-column text grid (no image focus)
  if (variant === 16) {
    place(title, { x: M, y: M, w: fullW, h: 80 });
    const metaY = M + 90;
    if (varSubject) place(varSubject, { x: M, y: metaY, w: 250, h: 50 });
    if (varLesson) place(varLesson, { x: M + 270, y: metaY, w: 250, h: 50 });
    if (date) place(date, { x: M + 540, y: metaY, w: 220, h: 50 });
    const contentY = metaY + 70;
    const thirdW = Math.floor((fullW - G * 2) / 3);
    texts.forEach((t, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = M + col * (thirdW + G);
      const y = contentY + row * 170;
      place(t, { x, y, w: thirdW, h: 150 });
    });
    const rows = Math.max(1, Math.ceil(texts.length / 3));
    const imgY = contentY + rows * 170 + 10;
    if (image) place(image, { x: M, y: imgY, w: fullW, h: 200 });
    if (caption) place(caption, { x: M, y: imgY + 210, w: fullW, h: 60 });
  }

  // 17) Split: title+text left, image right
  if (variant === 17) {
    const leftX = M;
    const rightX = M + colW + G;
    place(title, { x: leftX, y: M, w: colW, h: 90 });
    const metaY = M + 100;
    if (varSubject) place(varSubject, { x: leftX, y: metaY, w: colW, h: 50 });
    if (varLesson) place(varLesson, { x: leftX, y: metaY + 60, w: colW, h: 50 });
    if (date) place(date, { x: leftX, y: metaY + 120, w: colW, h: 50 });
    const contentY = M + 280;
    texts.forEach((t, idx) => place(t, { x: leftX, y: contentY + idx * 170, w: colW, h: rowH }));
    if (image) place(image, { x: rightX, y: M, w: colW, h: 320 });
    if (caption) place(caption, { x: rightX, y: M + 330, w: colW, h: 60 });
  }

  // 18) Meta top-left, image right, title + text bottom
  if (variant === 18) {
    const rightX = M + colW + G;
    let y = M;
    if (varSubject) {
      place(varSubject, { x: M, y, w: colW, h: 50 });
      y += 60;
    }
    if (varLesson) {
      place(varLesson, { x: M, y, w: colW, h: 50 });
      y += 60;
    }
    if (date) {
      place(date, { x: M, y, w: colW, h: 50 });
      y += 60;
    }
    if (image) place(image, { x: rightX, y: M, w: colW, h: 280 });
    if (caption) place(caption, { x: rightX, y: M + 290, w: colW, h: 60 });
    place(title, { x: M, y: y + 10, w: fullW, h: 80 });
    const contentY = y + 100;
    texts.forEach((t, idx) => {
      const isLeft = idx % 2 === 0;
      const row = Math.floor(idx / 2);
      place(t, { x: isLeft ? M : M + colW + G, y: contentY + row * 180, w: colW, h: rowH });
    });
  }

  // 19) Image top (if any), title + two-column text under
  if (variant === 19) {
    let y = M;
    if (image) {
      place(image, { x: M, y, w: fullW, h: 220 });
      if (caption) place(caption, { x: M, y: y + 230, w: fullW, h: 60 });
      y += 300;
    }
    place(title, { x: M, y, w: fullW, h: 80 });
    y += 90;
    if (varSubject) place(varSubject, { x: M, y, w: 260, h: 50 });
    if (varLesson) place(varLesson, { x: M + 280, y, w: 260, h: 50 });
    if (date) place(date, { x: M + 560, y, w: 200, h: 50 });
    const contentY = y + 70;
    texts.forEach((t, idx) => {
      const isLeft = idx % 2 === 0;
      const row = Math.floor(idx / 2);
      place(t, { x: isLeft ? M : M + colW + G, y: contentY + row * 180, w: colW, h: rowH });
    });
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

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();

  const idParamRaw = (params as any)?.id as string | string[] | undefined;
  const idParam = Array.isArray(idParamRaw) ? idParamRaw[0] : idParamRaw;
  const isNew = !idParam || idParam === 'new';

  const canvasRef = React.useRef<HTMLDivElement | null>(null);

  const [templateName, setTemplateName] = React.useState('');
  const [templateTheme, setTemplateTheme] = React.useState('default');
  const [templatePreviewImageUrl, setTemplatePreviewImageUrl] = React.useState<string>('');
  type TemplateSlideDraft = { key: string; elements: TemplateElement[] };
  const [slides, setSlides] = React.useState<TemplateSlideDraft[]>([{ key: 'slide-1', elements: [] }]);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const elements = slides[activeSlideIndex]?.elements ?? [];
  const [selectedElementId, setSelectedElementId] = React.useState<number | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [layoutVariant, setLayoutVariant] = React.useState<LayoutVariant>(0);

  const [showExitModal, setShowExitModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);

  const contentInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const canEditText = selectedElement && ['title', 'text', 'caption', 'variable'].includes(selectedElement.type);

  React.useEffect(() => {
    if (canEditText) {
      // Focus the content field to allow typing immediately after selecting a placeholder
      window.requestAnimationFrame(() => contentInputRef.current?.focus());
    }
  }, [selectedElementId, canEditText]);

  React.useEffect(() => {
    const load = async () => {
      if (isNew) {
        // New template
        setSelectedElementId(null);
        setSlides([{ key: 'slide-1', elements: [] }]);
        setActiveSlideIndex(0);
        setTemplateName('');
        setTemplateTheme('default');
        setHasChanges(false);
        setLayoutVariant(0);
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('quickslide_jwt_token') : null;
      if (!token) {
        toast.error('Bạn cần đăng nhập để sửa template.');
        router.push('/login');
        return;
      }

      try {
        setIsSaving(true);
        const templateId = Number(idParam);
        const [tplRes, slidesRes] = await Promise.all([getTemplateApi(templateId), getTemplateSlidesApi(templateId)]);
        const tpl = tplRes.data;
        setTemplateName(tpl?.name || '');
        setTemplateTheme(tpl?.theme || 'default');
        setTemplatePreviewImageUrl(tpl?.previewImageUrl || '');

        const serverSlides = slidesRes.data || [];
        const loadedSlides: TemplateSlideDraft[] = serverSlides.map((s, idx) => ({
          key: String(s?.id ?? idx),
          elements: ensureSlotIndexes(parseElementsFromLayoutJson(s?.layoutJson)),
        }));

        setSlides(loadedSlides.length ? loadedSlides : [{ key: 'slide-1', elements: [] }]);
        setActiveSlideIndex(0);
        setSelectedElementId(null);
        setHasChanges(false);
        setLayoutVariant(0);
      } catch (err: any) {
        const status = err?.response?.status;
        console.error('Load template failed', err);
        if (status === 401 || status === 403) {
          toast.error('Bạn không có quyền sửa template này.');
          router.push('/templates');
          return;
        }
        toast.error('Không tải được template để sửa.');
        router.push('/templates');
      } finally {
        setIsSaving(false);
      }
    };

    load();
  }, [isNew, idParam, router]);

  const updateElement = React.useCallback(
    (id: number, updater: (prev: TemplateElement) => TemplateElement) => {
      setSlides((prev) =>
        prev.map((s, idx) =>
          idx === activeSlideIndex
            ? {
                ...s,
                elements: s.elements.map((el) => (el.id === id ? updater(el) : el)),
              }
            : s,
        ),
      );
      setHasChanges(true);
    },
    [activeSlideIndex],
  );

  const addElement = (type: ElementType) => {
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

    setSlides((prev) => {
      const current = prev[activeSlideIndex] ?? { key: 'slide-1', elements: [] };
      const currentElements = current.elements;

      const existingOfType = currentElements.filter((e) => e.type === type);
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
        text: defaultTextFor(type, slotIndex),
        style,
      };

      const nextElements = applyLayout([...currentElements, newElement], layoutVariant);
      const out = prev.slice();
      out[activeSlideIndex] = { ...current, elements: nextElements };
      return out;
    });
    setSelectedElementId(id);
    setHasChanges(true);
  };

  const goToSlide = (index: number) => {
    if (index < 0) return;
    if (index >= slides.length) return;
    setSelectedElementId(null);
    setActiveSlideIndex(index);
  };

  const addSlide = () => {
    const key = `slide-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setSlides((prev) => {
      const nextIndex = prev.length;
      const next = [...prev, { key, elements: [] }];
      setSelectedElementId(null);
      setActiveSlideIndex(nextIndex);
      return next;
    });
    setHasChanges(true);
  };

  const deleteCurrentSlide = () => {
    if (slides.length <= 1) return;
    setSlides((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, idx) => idx !== activeSlideIndex);
      const nextIndex = Math.max(0, activeSlideIndex - 1);
      setSelectedElementId(null);
      setActiveSlideIndex(nextIndex);
      return next;
    });
    setHasChanges(true);
  };

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
    setDragging({
      id: element.id,
      offsetX: pt.x - element.x,
      offsetY: pt.y - element.y,
    });
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
      startFontSize: element.style.fontSize,
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

  const handleExit = () => {
    if (hasChanges) {
      setShowExitModal(true);
      return;
    }
    router.push('/templates');
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Vui lòng nhập tên template');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('quickslide_jwt_token') : null;
    if (!token) {
      toast.error('Bạn cần đăng nhập để lưu template.');
      router.push('/login');
      return;
    }

    const payload = {
      name: templateName.trim(),
      theme: templateTheme,
      previewImageUrl: templatePreviewImageUrl || undefined,
      slides: slides.map((s, idx) => ({
        layoutJson: JSON.stringify({ elements: s.elements ?? [] }),
        order: idx,
      })),
    };

    try {
      setIsSaving(true);

      if (isNew) {
        await createTemplateApi(payload);
        toast.success('Đã lưu template mới');
      } else {
        await updateTemplateApi(Number(idParam), payload);
        toast.success('Đã cập nhật template');
      }
      setHasChanges(false);
      router.push(`/templates?refresh=${Date.now()}`);
    } catch (err) {
      const status = (err as any)?.response?.status;
      const message = (err as any)?.response?.data?.message || (err as any)?.message || 'Lưu template thất bại';
      console.error('Save template failed', { status, message, err });

      if (status === 401 || status === 403) {
        toast.error('Bạn cần đăng nhập để lưu template (JWT).');
        return;
      }

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = () => {
    if (isNew) {
      toast.error('Template mới chưa được lưu để xóa');
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (isNew || !idParam) return;
    try {
      await deleteTemplateApi(Number(idParam));
      toast.success('Đã xóa template của bạn (public vẫn dùng được)');
      router.push('/templates');
    } catch (err) {
      console.error('Delete template failed', err);
      toast.error('Xóa template thất bại');
    }
  };

  const formatValue = (el: TemplateElement) => {
    const values: string[] = [];
    if (el.style.bold) values.push('bold');
    if (el.style.italic) values.push('italic');
    if (el.style.underline) values.push('underline');
    return values;
  };

  const applyFormat = (values: string[]) => {
    if (!selectedElement) return;
    updateElement(selectedElement.id, (el) => ({
      ...el,
      style: {
        ...el.style,
        bold: values.includes('bold'),
        italic: values.includes('italic'),
        underline: values.includes('underline'),
      },
    }));
  };

  const cycleAutoLayout = () => {
    if (elements.length === 0) return;
    const next = (((layoutVariant + 1) % VARIANT_COUNT) as LayoutVariant);
    setLayoutVariant(next);
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, elements: applyLayout(s.elements, next) } : s)),
    );
    setHasChanges(true);
  };

  const deleteSelected = () => {
    if (!selectedElementId) return;
    setSlides((prev) =>
      prev.map((s, idx) =>
        idx === activeSlideIndex
          ? { ...s, elements: applyLayout(s.elements.filter((el) => el.id !== selectedElementId), layoutVariant) }
          : s,
      ),
    );
    setSelectedElementId(null);
    setHasChanges(true);
  };

  const renderCanvasElements = (readonly: boolean) =>
    elements.map((element) => {
      const isSelected = !readonly && selectedElementId === element.id;
      const alignClass =
        element.style.align === 'center'
          ? 'justify-center text-center'
          : element.style.align === 'right'
            ? 'justify-end text-right'
            : 'justify-start text-left';

      const textStyle: React.CSSProperties = {
        color: element.style.color,
        fontFamily: element.style.fontFamily,
        fontSize: element.style.fontSize,
        fontWeight: element.style.bold ? 700 : 400,
        fontStyle: element.style.italic ? 'italic' : 'normal',
        textDecoration: element.style.underline ? 'underline' : 'none',
      };

      return (
        <div
          key={element.id}
          onMouseDown={readonly ? undefined : (e) => onMouseDownElement(e, element)}
          className={`absolute border-2 rounded select-none ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-300 bg-white'}`}
          style={{ left: element.x, top: element.y, width: element.w, height: element.h }}
        >
          <div className={`w-full h-full flex items-center ${alignClass} px-3 py-2 overflow-hidden`}>
            {element.type === 'title' && <span style={textStyle}>{element.text}</span>}
            {element.type === 'text' && <span style={textStyle}>{element.text}</span>}
            {element.type === 'caption' && <span style={textStyle}>{element.text}</span>}
            {element.type === 'variable' && <span style={textStyle}>{element.text}</span>}
            {element.type === 'date' && <span style={textStyle}>{new Date().toISOString().slice(0, 10)}</span>}
            {element.type === 'image' && (
              <div className="w-full h-full bg-gray-200/70 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>

          {!readonly && isSelected && (
            <div
              data-resize-handle="true"
              onMouseDown={(e) => onMouseDownResize(e, element)}
              className="absolute right-0 bottom-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize"
            />
          )}
        </div>
      );
    });

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleExit} aria-label="Quay lại" className="text-blue-600 hover:text-blue-700">
              <BookOpen className="w-6 h-6" />
            </button>
            <Input
              type="text"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Nhập tên template"
              className="text-xl border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 transition-colors h-auto font-semibold"
            />

            <div className="w-[160px]">
              <Select
                value={templateTheme}
                onValueChange={(v) => {
                  setTemplateTheme(v);
                  setHasChanges(true);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-600">Ảnh mẫu</Label>
              <label className="text-xs px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : '';
                      setTemplatePreviewImageUrl(result);
                      setHasChanges(true);
                    };
                    reader.readAsDataURL(f);
                    // allow re-selecting same file
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              {templatePreviewImageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-2 border-red-600 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setTemplatePreviewImageUrl('');
                    setHasChanges(true);
                  }}
                >
                  Xóa ảnh
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isNew && (
              <Button onClick={handleDeleteTemplate} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </Button>
            )}

            <Button onClick={handleExit} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              <X className="w-4 h-4 mr-2" />
              Hủy
            </Button>

            <Button
              onClick={handleSave}
              disabled={!templateName.trim() || !hasChanges || isSaving}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={15} minSize={10} className="bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm mb-3 text-gray-700">Slides</h3>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={activeSlideIndex <= 0}
              onClick={() => goToSlide(activeSlideIndex - 1)}
            >
              Prev
            </Button>
            <div className="text-xs text-gray-600">
              {slides.length === 0 ? '0/0' : `${activeSlideIndex + 1}/${slides.length}`}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              disabled={activeSlideIndex >= slides.length - 1}
              onClick={() => goToSlide(activeSlideIndex + 1)}
            >
              Next
            </Button>
          </div>

          <div className="space-y-2 mb-6">
            <Button onClick={addSlide} variant="outline" className="w-full justify-start hover:border-blue-500">
              <span className="text-sm">+ New slide</span>
            </Button>
            <Button
              onClick={deleteCurrentSlide}
              variant="outline"
              className="w-full justify-start border-red-600 text-red-600 hover:bg-red-50"
              disabled={slides.length <= 1}
            >
              <span className="text-sm">Delete slide</span>
            </Button>
          </div>

          <h3 className="text-sm mb-3 text-gray-700">Auto layout</h3>
          <div className="space-y-2 mb-6">
            <Button onClick={cycleAutoLayout} variant="outline" className="w-full justify-start hover:border-blue-500" disabled={elements.length === 0}>
              <Layout className="w-5 h-5 mr-3" />
              <span className="text-sm">Đổi layout</span>
            </Button>
          </div>

          <h3 className="text-sm mb-4 text-gray-700">Elements (Thêm Placeholder)</h3>
          <div className="space-y-2">
            <Button onClick={() => addElement('title')} variant="outline" className="w-full justify-start hover:border-blue-500">
              <Type className="w-5 h-5 mr-3" />
              <span className="text-sm">+ Title</span>
            </Button>
            <Button onClick={() => addElement('text')} variant="outline" className="w-full justify-start hover:border-blue-500">
              <Type className="w-5 h-5 mr-3" />
              <span className="text-sm">+ Text</span>
            </Button>
            <Button onClick={() => addElement('image')} variant="outline" className="w-full justify-start hover:border-blue-500">
              <ImageIcon className="w-5 h-5 mr-3" />
              <span className="text-sm">+ Image</span>
            </Button>
            <Button onClick={() => addElement('caption')} variant="outline" className="w-full justify-start hover:border-blue-500">
              <Type className="w-5 h-5 mr-3" />
              <span className="text-sm">+ Caption</span>
            </Button>
            <Button onClick={() => addElement('variable')} variant="outline" className="w-full justify-start hover:border-blue-500">
              <Variable className="w-5 h-5 mr-3" />
              <span className="text-sm">+ Variable</span>
            </Button>
            <Button onClick={() => addElement('date')} variant="outline" className="w-full justify-start hover:border-blue-500">
              <Calendar className="w-5 h-5 mr-3" />
              <span className="text-sm">+ Date</span>
            </Button>
          </div>

          <div className="mt-8">
            <Button onClick={() => setShowPreviewModal(true)} className="w-full bg-blue-600 hover:bg-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-100" />

        <ResizablePanel defaultSize={65} minSize={40} className="bg-gray-50 p-8 overflow-auto">
          <div
            ref={canvasRef}
            className="bg-white rounded-lg shadow-lg mx-auto relative overflow-hidden"
            style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px` }}
            onMouseMove={onMouseMoveCanvas}
            onMouseUp={onMouseUpCanvas}
            onMouseDown={() => setSelectedElementId(null)}
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />

            {renderCanvasElements(false)}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-gray-100" />

        <ResizablePanel defaultSize={20} minSize={15} className="bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm mb-4 text-gray-700">Thiết lập thuộc tính</h3>

          {selectedElement ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Đang chọn: {selectedElement.type}</div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50 h-8"
                  onClick={deleteSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa
                </Button>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-2">Vị trí / Kích thước</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="X"
                    className="text-sm"
                    value={selectedElement.x}
                    onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, x: toNumberOr(e.target.value, el.x) }))}
                  />
                  <Input
                    type="number"
                    placeholder="Y"
                    className="text-sm"
                    value={selectedElement.y}
                    onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, y: toNumberOr(e.target.value, el.y) }))}
                  />
                  <Input
                    type="number"
                    placeholder="W"
                    className="text-sm"
                    value={selectedElement.w}
                    onChange={(e) =>
                      updateElement(selectedElement.id, (el) => ({
                        ...el,
                        w: clamp(toNumberOr(e.target.value, el.w), 40, CANVAS_W),
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="H"
                    className="text-sm"
                    value={selectedElement.h}
                    onChange={(e) =>
                      updateElement(selectedElement.id, (el) => ({
                        ...el,
                        h: clamp(toNumberOr(e.target.value, el.h), 30, CANVAS_H),
                      }))
                    }
                  />
                </div>
              </div>

              {canEditText ? (
                <>
                  <div>
                    <Label className="text-xs text-gray-600 mb-2">Font</Label>
                    <Select
                      value={selectedElement.style.fontFamily}
                      onValueChange={(val) => updateElement(selectedElement.id, (el) => ({ ...el, style: { ...el.style, fontFamily: val } }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn font" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Noto Sans JP', 'Yu Gothic', 'MS Gothic', 'Meiryo'].map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-2">Kích thước chữ</Label>
                    <Input
                      type="number"
                      className="text-sm"
                      value={selectedElement.style.fontSize}
                      onChange={(e) =>
                        updateElement(selectedElement.id, (el) => ({
                          ...el,
                          style: {
                            ...el.style,
                            fontSize: clamp(toNumberOr(e.target.value, el.style.fontSize), 6, 200),
                          },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-2">Định dạng</Label>
                    <ToggleGroup
                      type="multiple"
                      className="justify-start gap-2"
                      value={formatValue(selectedElement)}
                      onValueChange={applyFormat}
                    >
                      <ToggleGroupItem value="bold" aria-label="Toggle bold">
                        <Type className="w-4 h-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="italic" aria-label="Toggle italic">
                        <Type className="w-4 h-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="underline" aria-label="Toggle underline">
                        <Type className="w-4 h-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-2">Màu chữ</Label>
                    <Input
                      type="color"
                      className="w-full h-10 border border-gray-300 rounded"
                      value={selectedElement.style.color}
                      onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, style: { ...el.style, color: e.target.value } }))}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-2">Nội dung</Label>
                    <Input
                      ref={contentInputRef}
                      value={selectedElement.text ?? ''}
                      onChange={(e) => updateElement(selectedElement.id, (el) => ({ ...el, text: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Loại placeholder này không có thuộc tính chữ.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Hãy chọn một placeholder để chỉnh sửa</p>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>Xem nhanh bố cục template (không chỉnh sửa).</DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 p-4 rounded-lg overflow-auto">
            <div
              className="bg-white rounded-lg shadow-lg mx-auto relative overflow-hidden"
              style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px` }}
            >
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              {renderCanvasElements(true)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chưa lưu thay đổi</DialogTitle>
            <DialogDescription>Bạn có chắc muốn thoát mà không lưu thay đổi?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExitModal(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => router.push('/templates')} className="bg-red-600 hover:bg-red-700">
              Thoát không lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa Template</DialogTitle>
            <DialogDescription>Bạn có chắc muốn xóa hoàn toàn template này?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
