'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout, Zap, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getRecentProjectsApi, getTemplatesApi } from '@/lib/api';
import { PresentationResponse } from '@/types/api/PresentationResponses';
import { TemplateResponse } from '@/types/api/TemplateResponses';

export const dynamic = 'force-dynamic';

interface CreationOptionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
  href: string;
}

const CreationOption = ({ icon: Icon, title, description, bgColor, hoverBgColor, textColor, href }: CreationOptionProps) => {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group w-full text-left"
    >
      <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mb-4 group-hover:${hoverBgColor} transition-colors`}>
        <Icon className={`w-8 h-8 ${textColor}`} />
      </div>
      <h3 className="text-lg mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </button>
  );
};

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const hasAuthToken = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('quickslide_jwt_token') || getCookieValue('quickslide_auth_token'));
};

const getAxiosStatus = (err: unknown): number | null => {
  if (!err || typeof err !== 'object') return null;
  const anyErr = err as any;
  const status = anyErr?.response?.status;
  return typeof status === 'number' ? status : null;
};

const clearAuthToken = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('quickslide_jwt_token');
  } catch {
    // ignore
  }
  try {
    document.cookie = 'quickslide_auth_token=; Max-Age=0; path=/';
  } catch {
    // ignore
  }
};

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshKey = searchParams.get('refresh') || '';
  const [isLoading, setIsLoading] = React.useState(false);
  const [recentProjects, setRecentProjects] = React.useState<
    { kind: 'presentation' | 'template';
      id: number;
      title: string;
      ownerUsername: string;
      editedDate: string;
      href: string;
    }[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);

  const parseApiDateMs = (value: unknown): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
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

  const formatDateTime = (value: unknown) => {
    const ms = parseApiDateMs(value);
    if (!ms) return '';
    return new Date(ms).toLocaleString();
  };

  const fetchRecents = React.useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const tokenExists = hasAuthToken();

        const [presentationsResult, templatesResult] = await Promise.allSettled([
          getRecentProjectsApi(),
          tokenExists ? getTemplatesApi('mine') : Promise.resolve({ data: [] as TemplateResponse[] } as any),
        ]);

        // If the backend restarted and JWT signing secret changed, existing tokens become invalid.
        // Surface this clearly instead of silently showing empty/stale data.
        if (presentationsResult.status === 'rejected') {
          const status = getAxiosStatus(presentationsResult.reason);
          if (status === 401 || status === 403) {
            clearAuthToken();
            setRecentProjects([]);
            setError('セッションの有効期限が切れました。もう一度ログインしてください。');
            return;
          }
        }

        const presentations: PresentationResponse[] =
          presentationsResult.status === 'fulfilled' ? (presentationsResult.value.data || []) : [];

        const templates: TemplateResponse[] =
          templatesResult.status === 'fulfilled' ? (templatesResult.value.data || []) : [];

        const recentTemplates = templates
          .slice()
          .sort(
            (a, b) =>
              parseApiDateMs(b.editedAt || b.createdAt) - parseApiDateMs(a.editedAt || a.createdAt),
          )
          .slice(0, 10)
          .map((t) => ({
            kind: 'template' as const,
            id: t.id,
            title: t.name,
            ownerUsername: t.ownerUsername,
            editedDate: t.editedAt || t.createdAt,
            href: `/templates/${t.id}`,
          }));

        const recentPresentations = presentations.map((p) => ({
          kind: 'presentation' as const,
          id: p.id,
          title: p.title,
          ownerUsername: p.ownerUsername,
          editedDate: p.editedDate,
          href: `/editor/presentations/${p.id}`,
        }));

        const merged = [...recentTemplates, ...recentPresentations]
          .sort((a, b) => parseApiDateMs(b.editedDate) - parseApiDateMs(a.editedDate))
          .slice(0, 10);

        setRecentProjects(merged);
      } catch (err) {
        console.error('Failed to load recent projects', err);
        setError('最近のプロジェクト一覧を読み込めませんでした。');
      } finally {
        setIsLoading(false);
      }
    }, []);

  React.useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  React.useEffect(() => {
    if (refreshKey) fetchRecents();
  }, [fetchRecents, refreshKey]);

  React.useEffect(() => {
    // Similar to templates page: ensure dashboard updates when returning from other flows.
    const onFocus = () => fetchRecents();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchRecents();
    };
    const onPopState = () => fetchRecents();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('popstate', onPopState);
    };
  }, [fetchRecents]);

  return (
    <div className="space-y-12">
      {/* ⑧ Khu vực Tùy chọn Tạo */}
      <section>
        <h2 className="text-xl mb-6 text-gray-900">新規作成</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CreationOption
            icon={Layout}
            title="テンプレート編集"
            description="カスタムテンプレートを作成"
            bgColor="bg-blue-100"
            hoverBgColor="bg-blue-200"
            textColor="text-blue-600"
            href="/templates/new" // Chuyển đến màn hình tạo template mới (No. 5)
          />
          <CreationOption
            icon={Zap}
            title="クイック作成"
            description="スライドを素早く作成"
            bgColor="bg-green-100"
            hoverBgColor="bg-green-200"
            textColor="text-green-600"
            href="/quick-create" // Chuyển đến màn hình Tạo Slide Nhanh (No. 4/6)
          />
          <CreationOption
            icon={FileSpreadsheet}
            title="バッチ生成"
            description="複数のスライドをまとめて作成"
            bgColor="bg-purple-100"
            hoverBgColor="bg-purple-200"
            textColor="text-purple-600"
            href="/batch-generation" // Chuyển đến màn hình Tạo Hàng loạt (No. 6)
          />
        </div>
      </section>

      {/* ⑨ Khu vực Dự án gần đây */}
      <section>
        <h2 className="text-xl mb-6 text-gray-900">最近のプロジェクト</h2>
        <Card className="border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-200">
                <TableRow>
                  <TableHead className="px-6 py-3 text-sm text-gray-700">プロジェクト名</TableHead>
                  <TableHead className="px-6 py-3 text-sm text-gray-700">作成者</TableHead>
                  <TableHead className="px-6 py-3 text-sm text-gray-700">更新日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {recentProjects.map((project) => (
                  <TableRow 
                    key={`${project.kind}-${project.id}`} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(project.href)}
                  >
                    <TableCell className="px-6 py-4 text-gray-900 font-medium">{project.title}</TableCell>
                    <TableCell className="px-6 py-4 text-gray-600">{project.ownerUsername}</TableCell>
                    <TableCell className="px-6 py-4 text-gray-600">{formatDateTime(project.editedDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Card className="border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </Card>
        </div>
      }
    >
      <DashboardPageInner />
    </React.Suspense>
  );
}