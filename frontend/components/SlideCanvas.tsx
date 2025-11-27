"use client";

import { useState, useEffect, useRef } from "react";

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

export default function SlideCanvas() {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragElementsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  const GRID_SIZE = 10;
  const canvasWidth = 800;
  const canvasHeight = 600;

  const sampleData = {
    title: "QuickSlide Demo",
    text: "Nội dung trình bày tự động",
    image: "https://via.placeholder.com/150",
    date: "2025-11-27",
    variable: "Giá trị biến",
  };

  const snapToGrid = (x: number, y: number) => ({
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  });

  const draggableItems = ["Title", "Text", "Image", "Date", "Variable"];

  const addPlaceholder = (type: string) => {
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
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedIds([]);
      setEditingId(null);
      
      // Bắt đầu selection box
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsSelecting(true);
      setSelectionBox({ x, y, width: 0, height: 0 });
    }
  };

  const handlePlaceholderMouseDown = (e: React.MouseEvent, ph: Placeholder) => {
    e.stopPropagation();
    
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Multi-select
      if (selectedIds.includes(ph.id)) {
        setSelectedIds(selectedIds.filter(id => id !== ph.id));
      } else {
        setSelectedIds([...selectedIds, ph.id]);
      }
    } else {
      // Single select
      if (!selectedIds.includes(ph.id)) {
        setSelectedIds([ph.id]);
      }
    }
    
    setEditingId(null);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && selectedIds.length > 0) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragOffsetRef.current = { x: dx, y: dy };
      
      // Cập nhật transform trực tiếp qua DOM thay vì state
      selectedIds.forEach(id => {
        const element = dragElementsRef.current.get(id);
        if (element) {
          element.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      });
    } else if (isSelecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const newBox = {
        x: Math.min(selectionBox.x, currentX),
        y: Math.min(selectionBox.y, currentY),
        width: Math.abs(currentX - selectionBox.x),
        height: Math.abs(currentY - selectionBox.y)
      };
      
      setSelectionBox(newBox);
      
      // Tìm placeholders trong selection box
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
  };

  const handleMouseUp = () => {
    if (isDragging && (dragOffsetRef.current.x !== 0 || dragOffsetRef.current.y !== 0)) {
      const finalOffset = { ...dragOffsetRef.current };
      
      // Áp dụng vị trí mới vào state
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
  };

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
    const startY = 20;
    let x = startX;
    let y = startY;
    const maxRowHeight = 60;
    
    setPlaceholders(prev =>
      prev.map(ph => {
        const newPh = { ...ph, x, y };
        x += ph.width + margin;
        if (x + ph.width > canvasWidth - margin) {
          x = startX;
          y += maxRowHeight + margin;
        }
        return newPh;
      })
    );
  };

  const deleteSelected = () => {
    setPlaceholders(prev => prev.filter(ph => !selectedIds.includes(ph.id)));
    setSelectedIds([]);
    setEditingId(null);
  };

  useEffect(() => {
    // Reset transform sau khi vị trí mới đã được render
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
  }, [isDragging, isSelecting, selectedIds, selectionBox, placeholders]);

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

  return (
    <div className="flex gap-4 p-4 h-screen bg-gray-50">
      {/* Panel placeholder */}
      <div className="w-64 p-4 bg-white border border-gray-300 rounded-lg shadow-sm overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Elements</h2>
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
        
        <div className="mt-6 pt-6 border-t">
          <button
            className="w-full p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
            onClick={applyAutoLayout}
          >
            Auto Layout
          </button>
          <button
            className="mt-2 w-full p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Edit Mode" : "Preview Mode"}
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-2">
              {selectedIds.length} selected
            </p>
            <button
              className="w-full p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
              onClick={deleteSelected}
            >
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
        <div
          ref={canvasRef}
          className="relative bg-white border-2 border-gray-300 rounded"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundImage: `
              linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            cursor: isSelecting ? "crosshair" : "default"
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          {placeholders.map((ph) => {
            const isSelected = selectedIds.includes(ph.id);
            const displayValue = preview
              ? sampleData[ph.key as keyof typeof sampleData] ||
                ph.defaultValue ||
                ph.label
              : ph.label;

            const isMissingRequired =
              preview &&
              ph.required &&
              !sampleData[ph.key as keyof typeof sampleData] &&
              !ph.defaultValue;

            const style: React.CSSProperties = {
              left: ph.x,
              top: ph.y,
              width: ph.width,
              height: ph.height,
            };

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
                    : isMissingRequired
                    ? "border-2 border-yellow-500 bg-yellow-50"
                    : "border-2 border-gray-300 bg-white hover:border-blue-300"
                } ${isDragging && isSelected ? "cursor-grabbing" : "cursor-grab"}`}
                style={style}
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
              style={{
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.width,
                height: selectionBox.height
              }}
            />
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>• Click to select • Shift/Ctrl+Click for multiple • Drag to move • Double-click to edit</p>
          <p>• Delete/Backspace to remove • Ctrl+A to select all • Drag on canvas to select area</p>
        </div>
      </div>

      {/* Panel chỉnh sửa */}
      <div className="w-64 p-4 bg-white border border-gray-300 rounded-lg shadow-sm overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Properties</h2>
        {editingId !== null ? (
          <>
            {placeholders
              .filter((ph) => ph.id === editingId)
              .map((ph) => (
                <div key={ph.id} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={ph.label}
                      onChange={(e) => handleChange("label", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Key
                    </label>
                    <input
                      type="text"
                      value={ph.key}
                      onChange={(e) => handleChange("key", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={ph.defaultValue}
                      onChange={(e) => handleChange("defaultValue", e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width
                      </label>
                      <input
                        type="number"
                        value={ph.width}
                        onChange={(e) => handleChange("width", parseInt(e.target.value) || 100)}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height
                      </label>
                      <input
                        type="number"
                        value={ph.height}
                        onChange={(e) => handleChange("height", parseInt(e.target.value) || 40)}
                        className="w-full border border-gray-300 rounded p-2 text-sm"
                      />
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ph.required}
                      onChange={(e) => handleChange("required", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Required field</span>
                  </label>
                  
                  <button
                    className="w-full mt-4 p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                    onClick={() => {
                      setPlaceholders(prev => prev.filter(p => p.id !== ph.id));
                      setSelectedIds([]);
                      setEditingId(null);
                    }}
                  >
                    Delete Element
                  </button>
                </div>
              ))}
          </>
        ) : (
          <div className="text-center text-gray-500 text-sm py-8">
            <p>Double-click an element to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
}