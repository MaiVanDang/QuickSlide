"use client";

import React, { useState, useEffect, useRef } from "react";
import Moveable from "react-moveable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { placeholderAPI } from "@/lib/api"; 
import { Placeholder } from "@/types"; 


export default function PlaceholderEditor() {
  const CURRENT_SLIDE_ID = 1; // Demo với Slide 1
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  // Các state hỗ trợ tính năng mở rộng
  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false); // Chế độ xem trước
  const [showGrid, setShowGrid] = useState(true);    // Hiển thị lưới

  const containerRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. TẢI DỮ LIỆU ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await placeholderAPI.getBySlide(CURRENT_SLIDE_ID);
        const formattedData = data.map((p: any) => {
          // Parse JSON properties để lấy label, key
          const props = p.properties ? JSON.parse(p.properties) : {};
          return { 
            ...p, 
            label: props.label || "Chưa đặt tên", 
            key: props.key || `field_${p.id}` 
          };
        });
        setPlaceholders(formattedData);
      } catch (error) {
        console.error("Lỗi tải data:", error);
      }
    };
    fetchData();
  }, []);

  // --- 2. XỬ LÝ TARGET KHI CHỌN ---
  useEffect(() => {
    if (selectedId && !isPreview) {
      setTarget(document.getElementById(`placeholder-${selectedId}`));
    } else {
      setTarget(null);
    }
  }, [selectedId, isPreview]);

  // --- 3. CÁC HÀM XỬ LÝ LOGIC ---

  // Thêm mới
  const addPlaceholder = () => {
    const tempId = Date.now();
    const newP: Placeholder = {
      id: tempId,
      slideId: CURRENT_SLIDE_ID,
      type: "TEXT",
      x: 50, y: 50, width: 200, height: 100, zIndex: 1,
      properties: JSON.stringify({ label: "Placeholder Mới", key: `key_${tempId}` }),
      label: "Placeholder Mới",
      key: `key_${tempId}`,
    };
    setPlaceholders([...placeholders, newP]);
    setSelectedId(tempId);
  };

  // Cập nhật State cục bộ
  const updateLocalState = (id: number, changes: Partial<Placeholder>) => {
    setPlaceholders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
  };

  // Lưu xuống Database
  const saveToDatabase = async (p: Placeholder) => {
    setIsLoading(true);
    try {
      const payload = {
        slideId: p.slideId,
        type: p.type,
        x: p.x, y: p.y, width: p.width, height: p.height, zIndex: p.zIndex,
        properties: JSON.stringify({ label: p.label, key: p.key })
      };
      await placeholderAPI.save(payload);
      alert("Đã lưu thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu! Kiểm tra lại Backend.");
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa Placeholder
  const handleDelete = async () => {
    if (!selectedId) return;
    
    if (confirm("Bạn có chắc muốn xóa ô này không?")) {
        // Logic: Xóa trên giao diện ngay lập tức
        setPlaceholders(placeholders.filter(p => p.id !== selectedId));
        setSelectedId(null);
        
        // TODO: Nếu cần xóa trong Database ngay lập tức thì gọi API delete ở đây
        // await placeholderAPI.delete(selectedId); 
    }
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(placeholders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "slide-template.json";
    link.click();
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Reset ID để tránh trùng lặp khi import vào
        const importedData = json.map((p: any) => ({ ...p, id: Date.now() + Math.random() }));
        setPlaceholders(importedData);
        alert("Import thành công!");
      } catch (err) {
        alert("File JSON lỗi!");
      }
    };
    reader.readAsText(file);
  };

  const selectedP = placeholders.find((p) => p.id === selectedId);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* --- CỘT TRÁI: KHUNG VẼ (CANVAS) --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Toolbar trên cùng */}
        <div className="mb-4 flex items-center gap-3 w-full max-w-5xl bg-white p-3 rounded-lg shadow-sm">
          <Button onClick={addPlaceholder} disabled={isPreview} className="bg-blue-600 hover:bg-blue-700 text-white">
            + Thêm Ô Mới
          </Button>
          
          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <Button variant="outline" onClick={handleExport} size="sm">Export JSON</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm">Import JSON</Button>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleImport} accept=".json" />

          <div className="flex-1"></div>

          {/* Toggle Grid & Preview */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="accent-blue-600"/>
              Hiện lưới
            </label>
            <Button 
                variant={isPreview ? "default" : "secondary"} 
                onClick={() => { setSelectedId(null); setIsPreview(!isPreview); }}
            >
                {isPreview ? "👁️ Đang xem trước" : "✏️ Chế độ sửa"}
            </Button>
          </div>
        </div>

        {/* Màn hình Slide (Canvas) */}
        <div
          ref={containerRef}
          className="bg-white shadow-2xl relative overflow-hidden transition-all"
          style={{ 
            width: "960px", 
            height: "540px",
            // Tạo hiệu ứng lưới (Grid pattern)
            backgroundImage: showGrid && !isPreview 
                ? "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)" 
                : "none",
            backgroundSize: "20px 20px"
          }}
          onClick={(e) => {
            if (e.target === containerRef.current) setSelectedId(null);
          }}
        >
          {placeholders.map((p) => (
            <div
              key={p.id}
              id={`placeholder-${p.id}`}
              onClick={(e) => {
                if (isPreview) return;
                e.stopPropagation();
                setSelectedId(p.id!);
              }}
              style={{
                position: "absolute",
                transform: `translate(${p.x}px, ${p.y}px)`,
                width: `${p.width}px`,
                height: `${p.height}px`,
                // Logic hiển thị viền: Có viền khi đang sửa, mất viền khi Preview
                border: isPreview ? "none" : (selectedId === p.id ? "2px solid #2563eb" : "1px dashed #9ca3af"),
                backgroundColor: isPreview ? "transparent" : (selectedId === p.id ? "rgba(37, 99, 235, 0.05)" : "rgba(255,255,255,0.5)"),
                zIndex: p.zIndex || 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isPreview ? "default" : "move",
                transition: isPreview ? "all 0.3s" : "none"
              }}
            >
              {/* Nội dung hiển thị */}
              <span className={`text-sm font-medium select-none ${isPreview ? "text-black" : "text-gray-500"}`}>
                {isPreview ? `{{${p.key}}}` : p.label}
              </span>
            </div>
          ))}

          {/* Component Kéo Thả - Chỉ hiện khi KHÔNG phải preview */}
          {!isPreview && (
              <Moveable
                target={target}
                container={containerRef.current}
                draggable={true}
                resizable={true}
                snappable={true} // Bật tính năng hít vào lưới
                snapThreshold={5}
                bounds={{ left: 0, top: 0, right: 960, bottom: 540 }}
                
                // SỬA LỖI CRASH Ở ĐÂY (Thêm check e.lastEvent)
                onDrag={(e) => { e.target.style.transform = e.transform; }}
                onDragEnd={(e) => { 
                    if (selectedId && e.lastEvent) {
                        const [x, y] = e.lastEvent.translate;
                        updateLocalState(selectedId, { x, y });
                    }
                }}
                
                onResize={(e) => { 
                    e.target.style.width = `${e.width}px`; 
                    e.target.style.height = `${e.height}px`; 
                    e.target.style.transform = e.drag.transform; 
                }}
                onResizeEnd={(e) => { 
                    if (selectedId && e.lastEvent) {
                        const [x, y] = e.lastEvent.drag.translate;
                        updateLocalState(selectedId, { width: e.lastEvent.width, height: e.lastEvent.height, x, y });
                    }
                }}
              />
          )}
        </div>
        
        <p className="mt-4 text-xs text-gray-400">
            {isPreview ? "Chế độ xem trước: Placeholder hiển thị dạng biến {{key}}." : "Kéo thả để chỉnh sửa. Bấm 'Hiện lưới' để căn chỉnh dễ hơn."}
        </p>
      </div>

      {/* --- CỘT PHẢI: CONFIG FORM --- */}
      <div className="w-80 bg-white border-l p-5 shadow-xl flex flex-col h-full z-20">
        <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Thuộc tính</h2>
        
        {selectedP && !isPreview ? (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* Form chỉnh sửa */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên hiển thị (Label)</label>
                <Input
                  className="mt-1"
                  value={selectedP.label || ""}
                  onChange={(e) => updateLocalState(selectedP.id!, { label: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã biến (Key)</label>
                <Input
                  className="mt-1 font-mono text-sm bg-gray-50"
                  value={selectedP.key || ""}
                  onChange={(e) => updateLocalState(selectedP.id!, { key: e.target.value })}
                  placeholder="VD: student_name"
                />
                <p className="text-[10px] text-gray-400 mt-1">Dùng để mapping dữ liệu từ Excel</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-gray-50 p-2 rounded border">
                    <span className="text-[10px] text-gray-400 block">Tọa độ X</span>
                    <span className="text-sm font-mono">{Math.round(selectedP.x)}</span>
                 </div>
                 <div className="bg-gray-50 p-2 rounded border">
                    <span className="text-[10px] text-gray-400 block">Tọa độ Y</span>
                    <span className="text-sm font-mono">{Math.round(selectedP.y)}</span>
                 </div>
                 <div className="bg-gray-50 p-2 rounded border">
                    <span className="text-[10px] text-gray-400 block">Rộng (W)</span>
                    <span className="text-sm font-mono">{Math.round(selectedP.width)}</span>
                 </div>
                 <div className="bg-gray-50 p-2 rounded border">
                    <span className="text-[10px] text-gray-400 block">Cao (H)</span>
                    <span className="text-sm font-mono">{Math.round(selectedP.height)}</span>
                 </div>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="space-y-3 pt-4 border-t">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold" 
                  onClick={() => saveToDatabase(selectedP)}
                  disabled={isLoading}
                >
                  {isLoading ? "Đang lưu..." : "💾 Lưu vào Database"}
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
                  onClick={handleDelete}
                >
                  🗑️ Xóa Placeholder
                </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <span className="text-4xl mb-2">👆</span>
            <p className="text-sm font-medium">Chọn một ô để sửa</p>
            {isPreview && <p className="text-xs text-blue-500 mt-2">(Đang ở chế độ xem trước)</p>}
          </div>
        )}
      </div>
    </div>
  );
}