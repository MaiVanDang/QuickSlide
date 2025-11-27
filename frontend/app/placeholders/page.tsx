"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function PlaceholderPage() {
  const [placeholders, setPlaceholders] = useState([
    { id: 1, name: "title" },
    { id: 2, name: "subtitle" },
  ]);

  const [newName, setNewName] = useState("");

  const addPlaceholder = () => {
    if (!newName.trim()) return;
    setPlaceholders([
      ...placeholders,
      { id: Date.now(), name: newName },
    ]);
    setNewName("");
  };

  return (
    <div className="p-6">
      <h1 className="font-bold text-2xl mb-4">Placeholder Management</h1>

      {/* Button mở dialog */}
      <Dialog>
        <DialogTrigger>
          <Button variant="default">+ Add Placeholder</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Placeholder</DialogTitle>
          </DialogHeader>

          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter placeholder name..."
            className="mt-4"
          />

          <Button onClick={addPlaceholder} className="mt-4 w-full">
            Add
          </Button>
        </DialogContent>
      </Dialog>

      {/* LIST */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {placeholders.map((item) => (
          <Card key={item.id} className="p-4 flex items-center justify-between">
            <p className="font-medium">{item.name}</p>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
