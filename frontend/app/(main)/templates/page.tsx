'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, Edit2, Trash2, Play, Layout } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createPresentationFromTemplateApi, getTemplatesApi, deleteTemplateApi, getTemplateSlidesApi } from '@/lib/api';
import { TemplateResponse } from '@/types/api/TemplateResponses';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { qcStorage } from '@/lib/utils/qc-storage';

export const dynamic = 'force-dynamic';

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const hasAuthToken = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('quickslide_jwt_token') || getCookieValue('quickslide_auth_token'));
};

function TemplateLibraryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectTarget = (searchParams.get('select') || '').toLowerCase();
  const selectMode = selectTarget === 'quick-create' || selectTarget === 'batch-generation';
  const refreshKey = searchParams.get('refresh') || '';

  const QC_LAYOUT_KEY = 'quickslide_qc_layout_v1';
  const QC_FORM_KEY = 'quickslide_qc_form_v1';
  const QC_TEMPLATE_ID_KEY = 'quickslide_qc_template_id_v1';
  const BG_TEMPLATE_ID_KEY = 'quickslide_bg_template_id_v1';
  const BG_TEMPLATE_SLIDE_ID_KEY = 'quickslide_bg_template_slide_id_v1'; // legacy

  const [searchQuery, setSearchQuery] = React.useState('');
  const [themeFilter, setThemeFilter] = React.useState<string>('all');
  const [sortKey, setSortKey] = React.useState<'created-desc' | 'created-asc' | 'name-asc' | 'name-desc'>('created-desc');

  const PAGE_SIZE = 12; // 4 cột x 3 hàng
  const [myPage, setMyPage] = React.useState(1);
  const [publicPage, setPublicPage] = React.useState(1);

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<number | null>(null);
  const [myTemplates, setMyTemplates] = React.useState<TemplateResponse[]>([]);
  const [publicTemplates, setPublicTemplates] = React.useState<TemplateResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [isUsingTemplate, setIsUsingTemplate] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Quan trọng: "mine" cần đăng nhập. Nếu chưa đăng nhập thì vẫn hiển thị template công khai.
      const tokenExists = hasAuthToken();

      const [publicResult, mineResult] = await Promise.allSettled([
        getTemplatesApi('public'),
        tokenExists ? getTemplatesApi('mine') : Promise.resolve({ data: [] as TemplateResponse[] } as any),
      ]);

      if (publicResult.status === 'fulfilled') {
        setPublicTemplates(publicResult.value.data || []);
      } else {
        console.error('公開テンプレートを取得できませんでした', publicResult.reason);
        setPublicTemplates([]);
        setError('公開テンプレートのリストを読み込めません');
      }

      if (mineResult.status === 'fulfilled') {
        setMyTemplates(mineResult.value.data || []);
      } else {
        // Nếu không xác thực (401/403) thì chỉ hiển thị danh sách "mine" rỗng.
        console.warn('テンプレートの取得に失敗しました（無視）', mineResult.reason);
        setMyTemplates([]);
      }
    } catch (err: any) {
      console.error('テンプレートの取得に失敗しました', err);
      setError('テンプレートのリストを読み込めません');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  React.useEffect(() => {
    // Khi quay lại từ editor, App Router có thể giữ page không bị unmount.
    // Dùng query param thay đổi để trigger refetch ngay lập tức.
    if (refreshKey) fetchTemplates();
  }, [fetchTemplates, refreshKey]);

  React.useEffect(() => {
    // Nếu user tạo template ở route khác rồi quay lại,
    // trang có thể được restore từ cache mà không remount.
    const onFocus = () => fetchTemplates();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchTemplates();
    };
    const onPopState = () => fetchTemplates();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('popstate', onPopState);
    };
  }, [fetchTemplates]);

  const handleDelete = (id: number) => {
    setSelectedTemplateId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplateApi(selectedTemplateId);
      toast.success('テンプレートは削除されました (公開テンプレートは引き続き使用できます)');
      setShowDeleteModal(false);
      setSelectedTemplateId(null);
      // Refetch: template public vẫn còn, template của tôi bị ẩn khỏi danh sách "mine"
      fetchTemplates();
    } catch (err) {
      console.error('問題のあるテンプレートを削除する', err);
      setError('テンプレートの削除に失敗しました');
      toast.error('テンプレートの削除に失敗しました');
    }
  };

  const chooseForQuickCreate = async (templateId: number) => {
    try {
      setIsSelecting(true);
      const res = await getTemplateSlidesApi(templateId);
      const slides = res.data || [];
      const first = slides[0];
      if (!first?.layoutJson) {
        toast.error('このテンプレートにはスライドレイアウトがありません');
        return;
      }
      qcStorage.set(QC_LAYOUT_KEY, first.layoutJson);
      qcStorage.set(QC_TEMPLATE_ID_KEY, String(templateId));
      qcStorage.remove(QC_FORM_KEY);
      toast.success('クイックスライド作成用に選択されたテンプレート');
      router.push('/quick-create');
    } catch (err) {
      console.error('クイック作成用のテンプレートの選択に失敗しました', err);
      toast.error('テンプレートの選択に失敗しました');
    } finally {
      setIsSelecting(false);
    }
  };

  const chooseForBatchGeneration = async (templateId: number) => {
    try {
      setIsSelecting(true);
      const res = await getTemplateSlidesApi(templateId);
      const slides = (res.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const first = slides[0];
      if (!first?.layoutJson) {
        toast.error('このテンプレートにはスライドレイアウトがありません');
        return;
      }
      qcStorage.set(BG_TEMPLATE_ID_KEY, String(templateId));
      qcStorage.remove(BG_TEMPLATE_SLIDE_ID_KEY);
      toast.success('スライドを一括作成するために選択されたテンプレート');
      router.push('/batch-generation');
    } catch (err) {
      console.error('バッチ生成のテンプレートの選択に失敗しました', err);
      toast.error('テンプレートの選択に失敗しました');
    } finally {
      setIsSelecting(false);
    }
  };

  const applyTemplateDeck = async (templateId: number) => {
    try {
      if (!hasAuthToken()) {
        toast.error('テンプレートを使用するにはログインが必要です');
        router.push('/login');
        return;
      }

      setIsUsingTemplate(true);
      const res = await createPresentationFromTemplateApi({ templateId });
      const created = res.data;
      if (!created?.id) {
        toast.error('テンプレートからのプロジェクトの作成に失敗しました');
        return;
      }
      router.push(`/editor/presentations/${created.id}`);
    } catch (err) {
      console.error('テンプレートの使用に失敗しました', err);
      toast.error('テンプレートの使用に失敗しました');
    } finally {
      setIsUsingTemplate(false);
    }
  };

  const getThemePreviewClass = (theme?: string) => {
    switch ((theme || 'default').toLowerCase()) {
      case 'green':
        return 'from-green-100 to-green-200';
      case 'purple':
        return 'from-purple-100 to-purple-200';
      case 'blue':
      case 'default':
      default:
        return 'from-blue-100 to-blue-200';
    }
  };

  const parseApiDateMs = (value: unknown): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();

    // Handle epoch numbers/strings (backend may serialize Instant as seconds)
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value < 1_000_000_000_000 ? value * 1000 : value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        const asNum = Number(trimmed);
        if (!Number.isFinite(asNum)) return 0;
        return asNum < 1_000_000_000_000 ? asNum * 1000 : asNum;
      }

      const parsed = new Date(trimmed).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  const formatDate = (value: unknown) => {
    const ms = parseApiDateMs(value);
    if (!ms) return '';
    return new Date(ms).toLocaleDateString();
  };

  const normalizeTheme = (theme?: string) => (theme || 'default').trim().toLowerCase();

  const availableThemes = React.useMemo(() => {
    const all = [...myTemplates, ...publicTemplates]
      .map((t) => normalizeTheme(t.theme))
      .filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
  }, [myTemplates, publicTemplates]);

  React.useEffect(() => {
    // Khi đổi filter/search/sort thì reset về trang 1 để tránh rỗng
    setMyPage(1);
    setPublicPage(1);
  }, [searchQuery, themeFilter, sortKey]);

  const TemplateCard = ({ template, allowDelete }: { template: TemplateResponse; allowDelete: boolean }) => (
    <Card className="border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-56">
        {template.previewImageUrl ? (
          <img src={template.previewImageUrl} alt={template.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br flex items-center justify-center',
              getThemePreviewClass(template.theme),
            )}
          >
            <Layout className="w-10 h-10 text-blue-600" />
          </div>
        )}

        {/* Title + meta overlay */}
        <div className="absolute inset-x-0 bottom-12 p-3 bg-black/40">
          <div className="text-white text-base font-medium truncate">{template.name}</div>
          <div className="text-white/90 text-xs truncate">
            {template.ownerUsername}
            {template.createdAt ? ` · ${formatDate(template.createdAt)}` : ''}
            {template.theme ? ` · ${template.theme}` : ''}
          </div>
        </div>

        {/* Actions overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-white/90">
          <div className="flex gap-2">
            {selectMode ? (
              <Button
                onClick={() =>
                  selectTarget === 'batch-generation'
                    ? chooseForBatchGeneration(template.id)
                    : chooseForQuickCreate(template.id)
                }
                disabled={isSelecting}
                className="w-full bg-blue-600 hover:bg-blue-700 h-9"
              >
                <Play className="w-4 h-4 mr-2" />
                選択
              </Button>
            ) : allowDelete && template.isOwner ? (
              <>
                <Button
                  onClick={() => router.push(`/templates/${template.id}`)}
                  variant="outline"
                  className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 h-9"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  編集
                </Button>
                <Button
                  onClick={() => handleDelete(template.id)}
                  variant="outline"
                  className="px-3 py-2 border-red-600 text-red-600 hover:bg-red-50 h-9"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => applyTemplateDeck(template.id)}
                disabled={isUsingTemplate}
                className="w-full bg-blue-600 hover:bg-blue-700 h-9"
              >
                <Play className="w-4 h-4 mr-2" />
                使用
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  const applySearchFilterSort = (templates: TemplateResponse[]) => {
    const q = searchQuery.trim().toLowerCase();
    let result = templates;

    if (q) {
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (themeFilter !== 'all') {
      result = result.filter((t) => normalizeTheme(t.theme) === themeFilter);
    }

    result = result.slice().sort((a, b) => {
      switch (sortKey) {
        case 'created-asc':
          return parseApiDateMs(a.createdAt) - parseApiDateMs(b.createdAt);
        case 'created-desc':
          return parseApiDateMs(b.createdAt) - parseApiDateMs(a.createdAt);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  };

  const paginate = (items: TemplateResponse[], page: number) => {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return {
      page: safePage,
      totalPages,
      items: items.slice(start, start + PAGE_SIZE),
    };
  };

  const renderPagination = (page: number, totalPages: number, onChange: (p: number) => void) => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
      <div className="flex gap-2 justify-center mt-5">
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            className={p === page ? 'bg-blue-600 hover:bg-blue-700' : ''}
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}
      </div>
    );
  };

  const filteredMyTemplates = React.useMemo(() => applySearchFilterSort(myTemplates), [myTemplates, searchQuery, themeFilter, sortKey]);
  const filteredPublicTemplates = React.useMemo(
    () => applySearchFilterSort(publicTemplates),
    [publicTemplates, searchQuery, themeFilter, sortKey],
  );

  const myPageData = React.useMemo(() => paginate(filteredMyTemplates, myPage), [filteredMyTemplates, myPage]);
  const publicPageData = React.useMemo(() => paginate(filteredPublicTemplates, publicPage), [filteredPublicTemplates, publicPage]);

  React.useEffect(() => {
    if (myPage !== myPageData.page) setMyPage(myPageData.page);
  }, [myPage, myPageData.page]);

  React.useEffect(() => {
    if (publicPage !== publicPageData.page) setPublicPage(publicPageData.page);
  }, [publicPage, publicPageData.page]);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl text-gray-900">{selectMode ? 'テンプレートを選択' : 'テンプレートライブラリ'}</h1>
        <div className="flex items-center gap-4">
          {/* ① Search Templates */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索テンプレート"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 w-64 text-sm"
            />
          </div>
          {/* ② Filters Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>フィルター</DropdownMenuLabel>

              <DropdownMenuRadioGroup value={themeFilter} onValueChange={setThemeFilter}>
                <DropdownMenuRadioItem value="all">テーマ: すべて</DropdownMenuRadioItem>
                {availableThemes.map((t) => (
                  <DropdownMenuRadioItem key={t} value={t}>
                    テーマ： {t}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sắp xếp</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                <DropdownMenuRadioItem value="created-desc">作成日時: 最新</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created-asc">作成日時: 古い</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-asc">文字列: A → Z</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-desc">文字列: Z → A</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* ③ Create New Button */}
          {!selectMode && (
            <Button
              onClick={() => router.push('/templates/new')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              新規作成
            </Button>
          )}
        </div>
      </div>

      {/* ⑧ Template Tự Tạo */}
      <section className="mb-12">
        <h2 className="text-xl mb-6 text-gray-900">私のテンプレート</h2>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        {isLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {myPageData.items.map((template) => (
                <TemplateCard key={template.id} template={template} allowDelete={true} />
              ))}
            </div>
            {renderPagination(myPageData.page, myPageData.totalPages, setMyPage)}
          </>
        )}
      </section>

      {/* ⑨ Template Công khai */}
      <section>
        <h2 className="text-xl mb-6 text-gray-900">公開テンプレート</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {publicPageData.items.map((template) => (
                <TemplateCard key={template.id} template={template} allowDelete={false} />
              ))}
            </div>
            {renderPagination(publicPageData.page, publicPageData.totalPages, setPublicPage)}
          </>
        )}
      </section>

      {/* Modal Xác nhận Xóa */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>テンプレートを削除</DialogTitle>
            <DialogDescription>
              このテンプレートを削除してもよろしいですか？この操作は元に戻せません。
              <br />
              (注意: テンプレートは公開ライブラリに保存されます)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              消去
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TemplateLibraryPage() {
  return (
    <React.Suspense fallback={<p className="text-sm text-gray-500">読み込み中...</p>}>
      <TemplateLibraryPageInner />
    </React.Suspense>
  );
}