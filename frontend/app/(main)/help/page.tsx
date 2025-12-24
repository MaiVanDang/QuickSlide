// frontend/app/(main)/help/page.tsx

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, HelpCircle, FileText, CreditCard, Book, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

// Định nghĩa kiểu dữ liệu cho danh mục
type HelpCategory = 'getting-started' | 'account' | 'payment' | 'guide';

// Dữ liệu giả lập cho các chủ đề trợ giúp
const helpTopics: Record<HelpCategory, { id: number; title: string; preview: string }[]> = {
  'getting-started': [
    { id: 1, title: 'QuickSlideへようこそ', preview: 'QuickSlideの基本的な使い方を紹介' },
    { id: 2, title: '最初のスライドを作成', preview: '数ステップでスライドを作成' },
    { id: 3, title: 'テンプレートの使い方', preview: 'テンプレートを活用して素早く作成' },
  ],
  'account': [
    { id: 4, title: 'アカウント作成', preview: '新規登録方法' },
    { id: 5, title: 'パスワードをリセット', preview: 'パスワードを忘れた場合' },
  ],
  'payment': [
    { id: 7, title: '料金プラン', preview: 'QuickSlideの料金プランについて' },
    { id: 8, title: '支払い方法', preview: '利用可能な支払い方法' },
  ],
  'guide': [
    { 
      id: 10, 
      title: 'QuickslideとBatchslideの使い方はどうすればいいですか？', 
      preview: '内容の入力方法については、次のようなルールがあります。\n\n・1行目は、デフォルトでタイトルの設定となります。\n・タイトルの入力が終わったら、必ず「Enter」キーを押して改行してください。\n・それ以降の内容は「画像リンク --> 注釈 --> 内容 --> 時間」の順で読み取られます。\n・「\\\\--」を使用すると、次の属性へ移動します。\n・「\\-」を使用すると、同じ属性内の次の項目へ移動します。'
    },
    { id: 11, title: '一括作成の活用', preview: '簡単に一括で作成' },
  ],
};


// ----------------------------------------------------------------------
// SỬA LỖI: Định nghĩa Interface cho component SettingsMenuItem
interface SettingsMenuItemProps {
    category: HelpCategory; // Tên danh mục (ví dụ: 'account')
    icon: React.ElementType; // Icon component (ví dụ: User, Settings)
    label: string; // Nhãn hiển thị
    activeCategory: HelpCategory; // Danh mục đang hoạt động hiện tại
    setActiveCategory: (category: HelpCategory) => void; // Hàm cập nhật state
}
// ----------------------------------------------------------------------


// Re-use component cho Settings và Help Center
function SettingsMenuItem({ 
  category, 
  icon: Icon, 
  label, 
  activeCategory, 
  setActiveCategory 
}: SettingsMenuItemProps) { // <<< ĐÃ SỬA LỖI IMPLICIT ANY TYPE
  const isActive = activeCategory === category;
  return (
    <Button
      onClick={() => setActiveCategory(category)}
      variant="ghost"
      className={`w-full px-4 py-3 justify-start rounded-lg transition-colors flex items-center gap-3 ${
        isActive ? 'bg-blue-100 text-blue-600 hover:bg-blue-100' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Button>
  );
}


export default function HelpCenterPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = React.useState<HelpCategory>('getting-started');
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = () => {
    // 1. Gửi yêu cầu tìm kiếm tới API: GET /api/help/search?query=<từ khóa>
    console.log(`Searching help topics for: ${searchQuery}`);
  };

  return (
    <div className="flex flex-col">
      {/* Search Bar Area (Nổi bật) */}
      <div className="bg-blue-600 py-12 -mt-8 -mx-6 mb-8"> {/* Negative margin để kéo dài ra cạnh */}
        <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl text-white mb-6 text-center">お困りですか？</h2>
          {/* ③ Thanh Tìm kiếm */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="キーワードで検索..."
              className="w-full pl-12 pr-4 py-4 rounded-lg focus:ring-blue-400 text-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar - Categories Menu (④) */}
        <aside className="w-64">
          <Card className="p-4 border border-gray-200">
        <h3 className="text-sm mb-4 text-gray-700">ヘルプカテゴリ</h3>
            <div className="space-y-1">
          <SettingsMenuItem category="getting-started" icon={HelpCircle} label="はじめに" activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
          <SettingsMenuItem category="account" icon={FileText} label="アカウント" activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
          <SettingsMenuItem category="payment" icon={CreditCard} label="お支払い" activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
          <SettingsMenuItem category="guide" icon={Book} label="使い方ガイド" activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
            </div>
          </Card>
        </aside>

        {/* Right Content - Topics List (⑤) */}
        <main className="flex-1">
          <Card className="p-8 border border-gray-200">
            <h2 className="text-2xl mb-6 text-gray-900">
            {activeCategory === 'getting-started' && 'はじめに'}
            {activeCategory === 'account' && 'アカウント'}
            {activeCategory === 'payment' && 'お支払い'}
            {activeCategory === 'guide' && '使い方ガイド'}
            </h2>
            
            <div className="space-y-3">
              {helpTopics[activeCategory].map((topic) => (
                <button
                  key={topic.id}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group text-left"
                >
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-1 group-hover:text-blue-600">{topic.title}</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{topic.preview}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 ml-4 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Nút Liên hệ (⑥) */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <h3 className="text-lg mb-2 text-gray-900">解決できませんでしたか？</h3>
                <p className="text-gray-600 mb-4">サポートチームにお問い合わせください</p>
                <Button 
                    onClick={() => console.log('Opening contact modal/form')}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                お問い合わせ
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}