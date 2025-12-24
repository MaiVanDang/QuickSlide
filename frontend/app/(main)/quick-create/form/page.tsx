'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { qcStorage } from '@/lib/utils/qc-storage';

const getFirstNonEmptyLine = (raw: string) => {
  const normalized = (raw || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  for (const line of lines) {
    const t = String(line ?? '').trim();
    if (t) return t;
  }
  return '';
};

const QuickCreateSchema = z.object({
  subject: z.string().min(1, '科目名を入力してください'),
  lesson: z.string().min(1, '授業名を入力してください'),
  content: z
    .string()
    .min(1, '内容を入力してください')
    .refine((v) => Boolean(getFirstNonEmptyLine(v)), {
      message: '内容の1行目にタイトルを入力してください。',
    }),
});

type QuickCreateRequest = z.infer<typeof QuickCreateSchema>;

export default function QuickCreationFormPage() {
  const router = useRouter();

  const QC_LAYOUT_KEY = 'quickslide_qc_layout_v1';
  const QC_FORM_KEY = 'quickslide_qc_form_v1';

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const layout = qcStorage.get(QC_LAYOUT_KEY);
    if (!layout) {
      router.replace('/quick-create');
      return;
    }

    const savedForm = qcStorage.get(QC_FORM_KEY);
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        form.reset({
          subject: parsed.subject ?? '',
          lesson: parsed.lesson ?? '',
          content: parsed.content ?? '',
        });
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<QuickCreateRequest>({
    resolver: zodResolver(QuickCreateSchema),
    defaultValues: { subject: '', lesson: '', content: '' },
    mode: 'onTouched',
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (data: QuickCreateRequest) => {
    try {
      qcStorage.set(QC_FORM_KEY, JSON.stringify(data));
      router.push('/quick-create/preview');
    } catch (error) {
      form.setError('root.serverError' as any, { message: 'ネットワークエラーが発生しました' } as any);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl text-gray-900">スライド情報を入力</h2>
            <p className="text-gray-600">基本情報を入力して素早くスライドを作成</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    科目 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 日本語基礎" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lesson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    授業 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: 第1課" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    内容 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={8} placeholder="1行目がタイトルです。2行目以降が本文です..." {...field} />
                  </FormControl>
                  <div className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">
                    内容の入力方法については、次のようなルールがあります。
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
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.formState.errors as any).root?.serverError && (
              <p className="text-sm text-red-600 text-center">{(form.formState.errors as any).root.serverError.message}</p>
            )}

            <div className="flex gap-4 mt-8">
              <Button
                onClick={() => router.push('/quick-create')}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-50"
                type="button"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
              >
                次へ (プレビュー)
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}