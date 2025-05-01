import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from './ui/button';
import { CalendarIcon, DownloadIcon, PlusIcon } from 'lucide-react';
import { DatePicker } from './ui/date-picker';
import { cn } from '../lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type FinancialReportingProps = {
  companyId: string;
};

export default function FinancialReporting({ companyId }: FinancialReportingProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [reportType, setReportType] = useState('monthly_revenue');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 3)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  // Fetch saved reports on component mount
  useEffect(() => {
    fetchSavedReports();
  }, [companyId]);

  // Fetch report data when parameters change
  useEffect(() => {
    if (activeTab !== 'saved') {
      fetchReportData();
    }
  }, [companyId, reportType, startDate, endDate, activeTab]);

  async function fetchSavedReports() {
    try {
      const { data, error } = await supabase
        .from('finance_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedReports(data || []);
    } catch (error) {
      console.error('Error fetching saved reports:', error);
    }
  }

  async function fetchReportData() {
    if (!companyId || !reportType || !startDate || !endDate) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_financial_report', {
        p_company_id: companyId,
        p_report_type: reportType,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (error) throw error;
      setReportData(data?.[0]?.report_data || []);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveReport() {
    try {
      const reportName = prompt('Enter a name for this report:');
      if (!reportName) return;

      const { data, error } = await supabase
        .from('finance_reports')
        .insert({
          company_id: companyId,
          name: reportName,
          description: `${reportType} report from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
          report_type: reportType,
          parameters: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select();

      if (error) throw error;
      fetchSavedReports();
      alert('Report saved successfully!');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report.');
    }
  }

  async function loadSavedReport(report: any) {
    setReportType(report.report_type);
    setStartDate(new Date(report.parameters.start_date));
    setEndDate(new Date(report.parameters.end_date));
    setActiveTab('custom');
  }

  function exportToCSV() {
    if (!reportData?.length) return;
    
    // Get headers from first item
    const headers = Object.keys(reportData[0]);
    
    // Convert data to CSV
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of reportData) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    // Create and download file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Prepare chart data based on report type
  function prepareChartData() {
    if (!reportData?.length) return null;

    switch (reportType) {
      case 'monthly_revenue':
        const labels = reportData.map(item => 
          new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        );
        return {
          labels,
          datasets: [
            {
              label: 'Revenue',
              data: reportData.map(item => item.total_revenue),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
              label: 'Expenses',
              data: reportData.map(item => item.total_expenses),
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
              label: 'Net Profit',
              data: reportData.map(item => item.net_profit),
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
            }
          ]
        };
      
      case 'daily_sales':
        // Group by day and sum totals
        const salesByDay = reportData.reduce((acc: any, item) => {
          const day = new Date(item.day).toLocaleDateString();
          if (!acc[day]) {
            acc[day] = 0;
          }
          acc[day] += item.total_amount;
          return acc;
        }, {});
        
        return {
          labels: Object.keys(salesByDay),
          datasets: [
            {
              label: 'Daily Sales',
              data: Object.values(salesByDay),
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1,
            }
          ]
        };
      
      case 'product_sales':
        const productLabels = reportData.slice(0, 10).map(item => item.product_name);
        return {
          labels: productLabels,
          datasets: [
            {
              label: 'Revenue by Product',
              data: reportData.slice(0, 10).map(item => item.total_revenue),
              backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)',
                'rgba(255, 159, 64, 0.5)',
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
              ],
              borderColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 206, 86)',
                'rgb(75, 192, 192)',
                'rgb(153, 102, 255)',
                'rgb(255, 159, 64)',
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 206, 86)',
                'rgb(75, 192, 192)',
              ],
              borderWidth: 1,
            }
          ]
        };
      
      case 'staff_performance':
        return {
          labels: reportData.map(item => item.staff_name),
          datasets: [
            {
              label: 'Total Sales by Staff',
              data: reportData.map(item => item.total_sales),
              backgroundColor: 'rgba(153, 102, 255, 0.5)',
            }
          ]
        };
      
      default:
        return null;
    }
  }

  // Render the appropriate chart based on report type
  function renderChart() {
    const chartData = prepareChartData();
    if (!chartData) return null;

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: getReportTitle(),
        },
      },
    };

    switch (reportType) {
      case 'monthly_revenue':
        return (
          <div className="h-72">
            <Line options={options} data={chartData} />
          </div>
        );
      
      case 'daily_sales':
        return (
          <div className="h-72">
            <Bar options={options} data={chartData} />
          </div>
        );
      
      case 'product_sales':
        return (
          <div className="h-72">
            <Pie 
              data={chartData} 
              options={{
                ...options,
                plugins: {
                  ...options.plugins,
                  legend: {
                    position: 'right',
                  },
                },
              }} 
            />
          </div>
        );
      
      case 'staff_performance':
        return (
          <div className="h-72">
            <Bar options={options} data={chartData} />
          </div>
        );
      
      default:
        return null;
    }
  }

  function getReportTitle() {
    switch (reportType) {
      case 'monthly_revenue':
        return 'Monthly Revenue, Expenses, and Profit';
      case 'daily_sales':
        return 'Daily Sales';
      case 'product_sales':
        return 'Top 10 Products by Revenue';
      case 'staff_performance':
        return 'Staff Sales Performance';
      default:
        return 'Financial Report';
    }
  }

  // Render the summary cards based on report type
  function renderSummaryCards() {
    if (!reportData?.length) return null;

    switch (reportType) {
      case 'monthly_revenue':
        // Calculate totals
        const totals = reportData.reduce(
          (acc, item) => {
            acc.revenue += item.total_revenue;
            acc.expenses += item.total_expenses;
            acc.profit += item.net_profit;
            return acc;
          },
          { revenue: 0, expenses: 0, profit: 0 }
        );

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              title="Total Revenue"
              value={formatCurrency(totals.revenue)}
              trend={totals.revenue > 0 ? "positive" : "negative"}
              icon="revenue"
            />
            <SummaryCard
              title="Total Expenses"
              value={formatCurrency(totals.expenses)}
              trend="neutral"
              icon="expenses"
            />
            <SummaryCard
              title="Net Profit"
              value={formatCurrency(totals.profit)}
              trend={totals.profit > 0 ? "positive" : "negative"}
              icon="profit"
              percentage={totals.revenue ? ((totals.profit / totals.revenue) * 100).toFixed(1) + "%" : "0%"}
            />
          </div>
        );
      
      case 'product_sales':
        const totalSold = reportData.reduce((sum, item) => sum + item.total_quantity_sold, 0);
        const totalRevenue = reportData.reduce((sum, item) => sum + item.total_revenue, 0);
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              title="Total Products Sold"
              value={totalSold.toString()}
              trend="neutral"
              icon="products"
            />
            <SummaryCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              trend="positive"
              icon="revenue"
            />
            <SummaryCard
              title="Average Item Price"
              value={formatCurrency(totalRevenue / totalSold)}
              trend="neutral"
              icon="price"
            />
          </div>
        );
      
      case 'staff_performance':
        const totalStaffSales = reportData.reduce((sum, item) => sum + item.total_sales, 0);
        const totalOrders = reportData.reduce((sum, item) => sum + item.total_orders, 0);
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              title="Total Sales"
              value={formatCurrency(totalStaffSales)}
              trend="positive"
              icon="revenue"
            />
            <SummaryCard
              title="Total Orders"
              value={totalOrders.toString()}
              trend="neutral"
              icon="orders"
            />
            <SummaryCard
              title="Average Order Value"
              value={formatCurrency(totalStaffSales / totalOrders)}
              trend="neutral"
              icon="price"
            />
          </div>
        );
      
      default:
        return null;
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  // Simple summary card component
  function SummaryCard({ title, value, trend, icon, percentage }: any) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{title}</p>
              <h3 className="text-2xl font-bold mt-1">{value}</h3>
              {percentage && (
                <p className={cn(
                  "text-sm mt-1",
                  trend === "positive" ? "text-green-600" : 
                  trend === "negative" ? "text-red-600" : "text-gray-600"
                )}>
                  {percentage}
                </p>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-full",
              trend === "positive" ? "bg-green-100" : 
              trend === "negative" ? "bg-red-100" : "bg-blue-100"
            )}>
              {icon === "revenue" && <DollarSignIcon className={cn(
                "h-6 w-6",
                trend === "positive" ? "text-green-600" : 
                trend === "negative" ? "text-red-600" : "text-blue-600"
              )} />}
              {icon === "expenses" && <MinusCircleIcon className="h-6 w-6 text-red-600" />}
              {icon === "profit" && <PlusCircleIcon className={cn(
                "h-6 w-6",
                trend === "positive" ? "text-green-600" : "text-red-600"
              )} />}
              {icon === "products" && <PackageIcon className="h-6 w-6 text-blue-600" />}
              {icon === "orders" && <ShoppingCartIcon className="h-6 w-6 text-blue-600" />}
              {icon === "price" && <DollarSignIcon className="h-6 w-6 text-blue-600" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Placeholder for icon components
  const DollarSignIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
  const MinusCircleIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
  const PlusCircleIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
  const PackageIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
  const ShoppingCartIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Financial Reports</CardTitle>
        <CardDescription>
          Generate and view financial reports for your business
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setReportType('monthly_revenue');
                setActiveTab('custom');
              }}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Monthly Revenue</h3>
                  <p className="text-sm text-gray-500">Track your monthly revenue, expenses, and profit</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setReportType('daily_sales');
                setActiveTab('custom');
              }}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Daily Sales</h3>
                  <p className="text-sm text-gray-500">Analyze your sales performance by day</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setReportType('product_sales');
                setActiveTab('custom');
              }}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Product Sales</h3>
                  <p className="text-sm text-gray-500">See which products are selling the most</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setReportType('staff_performance');
                setActiveTab('custom');
              }}>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-2">Staff Performance</h3>
                  <p className="text-sm text-gray-500">Compare sales performance across your staff</p>
                </CardContent>
              </Card>
            </div>
            
            {savedReports.length > 0 && (
              <>
                <h3 className="text-lg font-medium mb-4">Recent Reports</h3>
                <div className="space-y-2">
                  {savedReports.slice(0, 3).map(report => (
                    <Card key={report.id} className="cursor-pointer hover:bg-gray-50" onClick={() => loadSavedReport(report)}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-gray-500">{report.description}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly_revenue">Monthly Revenue</SelectItem>
                    <SelectItem value="daily_sales">Daily Sales</SelectItem>
                    <SelectItem value="product_sales">Product Sales</SelectItem>
                    <SelectItem value="staff_performance">Staff Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <DatePicker
                  date={startDate} 
                  setDate={setStartDate}
                  className="w-full"
                />
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <DatePicker
                  date={endDate}
                  setDate={setEndDate}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-end space-x-2">
                <Button onClick={saveReport}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Save Report
                </Button>
                
                <Button variant="outline" onClick={exportToCSV} disabled={!reportData?.length}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : reportData?.length ? (
              <div className="space-y-6">
                {renderSummaryCards()}
                {renderChart()}
                
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Data Table</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(reportData[0]).map((key) => (
                            <th
                              key={key}
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((row, i) => (
                          <tr key={i}>
                            {Object.entries(row).map(([key, value], j) => (
                              <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {typeof value === 'number' && key.includes('amount') || key.includes('revenue') || key.includes('expense') || key.includes('profit') || key.includes('sales')
                                  ? formatCurrency(value as number)
                                  : key.includes('date') || key.includes('month') || key.includes('day')
                                  ? new Date(value as string).toLocaleDateString()
                                  : String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No data available for the selected parameters. Try adjusting your filters.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="saved">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Saved Reports</h3>
              <Button variant="outline" onClick={fetchSavedReports}>
                Refresh
              </Button>
            </div>
            
            {savedReports.length > 0 ? (
              <div className="space-y-3">
                {savedReports.map(report => (
                  <Card key={report.id} className="cursor-pointer hover:bg-gray-50" onClick={() => loadSavedReport(report)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-gray-500">{report.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {report.report_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No saved reports yet. Create a custom report and save it to see it here.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 