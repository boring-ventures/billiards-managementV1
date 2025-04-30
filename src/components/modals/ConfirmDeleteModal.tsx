"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table } from "@prisma/client";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  table?: Table | null;
  title?: string;
  description?: string;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  table,
  title,
  description,
}: ConfirmDeleteModalProps) {
  // Handle two scenarios:
  // 1. For table delete (backward compatibility)
  // 2. For generic delete with title/description

  let modalTitle = title;
  let modalDescription = description;

  // If table is provided, use its details for backward compatibility
  if (table) {
    modalTitle = modalTitle || `Delete ${table.name}`;
    modalDescription = modalDescription || `Are you sure you want to delete this table? This action cannot be undone. Tables with active sessions cannot be deleted.`;
  }

  // If no table or title/description, don't render
  if (!modalTitle && !table) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 