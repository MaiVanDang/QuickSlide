// components/SlideCanvas.tsx
'use client';

import React, { 
    useState, 
    useEffect, 
    useRef, 
    forwardRef, 
    useImperativeHandle,
    useCallback 
} from "react";
import { Bold, Italic, Underline, Square } from "lucide-react"; 

// --- INTERFACES & REFS ---
interface Placeholder {
    id: number;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    key: string;
    defaultValue: string;
    required: boolean;
}

export interface SlideCanvasRef {
    getContent: () => string;
}

interface SlideCanvasProps {
    initialContent: string;
}

const SlideCanvas = forwardRef<SlideCanvasRef, SlideCanvasProps>(
    ({ initialContent }, ref) => {
        
        // --- CONSTANTS & INITIAL STATE ---
        const GRID_SIZE = 10;
        const canvasWidth = 800;
        const canvasHeight = 600;
        const draggableItems = ["Title", "Text", "Image", "Date", "Variable"];
        const sampleData = { 
            title: "Tiêu đề Demo", 
            text: "Nội dung mẫu", 
            image: "https://via.placeholder.com/150", 
            date: "2025-11-27", 
            variable: "Giá trị biến" 
        };

        const safeParseInitialContent = (content: string) => {
            if (!content || content === '{"placeholders":[]}') {
                return [];
            }
            try {
                const parsed = JSON.parse(content);
                return parsed.placeholders || [];
            } catch (e) {
                console.error("Lỗi phân tích JSON Template. Khởi tạo canvas trống.", e);
                return [];
            }
        };

        const initialPlaceholders = safeParseInitialContent(initialContent);

        const [placeholders, setPlaceholders] = useState<Placeholder[]>(initialPlaceholders);

        // --- STATE QUẢN LÝ TƯƠNG TÁC (Đã sửa lỗi ReferenceError) ---
        const [selectedIds, setSelectedIds] = useState<number[]>([]); 
        const [editingId, setEditingId] = useState<number | null>(null); 
        const [preview, setPreview] = useState(false); 
        
        const [isDragging, setIsDragging] = useState(false); 
        const [isSelecting, setIsSelecting] = useState(false);
        const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

        // --- REF QUẢN LÝ DOM VÀ TỌA ĐỘ KÉO ---
        const canvasInnerRef = useRef<HTMLDivElement>(null); 
        const dragStartRef = useRef({ x: 0, y: 0 }); 
        const dragOffsetRef = useRef({ x: 0, y: 0 });
        const dragElementsRef = useRef(new Map<number, HTMLDivElement>()); 


        // --- PUBLIC REF EXPORT ---
        useImperativeHandle(ref, () => ({
            getContent: () => {
                const contentToSave = placeholders.map(ph => ({
                    type: ph.type,
                    x: ph.x,
                    y: ph.y,
                    width: ph.width,
                    height: ph.height,
                    label: ph.label,
                    key: ph.key,
                    defaultValue: ph.defaultValue,
                    required: ph.required,
                }));
                return JSON.stringify({ placeholders: contentToSave });
            },
        }));

        // --- CORE FUNCTIONS (Đã được sửa lỗi) ---

        const snapToGrid = (x: number, y: number) => ({
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        });

        const addPlaceholder = (type: string) => {
             // ... (logic thêm placeholder)
            const newPh: Placeholder = {
                id: Date.now(),
                type,
                x: 50,
                y: 50,
                width: 150,
                height: 40,
                label: type,
                key: type.toLowerCase(),
                defaultValue: "",
                required: false,
            };
            setPlaceholders((prev) => [...prev, newPh]);
            setSelectedIds([newPh.id]);
            setEditingId(newPh.id);
        };

        const handleCanvasMouseDown = (e: React.MouseEvent) => {
            if (e.target === canvasInnerRef.current) {
                setSelectedIds([]);
                setEditingId(null);
                
                if (canvasInnerRef.current) {
                    const rect = canvasInnerRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setIsSelecting(true);
                    setSelectionBox({ x, y, width: 0, height: 0 });
                }
            }
        };

        const handlePlaceholderMouseDown = (e: React.MouseEvent, ph: Placeholder) => {
            e.stopPropagation();
            
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                if (selectedIds.includes(ph.id)) {
                    setSelectedIds(selectedIds.filter(id => id !== ph.id));
                } else {
                    setSelectedIds([...selectedIds, ph.id]);
                }
            } else {
                if (!selectedIds.includes(ph.id)) {
                    setSelectedIds([ph.id]);
                }
            }
            
            setEditingId(null);
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            dragOffsetRef.current = { x: 0, y: 0 };
        };

        const handleMouseMove = useCallback((e: MouseEvent) => {
            if (isDragging && selectedIds.length > 0) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                dragOffsetRef.current = { x: dx, y: dy };
                
                selectedIds.forEach(id => {
                    const element = dragElementsRef.current.get(id);
                    if (element) {
                        element.style.transform = `translate(${dx}px, ${dy}px)`;
                    }
                });
            } else if (isSelecting && canvasInnerRef.current) {
                const rect = canvasInnerRef.current.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const newBox = {
                    x: Math.min(selectionBox.x, currentX),
                    y: Math.min(selectionBox.y, currentY),
                    width: Math.abs(currentX - selectionBox.x),
                    height: Math.abs(currentY - selectionBox.y)
                };
                
                setSelectionBox(newBox);
                
                const selected: number[] = [];
                placeholders.forEach(ph => {
                    if (
                        ph.x < newBox.x + newBox.width &&
                        ph.x + ph.width > newBox.x &&
                        ph.y < newBox.y + newBox.height &&
                        ph.y + ph.height > newBox.y
                    ) {
                        selected.push(ph.id);
                    }
                });
                setSelectedIds(selected);
            }
        }, [isDragging, isSelecting, selectedIds, selectionBox, placeholders]); 

        const handleMouseUp = useCallback(() => {
            if (isDragging && (dragOffsetRef.current.x !== 0 || dragOffsetRef.current.y !== 0)) {
                const finalOffset = { ...dragOffsetRef.current };
                
                setPlaceholders(prev =>
                    prev.map(ph => {
                        if (selectedIds.includes(ph.id)) {
                            const snapped = snapToGrid(ph.x + finalOffset.x, ph.y + finalOffset.y);
                            return {
                                ...ph,
                                x: Math.max(0, Math.min(canvasWidth - ph.width, snapped.x)),
                                y: Math.max(0, Math.min(canvasHeight - ph.height, snapped.y))
                            };
                        }
                        return ph;
                    })
                );
            }
            
            setIsDragging(false);
            dragOffsetRef.current = { x: 0, y: 0 };
            setIsSelecting(false);
            setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
        }, [isDragging, selectedIds, canvasWidth, canvasHeight]); 

        const handlePlaceholderDoubleClick = (e: React.MouseEvent, id: number) => {
            e.stopPropagation();
            setEditingId(id);
            setSelectedIds([id]);
        };

        const handleChange = (field: keyof Placeholder, value: string | boolean | number) => {
            setPlaceholders(prev =>
                prev.map(ph =>
                    ph.id === editingId ? { ...ph, [field]: value } : ph
                )
            );
        };

        const applyAutoLayout = () => {
            const margin = 20;
            const startX = 20;
            let x = startX;
            let y = 20;
            const maxRowHeight = 60;
            
            setPlaceholders(prev =>
                prev.map(ph => {
                    if (x + ph.width > canvasWidth - margin) {
                        x = startX;
                        y += maxRowHeight + margin;
                    }
                    const newPh = { ...ph, x, y };
                    x += ph.width + margin;
                    return newPh;
                })
            );
        };

        const deleteSelected = () => {
            setPlaceholders(prev => prev.filter(ph => !selectedIds.includes(ph.id)));
            setSelectedIds([]);
            setEditingId(null);
        };


        // --- EFFECT HOOKS ---

        useEffect(() => {
            if (!isDragging) {
                dragElementsRef.current.forEach((element) => {
                    element.style.transform = '';
                });
            }
        }, [isDragging, placeholders]);

        useEffect(() => {
            if (isDragging || isSelecting) {
                window.addEventListener("mousemove", handleMouseMove);
                window.addEventListener("mouseup", handleMouseUp);
                return () => {
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                };
            }
        }, [isDragging, isSelecting, handleMouseMove, handleMouseUp]);

        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0 && editingId === null) {
                    e.preventDefault();
                    deleteSelected();
                }
                if (e.key === "Escape") {
                    setSelectedIds([]);
                    setEditingId(null);
                }
                if ((e.ctrlKey || e.metaKey) && e.key === "a") {
                    e.preventDefault();
                    setSelectedIds(placeholders.map(ph => ph.id));
                }
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }, [selectedIds, editingId, placeholders]);


        // --- RENDER UI (Bố cục 3 cột theo thiết kế) ---
        
        // Xác định placeholder đang được chỉnh sửa thuộc tính (dùng cho Panel ⑦)
        const editingPlaceholder = placeholders.find(ph => ph.id === editingId);
        
        return (
            <div className="flex gap-4 p-4 h-full bg-gray-50 w-full">
                
                {/* CỘT 1: Panel Elements & Cài đặt ( Bảng cài đặt) */}
                <div className="w-64 p-4 space-y-4 bg-white border border-gray-300 rounded-lg shadow-sm overflow-y-auto shrink-0">
                    
                    {/* Bảng Elements (Thêm Placeholder) */}
                    <h2 className="text-lg font-bold mb-4">Elements (Thêm Placeholder)</h2>
                    <div className="space-y-2">
                        {draggableItems.map((item) => (
                            <button
                                key={item}
                                className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors font-medium"
                                onClick={() => addPlaceholder(item)}
                            >
                                + {item}
                            </button>
                        ))}
                    </div>
                    
                    {/* Khu vực Cài đặt (⑥ 設定パネル) */}
                    <div className="mt-6 pt-6 border-t space-y-2">
                        <h3 className="text-sm font-semibold pt-2"> Bảng Cài đặt</h3>
                        <button
                            className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                            onClick={applyAutoLayout}
                        >
                            Auto Layout
                        </button>
                        <button
                            className="w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
                            onClick={() => setPreview(!preview)}
                        >
                            {preview ? "Edit Mode" : "Preview Mode"}
                        </button>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                            <p className="text-sm text-gray-600 mb-2">{selectedIds.length} selected</p>
                            <button
                                className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                                onClick={deleteSelected}
                            >
                                Delete Selected
                            </button>
                        </div>
                    )}
                </div>

                {/* CỘT 2: Canvas (③ Tiêu đề, ④ Nội dung & ⑤ Định dạng) */}
                <div className="flex-1 flex flex-col items-center relative space-y-4">
                    
                    {/* Thanh Định dạng (⑤ B / I / U / □) */}
                    {(selectedIds.length > 0) && (
                        <div className="flex items-center space-x-2 p-2 bg-white border rounded-lg shadow-md">
                            {/* Chức năng định dạng văn bản (Chỉ là UI cho demo) */}
                            <button className="p-1 text-gray-700 hover:bg-gray-100 rounded transition"><Bold className="size-4" /></button>
                            <button className="p-1 text-gray-700 hover:bg-gray-100 rounded transition"><Italic className="size-4" /></button>
                            <button className="p-1 text-gray-700 hover:bg-gray-100 rounded transition"><Underline className="size-4" /></button>
                            <button className="p-1 text-gray-700 hover:bg-gray-100 rounded transition"><Square className="size-4" /></button>
                        </div>
                    )}

                    {/* Canvas chính */}
                    <div className="p-4 bg-white border border-gray-300 rounded-lg shadow-sm flex-1 flex flex-col items-center justify-center relative">
                        {/* Khu vực Tên Slide (② スライド名) - Giả lập cho mục đích hiển thị */}
                        <h3 className="text-md text-gray-500 mb-2">Slide Tên: Slide 2 (Demo)</h3>

                        <div
                            ref={canvasInnerRef}
                            className="relative bg-white border-2 border-gray-300 rounded shrink-0"
                            style={{
                                width: canvasWidth,
                                height: canvasHeight,
                                backgroundImage: `linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)`,
                                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                                cursor: isSelecting ? "crosshair" : "default"
                            }}
                            onMouseDown={handleCanvasMouseDown}
                        >
                            {/* Render Placeholders (③ Tiêu đề & ④ Nội dung) */}
                            {placeholders.map((ph) => {
                                const isSelected = selectedIds.includes(ph.id);
                                
                                const displayValue = preview
                                    ? sampleData[ph.key as keyof typeof sampleData] || ph.defaultValue || ph.label
                                    : ph.label;

                                return (
                                    <div
                                        key={ph.id}
                                        ref={(el) => {
                                            if (el) dragElementsRef.current.set(ph.id, el);
                                            else dragElementsRef.current.delete(ph.id);
                                        }}
                                        className={`absolute flex items-center justify-center px-2 text-sm font-medium rounded select-none ${
                                            isSelected
                                                ? "border-2 border-blue-500 bg-blue-50 shadow-lg"
                                                : "border-2 border-gray-300 bg-white hover:border-blue-300"
                                        } ${isDragging && isSelected ? "cursor-grabbing" : "cursor-grab"}`}
                                        style={{ left: ph.x, top: ph.y, width: ph.width, height: ph.height }}
                                        onMouseDown={(e) => handlePlaceholderMouseDown(e, ph)}
                                        onDoubleClick={(e) => handlePlaceholderDoubleClick(e, ph.id)}
                                    >
                                        <span className="truncate">{displayValue}</span>
                                    </div>
                                );
                            })}
                            {/* Selection box */}
                            {isSelecting && selectionBox.width > 0 && selectionBox.height > 0 && (
                                <div
                                    className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
                                    style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }}
                                />
                            )}
                        </div>
                        <div className="mt-4 text-sm text-gray-600 text-center">
                            <p>• Click để chọn • Shift/Ctrl+Click để chọn nhiều • Kéo để di chuyển</p>
                        </div>
                    </div>
                </div>

                {/* CỘT 3: Panel Properties (⑦ プロパティ設定) */}
                <div className="w-64 p-4 bg-white border border-gray-300 rounded-lg shadow-sm overflow-y-auto shrink-0">
                    <h2 className="text-lg font-bold mb-4"> Thiết lập thuộc tính (Properties)</h2>
                    {editingPlaceholder ? (
                        <>
                            <div className="space-y-3 text-sm">
                                <p className="font-semibold text-indigo-600">Chỉnh sửa: {editingPlaceholder.label}</p>
                                
                                <div>
                                    <label className="block text-gray-700 mb-1">Label</label>
                                    <input type="text" value={editingPlaceholder.label} onChange={(e) => handleChange("label", e.target.value)} className="w-full border rounded p-2" />
                                </div>
                                
                                <div>
                                    <label className="block text-gray-700 mb-1">Data Key</label>
                                    <input type="text" value={editingPlaceholder.key} onChange={(e) => handleChange("key", e.target.value)} className="w-full border rounded p-2" />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-gray-700 mb-1">Width</label>
                                        <input type="number" value={editingPlaceholder.width} onChange={(e) => handleChange("width", parseInt(e.target.value) || 100)} className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">Height</label>
                                        <input type="number" value={editingPlaceholder.height} onChange={(e) => handleChange("height", parseInt(e.target.value) || 40)} className="w-full border rounded p-2" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Nút Delete Element đã có trong logic gốc */}
                        </>
                    ) : (
                        <div className="text-center text-gray-500 text-sm py-8">
                            <p>Double-click một element để chỉnh sửa thuộc tính</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

SlideCanvas.displayName = 'SlideCanvas';
export default SlideCanvas;