import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Zap, 
  Database, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  HardDrive,
  Archive,
  Trash2,
  Settings,
  Info
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiCall } from '@/lib/queryClient';

interface OptimizationSectionProps {
  websiteId: number;
}

interface OptimizationData {
  postRevisions: {
    count: number;
    size: string;
    lastCleanup?: string;
  };
  databasePerformance: {
    size: string;
    optimizationNeeded: boolean;
    lastOptimization?: string;
    tables: number;
  };
  trashedContent: {
    posts: number;
    comments: number;
    size: string;
  };
  spam: {
    comments: number;
    size: string;
  };
}

export function OptimizationSection({ websiteId }: OptimizationSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch optimization data
  const { data: optimizationData, isLoading } = useQuery<OptimizationData>({
    queryKey: [`/api/websites/${websiteId}/optimization-data`],
    enabled: !!websiteId,
  });

  // Clean post revisions mutation
  const cleanRevisionsMutation = useMutation({
    mutationFn: async () => {
      return await apiCall(`/api/websites/${websiteId}/optimize/revisions`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization-data`] });
      toast({ title: 'Post revisions cleaned successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to clean post revisions', variant: 'destructive' });
    }
  });

  // Database optimization mutation
  const optimizeDatabaseMutation = useMutation({
    mutationFn: async () => {
      return await apiCall(`/api/websites/${websiteId}/optimize/database`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization-data`] });
      toast({ title: 'Database optimized successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to optimize database', variant: 'destructive' });
    }
  });

  // Clean trash mutation
  const cleanTrashMutation = useMutation({
    mutationFn: async () => {
      return await apiCall(`/api/websites/${websiteId}/optimize/trash`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization-data`] });
      toast({ title: 'Trash cleaned successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to clean trash', variant: 'destructive' });
    }
  });

  // Clean spam mutation
  const cleanSpamMutation = useMutation({
    mutationFn: async () => {
      return await apiCall(`/api/websites/${websiteId}/optimize/spam`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization-data`] });
      toast({ title: 'Spam cleaned successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to clean spam', variant: 'destructive' });
    }
  });

  // Optimize all mutation
  const optimizeAllMutation = useMutation({
    mutationFn: async () => {
      return await apiCall(`/api/websites/${websiteId}/optimize/all`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/optimization-data`] });
      toast({ title: 'All optimizations completed successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to complete all optimizations', variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading optimization data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!optimizationData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load optimization data. Please check your WordPress connection.
        </AlertDescription>
      </Alert>
    );
  }

  const hasOptimizationNeeded = optimizationData.postRevisions.count > 0 || 
                                optimizationData.databasePerformance.optimizationNeeded ||
                                optimizationData.trashedContent.posts > 0 ||
                                optimizationData.spam.comments > 0;

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {optimizationData.postRevisions.count}
          </div>
          <div className="text-xs text-muted-foreground">Post Revisions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {optimizationData.trashedContent.posts + optimizationData.trashedContent.comments}
          </div>
          <div className="text-xs text-muted-foreground">Trash Items</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {optimizationData.spam.comments}
          </div>
          <div className="text-xs text-muted-foreground">Spam</div>
        </div>
        <div className="text-center">
          {hasOptimizationNeeded ? (
            <Button 
              size="sm" 
              className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
              onClick={() => optimizeAllMutation.mutate()}
              disabled={optimizeAllMutation.isPending}
            >
              {optimizeAllMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Optimize All'
              )}
            </Button>
          ) : (
            <div>
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-xs text-muted-foreground">Optimized</div>
            </div>
          )}
        </div>
      </div>

      {/* Optimization Items */}
      <Card>
        <CardContent className="p-0">
          {/* Post Revisions */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Post Revisions</h3>
                <p className="text-sm text-muted-foreground">
                  Remove old post revisions to free up database space
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge 
                  variant={optimizationData.postRevisions.count > 0 ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {optimizationData.postRevisions.count} revisions
                </Badge>
                {optimizationData.postRevisions.size && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {optimizationData.postRevisions.size}
                  </p>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cleanRevisionsMutation.mutate()}
                    disabled={cleanRevisionsMutation.isPending || optimizationData.postRevisions.count === 0}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    {cleanRevisionsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Optimize'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clean up post revisions</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Database Performance */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Database Performance</h3>
                <p className="text-sm text-muted-foreground">
                  Optimize database tables for better performance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge 
                  variant={optimizationData.databasePerformance.optimizationNeeded ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {optimizationData.databasePerformance.size}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {optimizationData.databasePerformance.tables} tables
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => optimizeDatabaseMutation.mutate()}
                    disabled={optimizeDatabaseMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    {optimizeDatabaseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Optimize'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Optimize database tables</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Trashed Content */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium">Trashed Content</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete trashed posts and comments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge 
                  variant={optimizationData.trashedContent.posts > 0 ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {optimizationData.trashedContent.posts} items
                </Badge>
                {optimizationData.trashedContent.size && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {optimizationData.trashedContent.size}
                  </p>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cleanTrashMutation.mutate()}
                    disabled={cleanTrashMutation.isPending || optimizationData.trashedContent.posts === 0}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    {cleanTrashMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Optimize'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Empty trash permanently</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Spam Comments */}
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium">Spam Comments</h3>
                <p className="text-sm text-muted-foreground">
                  Remove spam comments from your database
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge 
                  variant={optimizationData.spam.comments > 0 ? "secondary" : "outline"}
                  className="text-sm"
                >
                  {optimizationData.spam.comments} comments
                </Badge>
                {optimizationData.spam.size && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {optimizationData.spam.size}
                  </p>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cleanSpamMutation.mutate()}
                    disabled={cleanSpamMutation.isPending || optimizationData.spam.comments === 0}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    {cleanSpamMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Optimize'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete spam comments</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      {!hasOptimizationNeeded && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your website is fully optimized! No cleanup actions are needed at this time.
          </AlertDescription>
        </Alert>
      )}

      {/* Last Optimization Info */}
      {optimizationData.databasePerformance.lastOptimization && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Last optimization: {new Date(optimizationData.databasePerformance.lastOptimization).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}