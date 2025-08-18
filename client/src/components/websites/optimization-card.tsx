import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  RefreshCcw, 
  Database, 
  FileText, 
  Clock,
  HardDrive,
  Trash2,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface OptimizationCardProps {
  websiteId: number;
}

interface OptimizationData {
  postRevisions: {
    count: number;
    size: string;
  };
  databaseSize: {
    total: string;
    tables: number;
    overhead: string;
  };
  lastOptimized: string | null;
}

export default function OptimizationCard({ websiteId }: OptimizationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [optimizingType, setOptimizingType] = useState<'revisions' | 'database' | 'all' | null>(null);

  // Fetch optimization data
  const { data: optimizationData, isLoading } = useQuery<OptimizationData | null>({
    queryKey: [`/api/websites/${websiteId}/optimization`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Optimize post revisions mutation
  const optimizeRevisionsMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/websites/${websiteId}/optimization/revisions`),
    onMutate: () => {
      setOptimizingType('revisions');
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Post Revisions Optimized',
        description: `Cleaned up ${data.removedCount || 0} revisions, freed ${data.sizeFreed || '0 MB'} of space.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to optimize post revisions.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setOptimizingType(null);
    },
  });

  // Optimize database mutation
  const optimizeDatabaseMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/websites/${websiteId}/optimization/database`),
    onMutate: () => {
      setOptimizingType('database');
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Database Optimized',
        description: `Optimized ${data.tablesOptimized || 0} tables, freed ${data.sizeFreed || '0 MB'} of space.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to optimize database.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setOptimizingType(null);
    },
  });

  // Optimize all mutation
  const optimizeAllMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/websites/${websiteId}/optimization/all`),
    onMutate: () => {
      setOptimizingType('all');
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Complete Optimization Finished',
        description: `Cleaned up ${data.totalItemsRemoved || 0} items, freed ${data.totalSizeFreed || '0 MB'} of space.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Optimization Failed',
        description: error.message || 'Failed to perform complete optimization.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setOptimizingType(null);
    },
  });

  const handleOptimizeRevisions = () => {
    optimizeRevisionsMutation.mutate();
  };

  const handleOptimizeDatabase = () => {
    optimizeDatabaseMutation.mutate();
  };

  const handleOptimizeAll = () => {
    optimizeAllMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If optimization data is null (endpoint not available), show unavailable message
  if (optimizationData === null) {
    return (
      <Card data-testid="optimization-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Optimization Features Unavailable
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Optimization features require an updated WordPress Remote Manager plugin
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="optimization-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Optimization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Post Revisions */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-testid="post-revisions-section">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Post Revisions</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {optimizationData?.postRevisions ? (
                  <>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      {optimizationData.postRevisions.count} revisions
                    </span>
                    <span>{optimizationData.postRevisions.size}</span>
                  </>
                ) : (
                  <span>No data available</span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimizeRevisions}
            disabled={optimizingType !== null || !optimizationData}
            className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            data-testid="optimize-revisions-button"
          >
            {optimizingType === 'revisions' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="ml-2">Optimize</span>
          </Button>
        </div>

        {/* Database Performance */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-testid="database-performance-section">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Database Performance</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {optimizationData?.databaseSize ? (
                  <>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {optimizationData.databaseSize.total}
                    </span>
                    <span>{optimizationData.databaseSize.tables} tables</span>
                    {optimizationData.databaseSize.overhead !== '0 B' && (
                      <Badge variant="secondary" className="text-xs">
                        {optimizationData.databaseSize.overhead} overhead
                      </Badge>
                    )}
                  </>
                ) : (
                  <span>No data available</span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimizeDatabase}
            disabled={optimizingType !== null || !optimizationData}
            className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            data-testid="optimize-database-button"
          >
            {optimizingType === 'database' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
            <span className="ml-2">Optimize</span>
          </Button>
        </div>

        {/* Last Optimized Info */}
        {optimizationData?.lastOptimized && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-2">
            <Clock className="h-4 w-4" />
            <span>
              Last optimized: {new Date(optimizationData.lastOptimized).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Optimize All Button */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleOptimizeAll}
            disabled={optimizingType !== null || !optimizationData}
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            data-testid="optimize-all-button"
          >
            {optimizingType === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Optimize All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}