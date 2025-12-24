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
}

export default function BatchGenerationPage() {
  const router = useRouter();
  const BG_TEMPLATE_ID_KEY = 'quickslide_bg_template_id_v1';
  const BG_TEMPLATE_SLIDE_ID_KEY = 'quickslide_bg_template_slide_id_v1'; // legacy
  const BG_CREATED_PRESENTATIONS_KEY = 'quickslide_bg_created_presentations_v1';
  const BG_CREATED_PRESENTATIONS_INDEX_KEY = 'quickslide_bg_created_presentations_index_v1';

  const [fileName, setFileName] = React.useState('');
  const [slideData, setSlideData] = React.useState<SlideData[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<number | null>(null);
  const [templateSlideId, setTemplateSlideId] = React.useState<number | null>(null);
  const hasSelectedTemplate = templateId != null || templateSlideId != null;

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

    const loadingId = toast.loading('アップロードしてデータを読み込んでいます...');

    try {
      // API: POST /api/batch/upload (multipart/form-data)
      const res = await uploadBatchFileApi(selectedFile);
      setSlideData((res.data || []) as any);
      toast.success('データファイルの読み込みに成功しました', { id: loadingId });
    } catch (error) {
      toast.error('アップロードまたは解析に失敗しました。', { id: loadingId });
      setSlideData([]);
      setFile(null);
      setFileName('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (slideData.length === 0) {
      toast.error('生成する前にExcelファイルをアップロードしてください。');
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

    const loadingId = toast.loading('一括スライド生成を処理中...');

    try {
      const res = await generateBatchSlidesApi(data);
      const created = Array.isArray(res?.data) ? res.data : [];
      const first = created[0] ?? null;
      if (!first?.id) throw new Error('APIからプレゼンテーションIDを受け取れませんでした。');

      const warningHeader = (res as any)?.headers?.['x-batch-warning'] as string | undefined;
      if (warningHeader) {
        // Still create presentations, but inform user that some content was truncated.
        toast.warning('テンプレートの仕様により、一部の内容が省略されました', { description: warningHeader });
      }

      // Lưu danh sách bài thuyết trình được tạo để editor có thể chuyển qua lại.
      // Format: [{ id, title }]
      qcStorage.set(
        BG_CREATED_PRESENTATIONS_KEY,
        JSON.stringify(
          created.map((p, i) => ({
            id: p.id,
            // Ưu tiên tên chủ đề từ cột A (slideData.name) để export đặt tên đúng theo file Excel.
            title: slideData[i]?.name || p.title,
          })),
        ),
      );
      qcStorage.set(BG_CREATED_PRESENTATIONS_INDEX_KEY, '0');

      toast.success(`生成が完了しました（${created.length} 件のプレゼンテーション）`, {
        id: loadingId,
        description:
          created.length > 1
            ? '最初のプレゼンテーションを開いています。エディターで左サイドバーの「プレゼンテーション」（Prev/Next）ボタンを使って切り替えられます。'
            : undefined,
      });
      router.push(`/editor/presentations/${first.id}`);
    } catch (error) {
      const anyErr = error as any;
      const serverMessage = anyErr?.response?.data?.message || anyErr?.response?.data?.error || null;
      let serverDataText: string | null = null;
      try {
        const d = anyErr?.response?.data;
        if (typeof d === 'string') serverDataText = d;
        else if (d != null) serverDataText = JSON.stringify(d);
      } catch {
        serverDataText = null;
      }
      console.error('Batch Generation Error:', error);
      if (anyErr?.response) {
        console.error('Batch Generation Response:', {
          status: anyErr.response.status,
          data: anyErr.response.data,
        });
        if (serverDataText) {
          console.error('Batch Generation Response (stringified):', serverDataText);
        }
      }
      toast.error(
        `読み込み/生成に失敗しました: ${serverMessage || (error instanceof Error ? error.message : '不明なエラーです。')}`,
        { id: loadingId },
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <Card className="border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl text-gray-900">スライドバッチ生成</h2>
            <p className="text-gray-600">データを入力して複数のスライドをまとめて生成します</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-700">
              Excelファイル <span className="text-red-500">*</span>
            </label>
            <Button
              type="button"
              className={
                hasSelectedTemplate
                  ? 'px-6 py-3 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                  : 'px-6 py-3 h-12 bg-blue-200 text-blue-900 rounded-lg hover:bg-blue-300'
              }
              onClick={() => router.push('/templates?select=batch-generation')}
            >
              テンプレートを選択
            </Button>
          </div>
          <div className="flex gap-3">
            {/* ③ Excel File Text Field */}
            <Input
              value={fileName}
              readOnly
              placeholder="ファイルを選択してください"
              className="flex-1 bg-gray-50 cursor-default"
            />
            {/* ④ Nút Tải lên */}
            <label className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2">
              <Upload className="w-5 h-5" />
              アップロード
              <input
                type="file"
                accept=".xlsx,.xls" // Định dạng tệp được chấp nhận
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
          <p className="mt-2 text-sm text-gray-500">
             内容の入力方法については、次のようなルールがあります。
             <br/>
             入力した内容は、Excelまたは公開されたGoogleドキュメントのリンクに保存することが可能です。
                    <br />
                    <br />
                    ・1行目は、デフォルトでタイトルの設定となります。
                    <br />
                    ・タイトルの入力が終わったら、必ず「Enter」キーを押して改行してください。
                    <br />
                    ・それ以降の内容は「画像リンク --&gt; 注釈 --&gt; 内容 --&gt; 時間」の順で読み取られます。
                    <br />
                    ・「\\--」を使用すると、次の属性へ移動します。
                    <br />
                    ・「\-」を使用すると、同じ属性内の次の項目へ移動します。
          </p>
        </div>

        {/* ⑤ Bảng dữ liệu Preview */}
        {slideData.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg mb-4 text-gray-900">データプレビュー</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-200">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-sm text-gray-700">No.</TableHead>
                    <TableHead className="px-6 py-3 text-sm text-gray-700">スライド名</TableHead>
                    <TableHead className="px-6 py-3 text-sm text-gray-700">内容</TableHead>
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
          {/* ⑥ Nút Tạo Slide (Chỉ kích hoạt khi bảng ⑤ có dữ liệu) */}
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