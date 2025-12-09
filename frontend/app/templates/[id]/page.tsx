'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthStore } from '@/lib/store/AuthStore';
import { templateAPI } from '@/lib/api';
import SlideCanvas, { SlideCanvasRef } from "@/components/SlideCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, ChevronLeft, Trash2, Loader2, Maximize, Minimize, } from "lucide-react";

interface TemplateResponse {
    id: number | string;
    name: string;
    description: string;
    templateContent: string;
}

export default function TemplateEditorPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const templateId = Array.isArray(params.id) ? params.id[0] : params.id;
    const copyFromId = searchParams.get("copyFrom");

 
    const { isLoggedIn } = AuthStore.getState();
    if (typeof window !== "undefined" && !isLoggedIn) {
        window.location.replace("/login");
        return null;
    }

    const [templateName, setTemplateName] = useState(""); 
    const [templateDescription, setTemplateDescription] = useState("");
    const [initialContent, setInitialContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); 
    const [error, setError] = useState<string | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);


    const canvasRef = useRef<SlideCanvasRef>(null);

    // LOAD DATA
    useEffect(() => {
        const fetchTemplate = async () => {
            if (templateId === "new" && !copyFromId) {
                setTemplateName("Template Mới");
                setTemplateDescription("");
                setInitialContent('{"placeholders": []}');
                setIsLoading(false);
                return;
            }
            try {
                const idToFetch = copyFromId || templateId;
                const data: TemplateResponse = await templateAPI.getTemplateById(idToFetch);
                if (copyFromId) {
                    setTemplateName(`Copy of ${data.name}`);
                    setTemplateDescription(data.description || "");
                    setInitialContent(data.templateContent);
                    router.replace("/templates/new");
                } else {
                    setTemplateName(data.name);
                    setTemplateDescription(data.description || "");
                    setInitialContent(data.templateContent);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || "Không thể tải template.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId, copyFromId, router]);


    const handleSave = async () => { 
        if (!templateName.trim()) {
            alert("Tên template không được để trống!");
            return;
        }
        const contentToSave = canvasRef.current?.getContent();
        if (!contentToSave || contentToSave === '{"placeholders":[]}') {
            alert("Nội dung template đang trống. Vui lòng thêm placeholder.");
            return;
        }
        setIsSaving(true);
        setError(null);

        const requestData = {
            name: templateName,
            description: templateDescription,
            templateContent: contentToSave,
            isPublic: false,
        };

        try {
            if (templateId === "new") {
                const response: TemplateResponse = await templateAPI.createTemplate(requestData);
                alert(`Template "${response.name}" đã được tạo thành công!`);
                router.replace(`/templates/${response.id}`);
            } else {
                await templateAPI.updateTemplate(templateId, requestData);
                alert("Template đã được cập nhật!");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Lưu thất bại.");
        } finally {
            setIsSaving(false);
        }
    };


    const handleDelete = async () => { 
        if (templateId === "new") return;
        if (window.confirm(`Bạn có chắc muốn xóa template "${templateName}"?`)) {
            try {
                await templateAPI.deleteTemplate(templateId);
                alert("Template đã được xóa.");
                router.push("/store"); 
            } catch (err: any) {
                setError(err.response?.data?.message || "Bạn không có quyền xóa.");
            }
        }
    };

    // UI LOADING
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="ml-2">Đang tải trình chỉnh sửa template...</p>
            </div>
        );
    }

    const MaximizeIcon = isMaximized ? Minimize : Maximize;

    return (
        <div className={`flex flex-col h-screen ${isMaximized ? "w-screen" : "w-full"}`}>
            {/* ================= HEADER ================ */}
            <header className="flex items-center justify-between p-3 border-b bg-white shadow-sm shrink-0">
                {/* LEFT SIDE: Back Button & Template Name Input */}
                <div className="flex items-center gap-3">
                    <Link href="/store" title="Quay lại Thư viện Template">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="size-5" />
                        </Button>
                    </Link>
                    {/*Logo chèn thêm*/}
                    <Input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Nhập tên Template..."
                        className="w-[380px] border border-gray-300 rounded-md px-3 py-2 text-base font-medium bg-white"
                    />
                </div>
                {/* RIGHT SIDE: Maximize, Delete, Save */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMaximized(!isMaximized)}
                        title={isMaximized ? "Thu nhỏ" : "Toàn màn hình"}
                    >
                        <MaximizeIcon className="size-5" />
                    </Button>
                    {templateId !== "new" && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm flex items-center gap-1"
                        >
                            <Trash2 className="size-4" /> Xóa
                        </Button>
                    )}
                    <Button
                        onClick={handleSave} 
                        disabled={isSaving || !templateName.trim()}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 text-sm flex items-center gap-1 text-white"
                    >
                        {isSaving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        {isSaving ? "Đang lưu..." : "Lưu Template"}
                    </Button>
                </div>
            </header>
            {/* =============== CANVAS AREA (Body) =============== */}
            <div className="flex-1 overflow-auto">
                <SlideCanvas ref={canvasRef} initialContent={initialContent} />
            </div>
            {/* ERROR MESSAGE */}
            {error && (
                <div className="bg-red-100 text-red-700 p-2 text-center text-sm fixed bottom-0 left-0 right-0">
                    Lỗi: {error}
                </div>
            )}
        </div>
    );
}