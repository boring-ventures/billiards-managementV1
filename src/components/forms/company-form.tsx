"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCompanies } from "@/hooks/use-companies";
import { DialogClose } from "@/components/ui/dialog";

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof formSchema>;

interface CompanyFormProps {
  initialData?: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
  };
  onSuccess?: () => void;
  isDialog?: boolean;
}

export function CompanyForm({
  initialData,
  onSuccess,
  isDialog = false,
}: CompanyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createCompany, updateCompany } = useCompanies();
  const router = useRouter();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      address: initialData?.address || "",
      phone: initialData?.phone || "",
    },
  });

  const onSubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateCompany(initialData.id, values);
      } else {
        await createCompany(values);
      }

      if (onSuccess) {
        onSuccess();
      } else if (!isDialog) {
        router.push("/companies");
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      router.push(`/companies/${initialData.id}`);
    } else {
      router.push("/companies");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter company address"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter phone number"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {isDialog ? (
            <>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={isSubmitting}>
                {initialData ? "Update Company" : "Create Company"}
              </LoadingButton>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" loading={isSubmitting}>
                {initialData ? "Update Company" : "Create Company"}
              </LoadingButton>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
