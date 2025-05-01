"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, PencilIcon, TrashIcon, SearchIcon, CheckIcon, XIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { hasAdminPermission } from '@/lib/rbac';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Profile, UserRole } from '@prisma/client';

// Define types
type Reservation = {
  id: string;
  tableId: string;
  customerName: string | null;
  customerPhone: string | null;
  reservedFrom: string;
  reservedTo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  table: {
    id: string;
    name: string;
    status: string;
  };
};

interface ReservationListProps {
  profile: Profile | null;
  refreshKey: number;
}

// Form schema
const reservationFormSchema = z.object({
  tableId: z.string({
    required_error: "Please select a table",
  }),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  reservedDate: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string().refine((val) => val.length > 0, {
    message: "Start time is required",
  }),
  endTime: z.string().refine((val) => val.length > 0, {
    message: "End time is required",
  }),
  status: z.string().optional().default("PENDING"),
});

export function ReservationList({ profile, refreshKey }: ReservationListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [dialogTitle, setDialogTitle] = useState("New Reservation");
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = hasAdminPermission(profile);

  const form = useForm<z.infer<typeof reservationFormSchema>>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      tableId: "",
      customerName: "",
      customerPhone: "",
      status: "PENDING",
    },
  });

  // Fetch tables and reservations
  useEffect(() => {
    if (profile?.companyId) {
      Promise.all([
        fetchTables(),
        fetchReservations(),
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [profile, refreshKey, filterDate]);

  // Fetch tables
  async function fetchTables() {
    try {
      const response = await fetch(`/api/tables?companyId=${profile?.companyId}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data.tables.map((table: any) => ({ id: table.id, name: table.name })));
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error",
        description: "Failed to load tables. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Fetch reservations
  async function fetchReservations() {
    try {
      let url = `/api/tables/reservations?companyId=${profile?.companyId}`;
      if (filterDate) {
        url += `&date=${filterDate.toISOString().split('T')[0]}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reservations');
      const data = await response.json();
      setReservations(data.reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Error",
        description: "Failed to load reservations. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Create or update reservation
  async function onSubmit(values: z.infer<typeof reservationFormSchema>) {
    try {
      setLoading(true);
      
      // Combine date and time into ISO strings
      const reservedFromDate = new Date(values.reservedDate);
      const [startHours, startMinutes] = values.startTime.split(':').map(Number);
      reservedFromDate.setHours(startHours, startMinutes);
      
      const reservedToDate = new Date(values.reservedDate);
      const [endHours, endMinutes] = values.endTime.split(':').map(Number);
      reservedToDate.setHours(endHours, endMinutes);
      
      if (reservedToDate <= reservedFromDate) {
        toast({
          title: "Error",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const payload = {
        tableId: values.tableId,
        customerName: values.customerName,
        customerPhone: values.customerPhone || null,
        reservedFrom: reservedFromDate.toISOString(),
        reservedTo: reservedToDate.toISOString(),
        status: values.status,
        companyId: profile?.companyId,
      };
      
      let response;
      
      if (editingReservation) {
        // Update
        response = await fetch(`/api/tables/reservations/${editingReservation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        response = await fetch('/api/tables/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          toast({
            title: "Conflict",
            description: "This table is already reserved for this time slot.",
            variant: "destructive",
          });
        } else {
          throw new Error(errorData.error || 'Something went wrong');
        }
      } else {
        toast({
          title: "Success",
          description: editingReservation 
            ? "Reservation updated successfully" 
            : "New reservation created successfully",
        });
        
        // Close dialog and refresh data
        setDialogOpen(false);
        setEditingReservation(null);
        form.reset();
        fetchReservations();
      }
    } catch (error) {
      console.error('Error saving reservation:', error);
      toast({
        title: "Error",
        description: `Failed to save reservation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Delete reservation
  async function deleteReservation(id: string) {
    if (!confirm("Are you sure you want to delete this reservation?")) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/tables/reservations/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete reservation');
      
      toast({
        title: "Success",
        description: "Reservation deleted successfully",
      });
      
      fetchReservations();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({
        title: "Error",
        description: "Failed to delete reservation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Update reservation status
  async function updateReservationStatus(id: string, status: string) {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/tables/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Failed to update reservation status');
      
      toast({
        title: "Success",
        description: `Reservation ${status.toLowerCase()}`,
      });
      
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      toast({
        title: "Error",
        description: "Failed to update reservation status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Open create/edit dialog
  function openReservationDialog(reservation?: Reservation) {
    if (reservation) {
      setEditingReservation(reservation);
      setDialogTitle("Edit Reservation");
      
      // Parse date and time
      const reservedFrom = parseISO(reservation.reservedFrom);
      const reservedTo = parseISO(reservation.reservedTo);
      
      // Set form values
      form.reset({
        tableId: reservation.tableId,
        customerName: reservation.customerName || "",
        customerPhone: reservation.customerPhone || "",
        reservedDate: reservedFrom,
        startTime: format(reservedFrom, 'HH:mm'),
        endTime: format(reservedTo, 'HH:mm'),
        status: reservation.status,
      });
    } else {
      setEditingReservation(null);
      setDialogTitle("New Reservation");
      form.reset({
        tableId: "",
        customerName: "",
        customerPhone: "",
        reservedDate: new Date(),
        startTime: format(new Date().setHours(new Date().getHours() + 1, 0, 0, 0), 'HH:mm'),
        endTime: format(new Date().setHours(new Date().getHours() + 2, 0, 0, 0), 'HH:mm'),
        status: "PENDING",
      });
    }
    
    setDialogOpen(true);
  }
  
  // Format date/time for display
  function formatDate(dateString: string) {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  }
  
  function formatTime(dateString: string) {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch (e) {
      return 'Invalid time';
    }
  }
  
  // Get a badge color based on status
  function getStatusColor(status: string) {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Render component
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-auto justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <Button onClick={() => openReservationDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            New Reservation
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reservations found for this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>{reservation.table.name}</TableCell>
                    <TableCell>
                      <div>
                        <div>{reservation.customerName}</div>
                        {reservation.customerPhone && (
                          <div className="text-xs text-gray-500">{reservation.customerPhone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(reservation.reservedFrom)}</TableCell>
                    <TableCell>
                      {formatTime(reservation.reservedFrom)} - {formatTime(reservation.reservedTo)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                        {reservation.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {reservation.status === 'PENDING' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon"
                              title="Confirm"
                              onClick={() => updateReservationStatus(reservation.id, 'CONFIRMED')}
                            >
                              <CheckIcon className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              title="Cancel"
                              onClick={() => updateReservationStatus(reservation.id, 'CANCELLED')}
                            >
                              <XIcon className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon"
                          title="Edit"
                          onClick={() => openReservationDialog(reservation)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            title="Delete"
                            onClick={() => deleteReservation(reservation.id)}
                          >
                            <TrashIcon className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Reservation Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Table Selection */}
              <FormField
                control={form.control}
                name="tableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a table" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Reservation Date */}
              <FormField
                control={form.control}
                name="reservedDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Status - only show for editing */}
              {editingReservation && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  ) : (
                    editingReservation ? "Update" : "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 