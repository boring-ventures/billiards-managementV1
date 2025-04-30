"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCompany } from "@/context/company-context";
import { UserRole } from "@prisma/client";
import { Loader2, Receipt, ArrowLeft, Clock, User, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
  tableSession?: {
    id: string;
    tableName: string;
  } | null;
  staff: {
    id: string;
    name: string;
  };
  companyId: string;
};

export default function OrderDetails() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const { profile, isLoading: profileLoading } = useCurrentUser();
  const { selectedCompanyId } = useCompany();
  const companyId = profile?.role === UserRole.SUPERADMIN ? selectedCompanyId : profile?.companyId;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoading) {
      // No profile, redirect to login
      if (!profile) {
        router.push("/sign-in");
        return;
      }

      // Superadmin without selected company - go to company selection
      if (profile.role === UserRole.SUPERADMIN && !selectedCompanyId) {
        router.push("/company-selection");
        return;
      }

      // Regular user without a company - go to waiting page
      if (profile.role !== UserRole.SUPERADMIN && !profile.companyId) {
        router.push("/waiting-approval");
        return;
      }

      // Only admin and superadmin should access this page
      if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.SUPERADMIN) {
        router.push("/dashboard");
        return;
      }

      // Fetch order details
      fetchOrderDetails();
    }
  }, [profile, profileLoading, router, selectedCompanyId, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch order details from API
      const response = await fetch(`/api/pos/orders/${orderId}?companyId=${companyId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Order not found");
        } else {
          setError("Failed to fetch order details");
        }
        return;
      }
      
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("An error occurred while fetching the order");
    } finally {
      setIsLoading(false);
    }
  };

  if (profileLoading || isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container p-6">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => router.push("/dashboard/pos")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to POS
        </Button>
        
        <Card className="mx-auto max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-xl text-destructive">{error}</p>
              <p className="mt-2 text-muted-foreground">
                The order you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => router.push("/dashboard/pos")}
            >
              Return to POS
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="container p-6">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push("/dashboard/pos")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to POS
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.print()}
        >
          <Receipt className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
      </div>
      
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-between">
            <span>Order #{order.id.substring(0, 8)}</span>
            <span className="text-xl font-normal">${order.total.toFixed(2)}</span>
          </CardTitle>
          
          <div className="flex items-center text-muted-foreground space-x-4">
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              <span>{formatDate(order.createdAt)}</span>
            </div>
            
            {order.staff && (
              <div className="flex items-center">
                <User className="mr-1 h-4 w-4" />
                <span>{order.staff.name}</span>
              </div>
            )}
            
            {order.tableSession && (
              <div className="flex items-center">
                <Table className="mr-1 h-4 w-4" />
                <span>{order.tableSession.tableName}</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <div className="font-medium">
                        {item.name} × {item.quantity}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} each
                      </div>
                    </div>
                    <div className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 