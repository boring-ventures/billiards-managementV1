/**
 * Cross-company data operations for admin users
 * These utilities allow fetching and analyzing data across all companies
 */
import 'server-only';
import { serverClient, logAdminOperation, assertSuperAdmin } from '../serverClient';

interface CompanyData {
  id: string;
  name: string;
}

interface UserCountData {
  companyId: string;
  count: number;
}

interface UserStatData {
  companyId: string;
  role: string;
  count: number;
}

/**
 * Fetch aggregated data across all companies
 * Returns summary statistics for each company
 */
export async function getCrossCompanyStats(
  adminUserId: string,
  dateRange?: { start: string; end: string }
): Promise<any> {
  // Verify the requester is a superadmin
  await assertSuperAdmin(adminUserId);
  
  // Log the operation
  await logAdminOperation(
    'CROSS_COMPANY_STATS',
    { dateRange },
    adminUserId
  );
  
  try {
    // Get all companies
    const { data: companies, error: companiesError } = await serverClient
      .from('companies')
      .select('id, name');
    
    if (companiesError) throw companiesError;
    
    // Get user counts per company using a raw query to support group by
    const { data: userCounts, error: userCountsError } = await serverClient
      .rpc('get_user_counts_by_company') as { data: UserCountData[] | null, error: any };
    
    if (userCountsError) throw userCountsError;
    
    // Create a map of company ID to user count
    const userCountMap = (userCounts || []).reduce((acc: Record<string, number>, item: UserCountData) => {
      acc[item.companyId] = item.count;
      return acc;
    }, {});
    
    // Format results
    const result = (companies || []).map((company: CompanyData) => ({
      id: company.id,
      name: company.name,
      userCount: userCountMap[company.id] || 0
      // Add more metrics as needed
    }));
    
    return result;
  } catch (error) {
    console.error('Error in getCrossCompanyStats:', error);
    throw error;
  }
}

/**
 * Get company comparison data for specific metrics
 */
export async function getCompanyComparison(
  adminUserId: string,
  options: {
    metrics: string[];
    dateRange?: { start: string; end: string };
  }
): Promise<any> {
  // Verify the requester is a superadmin
  await assertSuperAdmin(adminUserId);
  
  // Log the operation
  await logAdminOperation(
    'COMPANY_COMPARISON',
    options,
    adminUserId
  );
  
  try {
    // Get all companies to compare
    const { data: companies, error: companiesError } = await serverClient
      .from('companies')
      .select('id, name')
      .eq('active', true);
    
    if (companiesError) throw companiesError;
    
    // Initialize results structure
    const comparisonData: Record<string, any[]> = {};
    
    // Process each requested metric
    for (const metric of options.metrics) {
      let metricData: any[] = [];
      
      switch (metric) {
        case 'users':
          // Get user counts by role for each company using stored procedure
          const { data: userStats, error: userStatsError } = await serverClient
            .rpc('get_user_stats_by_company_role') as { data: UserStatData[] | null, error: any };
          
          if (userStatsError) throw userStatsError;
          
          // Process user stats
          metricData = (companies || []).map((company: CompanyData) => {
            const companyUserStats = (userStats || []).filter((stat: UserStatData) => stat.companyId === company.id);
            return {
              companyId: company.id,
              companyName: company.name,
              totalUsers: companyUserStats.reduce((sum: number, stat: UserStatData) => sum + stat.count, 0),
              roleBreakdown: companyUserStats.reduce((acc: Record<string, number>, stat: UserStatData) => {
                acc[stat.role] = stat.count;
                return acc;
              }, {})
            };
          });
          break;
        
        // Add other metrics as needed
        default:
          metricData = [];
      }
      
      comparisonData[metric] = metricData;
    }
    
    return comparisonData;
  } catch (error) {
    console.error('Error in getCompanyComparison:', error);
    throw error;
  }
}

/**
 * Utility to fetch data for a specific table across all companies
 * This bypasses RLS and fetches all records regardless of company_id
 */
export async function getAllCompanyRecords<T>(
  adminUserId: string,
  options: {
    table: string;
    select?: string;
    filters?: Record<string, any>;
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  // Verify the requester is a superadmin
  await assertSuperAdmin(adminUserId);
  
  // Log the operation
  await logAdminOperation(
    'ALL_COMPANY_RECORDS',
    {
      table: options.table,
      filters: options.filters
    },
    adminUserId
  );
  
  try {
    // Build the query
    let query = serverClient
      .from(options.table)
      .select(options.select || '*');
    
    // Apply filters if provided
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply ordering if specified
    if (options.orderBy) {
      query = query.order(
        options.orderBy.column,
        { ascending: options.orderBy.ascending ?? true }
      );
    }
    
    // Apply limit if specified
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data as T[];
  } catch (error) {
    console.error('Error in getAllCompanyRecords:', error);
    throw error;
  }
} 