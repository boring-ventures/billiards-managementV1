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
  table: Table | null;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  table,
}: ConfirmDeleteModalProps) {
  if (!table) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {table.name}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this table? This action cannot be undone.
            Tables with active sessions cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 