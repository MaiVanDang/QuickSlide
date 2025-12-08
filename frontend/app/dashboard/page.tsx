// app/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { Plus, Zap, Users, Clock, Edit, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { templateAPI } from '@/lib/api'; // Giả định sử dụng api.ts

interface RecentItem {
    id: number;
    name: string;
    authorUsername: string;
    updatedAt: string;
    isPublic: boolean;
}

const RecentTemplateCard = ({ id, name, authorUsername, updatedAt }: RecentItem) => {
    const formattedDate = new Date(updatedAt).toLocaleDateString('vi-VN');
    const linkHref = `/templates/${id}`; // ✅ ĐÚNG: Link dẫn đến màn hình chỉnh sửa

    return (
        <Link href={linkHref} className="block p-4 bg-white border rounded-xl hover:shadow-lg transition duration-200">
            <div className="flex items-center space-x-2 mb-1 text-gray-800">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold truncate text-base">{name}</span>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
                <p>Tác giả: {authorUsername}</p>
                <p>Chỉnh sửa: {formattedDate}</p>
            </div>
        </Link>
    );
};
const DashboardPage = () => {
const [recentTemplates, setRecentTemplates] = useState<RecentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const username = 'DevUser'; 

    useEffect(() => {
        const fetchRecent = async () => {
            setLoading(true); // ✅ Đảm bảo loading được đặt lại
            try {
                // ✅ KÍCH HOẠT: Gọi API GET /api/templates/recent
                const recent = await templateAPI.getRecentTemplates();
                setRecentTemplates(recent);
            } catch (error) {
                console.error("Failed to fetch recent templates:", error);
                // Giả định: nếu API lỗi, set mảng rỗng
                setRecentTemplates([]); 
            } finally {
                setLoading(false);
            }
        };
        fetchRecent(); // ✅ Gọi hàm fetchRecent
    }, []);

    return (
        <div className="container mx-auto p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Chào mừng, {username}!</h2>

            {/* 3 chức năng chính */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Link href="/templates/new" className="block bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-indigo-600">
                    {/* ✅ ĐÚNG: Trỏ đến /templates/new */}
                    <Edit className="w-8 h-8 text-indigo-600 mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Tạo & Chỉnh Sửa Template</h3>
                    <p className="text-gray-500">Thiết kế bố cục slide mẫu.</p>
                </Link>

                <Link href="/auto-generate" className="block bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-teal-600">
                    <Zap className="w-8 h-8 text-teal-600 mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Tạo Slide Nhanh</h3>
                    <p className="text-gray-500">Tạo slide tự động từ nội dung nhập.</p>
                </Link>

                <Link href="/batch-create" className="block bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border-t-4 border-amber-600">
                    <Users className="w-8 h-8 text-amber-600 mb-3" />
                    <h3 className="text-xl font-semibold mb-2">Tạo Hàng Loạt (Batch)</h3>
                    <p className="text-gray-500">Import Excel để tạo nhiều slide cùng lúc.</p>
                </Link>
            </div>

            {/* Lịch sử gần đây */}
            <div className="mt-12">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Clock className="w-6 h-6 mr-2 text-gray-600" /> Hoạt động gần đây
                </h3>
                {loading ? (
                    <p>Đang tải lịch sử...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentTemplates.length > 0 ? (
                            recentTemplates.map((item) => (
                                <RecentTemplateCard key={item.id} {...item} />
                            ))
                        ) : (
                            <p className="text-gray-500 italic">Chưa có hoạt động gần đây nào.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;