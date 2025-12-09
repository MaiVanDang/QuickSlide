// app/store/page.tsx (PHIÊN BẢN ĐÃ CẬP NHẬT HOÀN TOÀN)
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Trash2, Loader2, Users, Lock, ChevronDown } from 'lucide-react'; 

// --- MOCK API & COMPONENTS (Cần thay thế bằng components UI thực tế của bạn) ---

const Button: React.FC<any> = ({ children, className, asChild, variant, ...props }) => {
    const defaultClasses = "px-4 py-2 rounded-md font-medium transition-colors text-sm";
    let style = "bg-black hover:bg-gray-800 text-white";
    if (variant === 'destructive') style = "bg-red-600 hover:bg-red-700 text-white";
    if (variant === 'outline') style = "bg-white border text-gray-700 hover:bg-gray-100";
    
    const finalClasses = `${defaultClasses} ${style} ${className}`;
    
    if (asChild && children.type === Link) {
        return React.cloneElement(children, { className: finalClasses, ...props });
    }
    return <button className={finalClasses} {...props}>{children}</button>;
};

const Input: React.FC<any> = ({ className, ...props }) => <input className={`border border-gray-300 rounded-md p-2 w-full ${className}`} {...props} />;
const Card: React.FC<any> = ({ children, className }) => <div className={`bg-white p-4 border border-gray-200 rounded-xl ${className}`}>{children}</div>;
const CardHeader: React.FC<any> = ({ children }) => <div className="mb-2">{children}</div>;
const CardTitle: React.FC<any> = ({ children, className }) => <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
const CardFooter: React.FC<any> = ({ children, className }) => <div className={`pt-4 ${className}`}>{children}</div>;

// Giả định API
const templateAPI = {
    // Cần phải có 2 hàm API riêng biệt ở Backend để hỗ trợ việc phân chia này
    getPublicTemplates: async (): Promise<any[]> => {
        // Giả định: Template của người khác
        return [
            { id: 101, name: "Public Sales 2024", description: "Mẫu báo cáo bán hàng", slideCount: 4, category: "Sales", userId: 99, username: "Admin" },
            { id: 102, name: "Template M012", description: "Marketing", slideCount: 3, category: "Marketing", userId: 99, username: "Admin" },
        ];
    },
    getOwnedTemplates: async (): Promise<any[]> => {
        // Giả định: Template tự tạo
        return [
            { id: 1, name: "Template Mới", description: "Tự tạo", slideCount: 5, category: "Business", userId: 1, username: "DevUser" },
            { id: 2, name: "Test1", description: "Demo", slideCount: 2, category: "Test", userId: 1, username: "DevUser" },
        ];
    },
    deleteTemplate: async (id: number | string): Promise<void> => {
        // Thực hiện xóa Template trên Backend
        await new Promise(resolve => setTimeout(resolve, 500)); 
        console.log(`Deleted template ID: ${id}`);
    },
};

// Giả định ID của người dùng hiện tại
const CURRENT_USER_ID = 1; 

// --- INTERFACE ---

interface TemplateItem {
    id: number;
    name: string;
    description: string;
    slideCount: number;
    category: string;
    userId: number; // Thêm User ID để phân biệt
    username: string;
    isOwner: boolean; // Flag để biết có phải chủ sở hữu không
}

interface TemplateCardProps extends TemplateItem {
    href: string;
    onDelete: (id: number, name: string) => void;
}

// --- TEMPLATE CARD COMPONENT (Đã sửa) ---

const TemplateCard: React.FC<TemplateCardProps> = ({ id, name, description, slideCount, category, href, onDelete, isOwner }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
        <CardHeader>
            <CardTitle className="text-md pr-6">{name}</CardTitle>
            <p className="text-xs text-gray-500">{slideCount} slides</p>
        </CardHeader>

        <div className="flex-1 text-xs text-gray-500 py-2">
            {description}
            {!isOwner && <p className="mt-1 text-xs text-indigo-500">Tác giả: {name === "Template M012" ? "Admin" : "Public User"}</p>}
        </div>
        
        <CardFooter className="flex gap-2 p-0 pt-4">
            
            {/* ✅ NÚT XÓA CHỈ HIỆN KHI LÀ CHỦ SỞ HỮU */}
            {isOwner && (
                <Button
                    variant="destructive"
                    className="flex-1 flex items-center justify-center gap-1"
                    onClick={(e) => {
                        e.preventDefault(); 
                        onDelete(id, name);
                    }}
                    title={`Xóa template "${name}"`}
                >
                    <Trash2 className="size-4" /> Xóa
                </Button>
            )}
            
            {/* Nút SỬ DỤNG (Nút này sẽ được dùng để TẠO BẢN SAO nếu là Public Template) */}
            <Button 
                asChild 
                className={`bg-black hover:bg-gray-800 text-white ${isOwner ? 'flex-1' : 'w-full'}`}
            >
                <Link href={href}>
                    {isOwner ? 'Chỉnh sửa' : 'Sử dụng Template'}
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

// --- MAIN PAGE COMPONENT ---

export default function TemplateLibraryPage() {
    // 1. Dữ liệu được chia thành 2 mảng
    const [ownedTemplates, setOwnedTemplates] = useState<TemplateItem[]>([]);
    const [publicTemplates, setPublicTemplates] = useState<TemplateItem[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Load dữ liệu
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            setError(null);
            try {
                // Giả định người dùng đã đăng nhập (CURRENT_USER_ID = 1)
                const ownedData = await templateAPI.getOwnedTemplates();
                const publicData = await templateAPI.getPublicTemplates();

                setOwnedTemplates(ownedData.map(t => ({ ...t, isOwner: true })));
                setPublicTemplates(publicData.map(t => ({ ...t, isOwner: false })));

            } catch (err: any) {
                console.error("Lỗi tải template:", err);
                setError(err.message || "Không thể tải thư viện template.");
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    // Logic tìm kiếm (áp dụng cho cả 2 mảng)
    const filterTemplates = (templates: TemplateItem[]) => {
        if (!searchTerm) return templates;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return templates.filter(t =>
            t.name.toLowerCase().includes(lowerCaseSearch) ||
            t.category.toLowerCase().includes(lowerCaseSearch) ||
            t.username.toLowerCase().includes(lowerCaseSearch)
        );
    };

    const filteredOwned = useMemo(() => filterTemplates(ownedTemplates), [ownedTemplates, searchTerm]);
    const filteredPublic = useMemo(() => filterTemplates(publicTemplates), [publicTemplates, searchTerm]);


    // HÀM XÓA TEMPLATE
    const handleDelete = async (id: number, name: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa template "${name}"?`)) {
            setLoading(true);
            try {
                await templateAPI.deleteTemplate(id); 
                
                // Cập nhật trạng thái sau khi xóa thành công
                setOwnedTemplates(prev => prev.filter(t => t.id !== id));
                alert(`Template "${name}" đã được xóa thành công.`);

            } catch (err: any) {
                console.error("Lỗi xóa template:", err);
                setError(err.message || "Xóa thất bại. Vui lòng kiểm tra quyền sở hữu.");
            } finally {
                setLoading(false);
            }
        }
    };


    const renderTemplateSection = (title: string, icon: React.ReactNode, templates: TemplateItem[], isOwnerSection: boolean) => (
        <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-2">
                {icon} {title} 
                <span className="text-sm font-normal text-gray-500">({templates.length} mẫu)</span>
            </h2>
            
            {templates.length === 0 && !loading ? (
                <div className="text-center text-gray-500 py-8 border rounded-lg bg-white">
                    {isOwnerSection ? "Bạn chưa tạo template nào." : "Không có mẫu công khai nào được tìm thấy."}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            {...template}
                            href={isOwnerSection ? `/templates/${template.id}` : `/templates/new?copyFrom=${template.id}`} 
                            onDelete={handleDelete}
                            isOwner={isOwnerSection}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Template Library</h1>

            {/* Header: Search & Buttons */}
            <div className="flex justify-between items-center mb-10">
                <div className="relative w-1/3">
                    <Input
                        type="text"
                        placeholder="Search templates by name or category..."
                        value={searchTerm}
                        onChange={(e: any) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="size-4 text-gray-400 absolute left-3 top-3" />
                </div>
                <div className="flex gap-4">
                    <Button variant="outline">
                        <Filter className="size-4 mr-2" /> Filters
                    </Button>
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Link href="/templates/new">
                            <Plus className="size-4 mr-2" /> Create New
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-20 flex justify-center items-center">
                    <Loader2 className="size-6 animate-spin mr-2" /> Đang tải thư viện...
                </div>
            )}
            
            {/* Error State */}
            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                    Lỗi: {error}
                </div>
            )}

            {!loading && (
                <>
                    {/* KHU VỰC 1: TEMPLATE TỰ TẠO (Template tự tạo) */}
                    {renderTemplateSection(
                        "Template Tự tạo",
                        <Lock className="size-5 text-indigo-600" />,
                        filteredOwned,
                        true // isOwnerSection = true
                    )}

                    {/* KHU VỰC 2: TEMPLATE CÔNG KHAI (Template Public) */}
                    {renderTemplateSection(
                        "Template Public (Công khai)",
                        <Users className="size-5 text-teal-600" />,
                        filteredPublic,
                        false // isOwnerSection = false
                    )}
                </>
            )}
        </div>
    );
}