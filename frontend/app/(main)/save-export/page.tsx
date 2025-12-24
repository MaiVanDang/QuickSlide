'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { exportPresentationApi } from '@/lib/api';
import { qcStorage } from '@/lib/utils/qc-storage';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

function SaveExportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presentationId = Number(searchParams.get('presentationId'));

  const BG_CREATED_PRESENTATIONS_KEY = 'quickslide_bg_created_presentations_v1';
  const [fileName, setFileName] = React.useState('Slide_2025-12-13');
  const [selectedFormat, setSelectedFormat] = React.useState<string | null>(null); // ② Định dạng
  const [selectedFont, setSelectedFont] = React.useState('Noto Sans JP'); // ④ Font
  const [isExporting, setIsExporting] = React.useState(false);

  // Luật nghiệp vụ: Tên file (③) là bắt buộc.
  const isFileNameValid = fileName.trim().length > 0;
  
  // Luật nghiệp vụ: Nút Xuất (⑥) chỉ được kích hoạt khi Tên file VÀ ít nhất một định dạng được chọn.
  const isExportEnabled = isFileNameValid && !!selectedFormat;
  
  // Nút Lưu (⑤) chỉ cần Tên file
  const isSaveEnabled = isFileNameValid;

  const handleFormatSelect = (format: string) => {
    // Single-select (radio-like): chọn format mới sẽ tự bỏ format cũ
    setSelectedFormat(format);
  };

  const handleExport = async () => {
    if (!isExportEnabled) return;

    setIsExporting(true);
    console.log(`Exporting ${fileName} to format: ${selectedFormat} with font: ${selectedFont}`);
    
    const sanitizeFilePart = (value: string) => {
      return value
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .slice(0, 80);
    };

    const downloadBlob = (blob: Blob, downloadName: string) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    };

    const getBatchItems = () => {
      try {
        const raw = qcStorage.get(BG_CREATED_PRESENTATIONS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
          ? parsed
              .map((x) => ({
                id: Number(x?.id),
                title: typeof x?.title === 'string' ? x.title : undefined,
              }))
              .filter((x) => Number.isFinite(x.id) && x.id > 0)
          : [];
        if (items.length <= 1) return null;
        // Chỉ coi là batch nếu presentationId hiện tại thuộc batch.
        const idx = items.findIndex((x) => x.id === presentationId);
        if (idx < 0) return null;
        return items;
      } catch {
        return null;
      }
    };

    try {
      if (!Number.isFinite(presentationId)) {
        throw new Error('ファイル出力に必要なpresentationIdがありません。');
      }

      const normalized = (selectedFormat || 'bin').toUpperCase();
      const batchItems = getBatchItems();

      // --- Batch export mode ---
      if (batchItems) {
        // Note: trình duyệt có thể hỏi quyền cho phép tải nhiều file.
        if (normalized === 'PDF' || normalized === 'PPTX') {
          for (let i = 0; i < batchItems.length; i++) {
            const item = batchItems[i];
            const titlePart = item.title ? sanitizeFilePart(item.title) : `presentation-${item.id}`;
            const base = sanitizeFilePart(fileName);
            const suffix = `${String(i + 1).padStart(2, '0')}_${titlePart}`;
            const ext = normalized.toLowerCase();
            const outName = `${base}_${suffix}.${ext}`;

            const res = await exportPresentationApi(item.id, {
              fileName: `${base}_${suffix}`,
              formats: [normalized],
              font: selectedFont,
            });
            downloadBlob(res.data, outName);

            // Thêm một khoảng nghỉ nhỏ để giảm khả năng bị chặn tải nhiều file.
            await new Promise((r) => setTimeout(r, 250));
          }

          router.push('/dashboard');
          return;
        }

        if (normalized === 'PNG') {
          const zipOut = new JSZip();
          const baseFolder = sanitizeFilePart(fileName) || 'batch-export';
          const root = zipOut.folder(baseFolder) ?? zipOut;

          for (let i = 0; i < batchItems.length; i++) {
            const item = batchItems[i];
            const titlePart = item.title ? sanitizeFilePart(item.title) : `presentation-${item.id}`;
            const folderName = `${String(i + 1).padStart(2, '0')}_${titlePart}`;
            const targetFolder = root.folder(folderName) ?? root;

            const res = await exportPresentationApi(item.id, {
              fileName: folderName,
              formats: ['PNG'],
              font: selectedFont,
            });

            const inZip = await JSZip.loadAsync(res.data as unknown as Blob);
            const files = Object.keys(inZip.files);
            for (const path of files) {
              const entry = inZip.files[path];
              if (entry.dir) continue;
              const fileBlob = await entry.async('blob');
              targetFolder.file(path, fileBlob);
            }
          }

          const outBlob = await zipOut.generateAsync({ type: 'blob' });
          const outName = `${sanitizeFilePart(fileName) || 'batch-export'}_PNG.zip`;
          downloadBlob(outBlob, outName);
          router.push('/dashboard');
          return;
        }
      }

      const res = await exportPresentationApi(presentationId, {
        fileName,
        formats: selectedFormat ? [selectedFormat] : [],
        font: selectedFont,
      });

      const blob = res.data;
      const format = normalized === 'PNG' ? 'zip' : normalized.toLowerCase();
      downloadBlob(blob, `${fileName}.${format}`);

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Export failed', error);

      const maybeBlob: unknown = error?.response?.data;
      // exportPresentationApi dùng responseType='blob' nên lỗi JSON từ backend sẽ được trả về dưới dạng Blob.
      if (maybeBlob instanceof Blob) {
        try {
          const text = await maybeBlob.text();
          try {
            const parsed = JSON.parse(text);
            const msg = parsed?.message || text;
            alert(`出力エラー: ${msg}`);
          } catch {
            alert(`出力エラー: ${text}`);
          }
          return;
        } catch {
          // nếu parse không được thì xử lý theo nhánh dưới
        }
      }

      const serverMsg = error?.response?.data?.message;
      const msg = serverMsg || error?.message || '不明';
      alert(`出力エラー: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!isSaveEnabled) return;
    
    // Gửi yêu cầu lưu dự án tới API (PUT)
    console.log(`Saving project as: ${fileName}`);
    alert(`プロジェクトを保存しました: ${fileName}`);
    // Vẫn ở màn hình hiện tại
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card className="border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl text-gray-900">保存とエクスポート</h2>
            <Button onClick={() => router.back()} variant="ghost">
                <BookOpen className="w-5 h-5 mr-2" />
            エディターに戻る
            </Button>
        </div>

        {/* ② Định dạng Tệp */}
        <div className="mb-8">
          <Label className="block text-sm mb-3 text-gray-700">
            形式を選択 <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-3">
            {['PDF', 'PNG', 'PPTX (PowerPoint)'].map((format) => (
              (() => {
                const key = format.split(' ')[0];
                const isChecked = selectedFormat === key;
                return (
              <div
                key={format}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                  isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => handleFormatSelect(key)}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleFormatSelect(key)}
                  id={format}
                  className="mr-3"
                />
                <Label htmlFor={format} className="flex-1 cursor-pointer">
                  {format}
                </Label>
              </div>
                );
              })()
            ))}
          </div>
        </div>

        {/* ③ Tên File */}
        <div className="mb-8">
          <Label htmlFor="fileName" className="block text-sm mb-2 text-gray-700">
            ファイル名 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fileName"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="ファイル名を入力"
          />
        </div>

        {/* ④ Font */}
        <div className="mb-8">
          <Label htmlFor="font" className="block text-sm mb-2 text-gray-700">
            フォント
          </Label>
          <Select onValueChange={setSelectedFont} defaultValue={selectedFont}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="フォントを選択" />
            </SelectTrigger>
            <SelectContent>
              {['Noto Sans JP', 'Yu Gothic', 'MS Gothic', 'Meiryo'].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons (⑤ Lưu và ⑥ Xuất) */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          {/* ⑤ Nút Lưu */}
          <Button
            onClick={handleSave}
            disabled={!isSaveEnabled || isExporting}
            variant="outline"
            className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300"
          >
            <Save className="w-5 h-5 mr-2" />
            保存
          </Button>
          {/* ⑥ Nút Xuất */}
          <Button
            onClick={handleExport}
            disabled={!isExportEnabled || isExporting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          >
            <Download className="w-5 h-5 mr-2" />
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </Button>
        </div>

        {/* ⑦ Liên kết Hỗ trợ */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex gap-6 text-sm text-gray-600">
            <a href="/help" className="hover:text-blue-600 transition-colors">利用規約</a>
            <a href="/help" className="hover:text-blue-600 transition-colors">プライバシーポリシー</a>
            <a href="/help" className="hover:text-blue-600 transition-colors">技術サポート</a>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SaveExportPage() {
  return (
    <React.Suspense fallback={<div className="max-w-3xl mx-auto py-8" />}> 
      <SaveExportPageInner />
    </React.Suspense>
  );
}