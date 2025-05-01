# Billiards Management System - New Features Implementation

This document outlines how to implement two critical features for the billiards management system:

1. **Activity Log System** - Tracks user actions across the system
2. **Financial Reporting System** - Provides comprehensive financial analysis tools

## Implementation Steps

### 1. Database Setup

Run the SQL scripts in your Supabase SQL Editor:

1. First, run `activity_log.sql` to set up the activity logging system
2. Then, run `finance_reporting.sql` to set up the financial reporting tables and views

### 2. Front-end Component Installation

Install required dependencies:

```bash
npm install chart.js react-chartjs-2 date-fns lucide-react
# If using shadcn/ui components
npx shadcn-ui@latest add card tabs select button
```

### 3. Component Integration

#### Activity Log Component

1. Create the UI component by adding `ActivityLogComponent.tsx` to your components directory
2. Fix any missing UI component imports (based on your UI library setup)
3. Create a Supabase client file at `lib/supabaseClient.ts` if it doesn't exist:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

4. Add the Activity Log component to your admin dashboard page:

```tsx
import ActivityLogComponent from '../components/ActivityLogComponent';

// In your page component
return (
  <div>
    <h1>Admin Dashboard</h1>
    <ActivityLogComponent companyId={companyId} />
  </div>
);
```

#### Financial Reporting Component

1. Create the UI component by adding `FinancialReporting.tsx` to your components directory
2. Add a DatePicker component at `ui/date-picker.tsx` if you don't already have one
3. Fix any missing UI component imports (based on your UI library setup)
4. Add the Financial Reporting component to your finance page:

```tsx
import FinancialReporting from '../components/FinancialReporting';

// In your page component
return (
  <div>
    <h1>Finance Dashboard</h1>
    <FinancialReporting companyId={companyId} />
  </div>
);
```

### 4. Automated Activity Logging

To automatically log activities throughout your application, add function calls to your actions:

```typescript
// Example: Logging a sale
async function createSale(data) {
  try {
    // Create the sale
    const { data: sale, error } = await supabase
      .from('pos_orders')
      .insert(data)
      .select()
      .single();
      
    if (error) throw error;
    
    // Manually log the activity if not using triggers
    await supabase.rpc('log_activity', {
      user_id: auth.user().id,
      company_id: data.company_id,
      action_type: 'create',
      resource_type: 'pos_order',
      resource_id: sale.id,
      details: {
        order_id: sale.id,
        total_amount: sale.total_amount,
        order_items: data.items.length
      }
    });
    
    return sale;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
}
```

## Testing

1. After implementing the SQL scripts, verify that the tables and views have been created correctly
2. Test the activity log by performing various actions in the system and checking if they're recorded
3. Test the financial reporting by generating different types of reports and verifying the data

## Troubleshooting

- **Missing table error**: Ensure all SQL scripts ran successfully
- **Component errors**: Check that all required packages are installed and imports are correct
- **Empty reports**: Verify that you have data in your finance_transactions and other relevant tables
- **Performance issues**: Add appropriate indexes to tables if queries are slow

## Next Steps

1. Implement additional report types as needed
2. Create export functionality (PDF, Excel) for reports
3. Add scheduled reports that can be emailed to users
4. Implement alert systems based on financial thresholds 