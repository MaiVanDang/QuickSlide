"use client";

import { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";

export default function SlideCanvas() {
  const [placeholders, setPlaceholders] = useState<
    { type: string; x: number; y: number }[]
  >([]);

  const { setNodeRef } = useDroppable({ id: "canvas" });

  const draggableItems = ["Title", "Text", "Image", "Date", "Variable"];

  // Khi thả item lên canvas
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active.data.current) return;

    const { offsetX = 0, offsetY = 0, type } = active.data.current;

    setPlaceholders((prev) => [
      ...prev,
      { type, x: offsetX + delta.x, y: offsetY + delta.y },
    ]);
  };

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
          id="canvas"
          className="w-3/4 h-[500px] border border-gray-400 rounded bg-white relative"
        >
          {placeholders.map((ph, idx) => (
            <div
              key={idx}
              className="absolute border border-blue-500 p-1 bg-blue-100"
              style={{ top: ph.y, left: ph.x }}
            >
              {ph.type}
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  );
}

// Draggable từ panel
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
