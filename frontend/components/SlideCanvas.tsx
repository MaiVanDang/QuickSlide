"use client";

import { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";

interface Placeholder {
  id: number;
  type: string;
  x: number;
  y: number;
  label: string;
  key: string;
  defaultValue: string;
  required: boolean;
}

export default function SlideCanvas() {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { setNodeRef } = useDroppable({ id: "canvas" });
  const draggableItems = ["Title", "Text", "Image", "Date", "Variable"];

  const GRID_SIZE = 20;

  const snapToGrid = (x: number, y: number) => {
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    return { x: snappedX, y: snappedY };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active.data.current) return;

    const { offsetX = 0, offsetY = 0, type } = active.data.current;
    const rawX = offsetX + delta.x;
    const rawY = offsetY + delta.y;

    const { x, y } = snapToGrid(rawX, rawY);
    const newPlaceholder: Placeholder = {
      id: Date.now(),
      type,
      x: offsetX + delta.x,
      y: offsetY + delta.y,
      label: type,
      key: type.toLowerCase(),
      defaultValue: "",
      required: false,
    };
    setPlaceholders((prev) => [...prev, newPlaceholder]);
  };

  const applyAutoLayout = () => {
    const margin = 20;
    const startX = 20;
    const startY = 20;
    const canvasWidth = 600; // canvas width (px)

    let x = startX;
    let y = startY;
    const updated = placeholders.map((ph) => {
      const phWidth = 100; // giả định placeholder width
      const phHeight = 30;
      const newPh = { ...ph, x, y };

      x += phWidth + margin;
      if (x + phWidth > canvasWidth) {
        x = startX;
        y += phHeight + margin;
      }
      return newPh;
    });

    setPlaceholders(updated);
  };

  const handleSelect = (id: number) => setSelectedId(id);

  const handleChange = (field: keyof Placeholder, value: string | boolean) => {
    if (selectedId === null) return;
    setPlaceholders((prev) =>
      prev.map((ph) =>
        ph.id === selectedId ? { ...ph, [field]: value } : ph
      )
    );
  };

  const selectedPlaceholder = placeholders.find((ph) => ph.id === selectedId);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        {/* Panel placeholder */}
        <div className="w-1/4 p-4 border border-gray-300 rounded">
          {draggableItems.map((item) => (
            <DraggablePlaceholder key={item} type={item} />
          ))}
        </div>

        {/* Canvas */}
        <div
          ref={setNodeRef}
          className="w-2/4 h-[500px] border border-gray-400 rounded bg-white relative"
        >
          {placeholders.map((ph) => (
            <div
              key={ph.id}
              className={`absolute border p-1 cursor-pointer ${
                ph.id === selectedId ? "border-red-500" : "border-blue-500"
              } bg-blue-100`}
              style={{ top: ph.y, left: ph.x }}
              onClick={() => handleSelect(ph.id)}
            >
              {ph.label || ph.type}
            </div>
          ))}
        </div>

        {/* Panel chỉnh sửa */}
        <div className="w-1/4 p-4 border border-gray-300 rounded">
          <h2 className="text-lg font-bold mb-2">Placeholder Properties</h2>
          {selectedPlaceholder ? (
            <div className="flex flex-col gap-2">
              <label>
                Label:
                <input
                  type="text"
                  value={selectedPlaceholder.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  className="border p-1 w-full"
                />
              </label>
              <label>
                Key:
                <input
                  type="text"
                  value={selectedPlaceholder.key}
                  onChange={(e) => handleChange("key", e.target.value)}
                  className="border p-1 w-full"
                />
              </label>
              <label>
                Default Value:
                <input
                  type="text"
                  value={selectedPlaceholder.defaultValue}
                  onChange={(e) =>
                    handleChange("defaultValue", e.target.value)
                  }
                  className="border p-1 w-full"
                />
              </label>
              <label className="flex items-center gap-2">
                Required:
                <input
                  type="checkbox"
                  checked={selectedPlaceholder.required}
                  onChange={(e) =>
                    handleChange("required", e.target.checked)
                  }
                />
              </label>
              <button
                className="mt-2 p-2 bg-green-500 text-white rounded"
                onClick={applyAutoLayout}
              >
                Auto Layout
              </button>

            </div>
          ) : (
            <p>Click on a placeholder to edit its properties.</p>
          )}
        </div>
      </div>
    </DndContext>
  );
}

function DraggablePlaceholder({ type }: { type: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: type,
    data: { type, offsetX: 0, offsetY: 0 },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="p-2 mb-2 bg-gray-200 rounded cursor-grab text-center"
    >
      {type}
    </div>
  );
}
