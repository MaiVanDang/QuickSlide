// app/store/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { templateAPI } from '@/lib/api'; // Import API
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter } from 'lucide-react';

interface TemplateCardProps {
  id: number;
  name: string;
  description: string;
  slideCount: number;
  category: string;
  href: string; // Sử dụng prop href đã được tính toán
}

const TemplateCard: React.FC<TemplateCardProps> = ({ id, name, description, slideCount, category, href }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
    <CardHeader>
      <CardTitle className="text-lg">{name}</CardTitle>
      <p className="text-sm text-gray-500">{slideCount} slides</p>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600 truncate">{description}</p>
      <p className="text-xs mt-2 font-medium text-purple-600">{category}</p>
    </CardContent>
    <CardFooter>
      <Button asChild className="w-full">
        <Link href={href}>
          Use Template
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

// Dữ liệu giả lập template (mockTemplates không đổi)
const mockTemplates = [
  { id: 1, name: "Business Presentation Starter", description: "Mẫu thuyết trình chuyên nghiệp cho khởi nghiệp.", slideCount: 10, category: "Business" },
  { id: 2, name: "Educational Lesson Plan", description: "Bố cục đơn giản cho giáo án điện tử.", slideCount: 8, category: "Education" },
  { id: 3, name: "Marketing Campaign Overview", description: "Template tổng quan về chiến dịch marketing.", slideCount: 12, category: "Marketing" },
  { id: 4, name: "Technical Project Overview", description: "Báo cáo chi tiết kỹ thuật dự án mới.", slideCount: 15, category: "Technology" },
];


export default function TemplateLibraryPage() {
  const [templates, setTemplates] = useState(mockTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Logic Tải Template (giữ nguyên)
  useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            try {
                // ✅ KÍCH HOẠT: Lấy dữ liệu thực tế từ backend
                const data = await templateAPI.getAllTemplates(); 
                setTemplates(data); 
                setError(null);
            } catch (e: any) {
                // Giữ lại mock data nếu API lỗi trong quá trình phát triển (tùy chọn)
                // setTemplates(mockTemplates); 
                setError(e.response?.data?.message || "Không thể tải thư viện template. Vui lòng kiểm tra kết nối.");
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates(); // ✅ Gọi hàm fetchTemplates
    }, []);
  
  
  // Xử lý tìm kiếm (giữ nguyên)
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Template Library
      </h1>

      {/* Thanh Tìm kiếm và Tạo mới */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>

        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
          <Button asChild>
            {/* ✅ SỬA: Trỏ đến /templates/new */}
            <Link href="/templates/new" className="flex items-center gap-2">
              <Plus className="size-4" />
              Create New
            </Link>
          </Button>
        </div>
      </div>

      {/* Hiển thị lỗi hoặc loading */}
      {loading && <p className="text-center text-blue-500">Đang tải template...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
      
      {/* Danh sách Templates */}
      {!loading && !error && filteredTemplates.length === 0 && (
          <p className="text-center text-gray-500 mt-10">Không tìm thấy template nào phù hợp.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {!loading && filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            id={template.id}
            name={template.name}
            description={template.description}
            slideCount={template.slideCount}
            category={template.category}
            // ✅ SỬA: Trỏ đến /templates/[id]
            href={`/templates/${template.id}`} 
          />
        ))}
      </div>
    </div>
  );
}