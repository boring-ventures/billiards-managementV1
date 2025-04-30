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

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  table: Table | null;
}

export function StartSessionModal({
  isOpen,
  onClose,
  onConfirm,
  table,
}: StartSessionModalProps) {
  if (!table) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Session for {table.name}</DialogTitle>
          <DialogDescription>
            You&apos;re about to start a new session for this table. 
            The timer will begin immediately, and the table will be marked as BUSY.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 