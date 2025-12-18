'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { BatchGenerateRequest } from '@/types/api/BatchRequests';
import { generateBatchSlidesApi, uploadBatchFileApi } from '@/lib/api';
import { qcStorage } from '@/lib/utils/qc-storage';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

interface SlideData {
  name: string;
  content: string;
  isError?: boolean;
  errorMessage?: string;
  [key: string]: any; // Cho phép các cột động
}

export default function BatchGenerationPage() {
  const router = useRouter();
  const BG_TEMPLATE_ID_KEY = 'quickslide_bg_template_id_v1';
  const BG_TEMPLATE_SLIDE_ID_KEY = 'quickslide_bg_template_slide_id_v1';
  const BG_CREATED_PRESENTATIONS_KEY = 'quickslide_bg_created_presentations_v1';
  const BG_CREATED_PRESENTATIONS_INDEX_KEY = 'quickslide_bg_created_presentations_index_v1';

  const [fileName, setFileName] = React.useState('');
  const [slideData, setSlideData] = React.useState<SlideData[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<number | null>(null);
  const [templateSlideId, setTemplateSlideId] = React.useState<number | null>(null);
  const [columns, setColumns] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const deckRaw = qcStorage.get(BG_TEMPLATE_ID_KEY);
    const deckParsed = deckRaw ? Number(deckRaw) : null;
    setTemplateId(deckParsed && Number.isFinite(deckParsed) ? deckParsed : null);

    const raw = qcStorage.get(BG_TEMPLATE_SLIDE_ID_KEY);
    const parsed = raw ? Number(raw) : null;
    setTemplateSlideId(parsed && Number.isFinite(parsed) ? parsed : null);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setIsUploading(true);

    const loadingId = toast.loading('Đang tải lên và đọc dữ liệu...');

    try {
      const res = await uploadBatchFileApi(selectedFile);
      const data = (res.data || []) as SlideData[];
      setSlideData(data);

      // Tự động phát hiện tất cả các cột (trừ name, content, isError, errorMessage)
      if (data.length > 0) {
        const allKeys = Object.keys(data[0]);
        const dynamicColumns = allKeys.filter(
          (key) => !['name', 'content', 'isError', 'errorMessage'].includes(key)
        );
        setColumns(dynamicColumns);
      }

      toast.success('Tải file dữ liệu thành công', { id: loadingId });
    } catch (error) {
      toast.error('Tải lên hoặc phân tích file thất bại.', { id: loadingId });
      setSlideData([]);
      setColumns([]);
      setFile(null);
      setFileName('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (slideData.length === 0) {
      toast.error('Vui lòng tải file Excel trước khi tạo.');
      return;
    }

    const data: BatchGenerateRequest = {
      slides: slideData.map((s) => ({
        name: s.name,
        content: s.content,
        isError: Boolean(s.isError),
        errorMessage: s.errorMessage,
      })),
      ...(templateId ? { templateId } : null),
      ...(templateId ? null : templateSlideId ? { templateSlideId } : null),
    };

    const loadingId = toast.loading('Đang xử lý tạo slide hàng loạt...');

    try {
      const res = await generateBatchSlidesApi(data);
      const created = Array.isArray(res?.data) ? res.data : [];
      const first = created[0] ?? null;
      if (!first?.id) throw new Error('Không nhận được ID thuyết trình từ API.');

      const warningHeader = (res as any)?.headers?.['x-batch-warning'] as string | undefined;
      if (warningHeader) {
        toast.warning('Một số nội dung đã bị cắt bớt theo mẫu template', { description: warningHeader });
      }

      qcStorage.set(
        BG_CREATED_PRESENTATIONS_KEY,
        JSON.stringify(
          created.map((p, i) => ({
            id: p.id,
            title: slideData[i]?.name || p.title,
          })),
        ),
      );
      qcStorage.set(BG_CREATED_PRESENTATIONS_INDEX_KEY, '0');

      toast.success(`Tạo dữ liệu hoàn tất (${created.length} bài thuyết trình)`, {
        id: loadingId,
        description:
          created.length > 1
            ? 'Đang mở bài đầu tiên. Vào editor, dùng nút "Bài thuyết trình" (Prev/Next) ở sidebar trái để chuyển qua lại.'
            : undefined,
      });
      router.push(`/editor/presentations/${first.id}`);
    } catch (error) {
      const anyErr = error as any;
      const serverMessage = anyErr?.response?.data?.message || anyErr?.response?.data?.error || null;
      console.error('Batch Generation Error:', error);
      toast.error(
        `Đọc/Tạo dữ liệu thất bại: ${serverMessage || (error instanceof Error ? error.message : 'Lỗi không xác định.')}`,
        { id: loadingId },
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <Card className="border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl text-gray-900">Tạo Slide Hàng Loạt</h2>
            <p className="text-gray-600">Nhập dữ liệu để tạo nhiều slide cùng lúc</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-700">
              Excel File <span className="text-red-500">*</span>
            </label>
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
              onClick={() => router.push('/templates?select=batch-generation')}
            >
              Chọn mẫu templates
            </Button>
          </div>
          <div className="flex gap-3">
            <Input
              value={fileName}
              readOnly
              placeholder="ファイルを選択してください"
              className="flex-1 bg-gray-50 cursor-default"
            />
            <label className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2">
              <Upload className="w-5 h-5" />
              アップロード
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">対応形式: .xlsx, .xls</p>
        </div>

        {/* Data Preview Table - Hiển thị tất cả các cột */}
        {slideData.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg mb-4 text-gray-900">データプレビュー</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-200">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-sm text-gray-700">No.</TableHead>
                    <TableHead className="px-6 py-3 text-sm text-gray-700">スライド名</TableHead>
                    <TableHead className="px-6 py-3 text-sm text-gray-700">内容</TableHead>
                    {/* Hiển thị các cột động */}
                    {columns.map((col) => (
                      <TableHead key={col} className="px-6 py-3 text-sm text-gray-700">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {slideData.map((slide, index) => (
                    <TableRow key={`${index}-${slide.name}`} className={slide.isError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <TableCell className="px-6 py-4 text-gray-900">{index + 1}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-900">{slide.name}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">
                        {slide.content}
                        {slide.isError && slide.errorMessage ? (
                          <div className="text-xs text-red-600 mt-1">{slide.errorMessage}</div>
                        ) : null}
                      </TableCell>
                      {/* Hiển thị giá trị các cột động */}
                      {columns.map((col) => (
                        <TableCell key={col} className="px-6 py-4 text-gray-600">
                          {slide[col] != null ? String(slide[col]) : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex-1 border-gray-300 hover:bg-gray-50"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={slideData.length === 0 || isUploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
          >
            スライド生成
          </Button>
        </div>
      </Card>
    </div>
  );
}