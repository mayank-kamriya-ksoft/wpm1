import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/queryClient";
import { safeMap, ensureArray, productionSafeArray } from "@/lib/array-safety";
import { 
  Download, 
  RefreshCw,
  CheckCircle2,
  Package,
  Palette,
  Shield,
  ArrowRight,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import { getPluginIdentifier } from "@/utils/pluginHelpers";

interface UpdatesCardProps {
  websiteId: number;
}

interface WPRemoteManagerUpdates {
  wordpress: {
    update_available: boolean;
    current_version: string;
    new_version: string;
  };
  plugins: Array<{
    name: string;
    current_version: string;
    new_version: string;
    slug: string;
    update_available?: boolean;
  }>;
  themes: Array<{
    name: string;
    current_version: string;
    new_version: string;
    slug: string;
    update_available?: boolean;
  }>;
  count: {
    total: number;
    plugins: number;
    themes: number;
    core: number;
  };
}

export default function UpdatesCard({ websiteId }: UpdatesCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUpdates, setSelectedUpdates] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch updates from WP Remote Manager API with error handling
  const { data: updates, isLoading, error, refetch } = useQuery<WPRemoteManagerUpdates>({
    queryKey: [`/api/websites/${websiteId}/wrm/updates`],
    enabled: !!websiteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Don't retry on error to avoid spam
  });

  // Fetch actual plugin data to get current versions
  const { data: pluginsData } = useQuery<any[]>({
    queryKey: [`/api/websites/${websiteId}/wrm-plugins`],
    enabled: !!websiteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch actual theme data to get current versions
  const { data: themesData } = useQuery<any[]>({
    queryKey: [`/api/websites/${websiteId}/wrm-themes`],
    enabled: !!websiteId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Always fetch WordPress data as fallback for update information
  const { data: wordpressData } = useQuery<any>({
    queryKey: [`/api/websites/${websiteId}/wordpress-data`],
    enabled: !!websiteId, // Always fetch WordPress data
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // WordPress core update mutation
  const updateWordPressMutation = useMutation({
    mutationFn: async () => {
      return apiCall(`/api/websites/${websiteId}/update-wordpress`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "WordPress Updated",
          description: "WordPress core has been updated successfully",
        });
        refetch();
        // Refresh WordPress data to get new versions
        queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wordpress-data`] });
      } else {
        toast({
          title: "Update Failed",
          description: data.message || "Failed to update WordPress core",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update WordPress core",
        variant: "destructive",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: { plugins: string[], themes: string[], wordpress: boolean }) => {
      return apiCall(`/api/websites/${websiteId}/update-all`, {
        method: 'POST',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        const updatedCount = (data.plugins?.filter((p: any) => p.success)?.length || 0) + 
                           (data.themes?.filter((t: any) => t.success)?.length || 0) +
                           (data.wordpress?.success ? 1 : 0);
        
        toast({
          title: "Bulk Updates Completed",
          description: `${updatedCount} items updated successfully`,
        });
        
        setSelectedUpdates([]);
        setSelectAll(false);
        
        // Comprehensive refresh of all related data
        Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wordpress-data`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wrm/updates`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/update-logs`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/all-updates`] })
        ]).then(() => {
          // Show comprehensive success notification after data refresh
          setTimeout(() => {
            toast({
              title: "Dashboard Refreshed",
              description: `All maintenance logs updated. Check the Update Logs section for details.`,
            });
          }, 1500);
        });
      } else {
        const failedCount = (data.plugins?.filter((p: any) => !p.success)?.length || 0) + 
                          (data.themes?.filter((t: any) => !t.success)?.length || 0) +
                          (!data.wordpress?.success && data.wordpress ? 1 : 0);
        
        toast({
          title: "Updates Failed",
          description: `${failedCount} updates failed. Check logs for details.`,
          variant: "destructive",
        });
        
        // Still refresh data to show updated logs
        queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/update-logs`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Updates Failed",
        description: error.message || "Failed to perform bulk updates",
        variant: "destructive",
      });
    },
  });

  // Plugin update mutation
  const updatePluginMutation = useMutation({
    mutationFn: async (pluginPath: string) => {
      console.log('[Frontend]2 Initiating plugin update for:', pluginPath);

      const response = apiCall(`/api/websites/${websiteId}/update-plugin`, {
        method: 'POST',
        body: JSON.stringify({ plugin: pluginPath }),
      });
       console.log('[Frontend]2 Update response:', response);
    return response;
    },
    onSuccess: (data, pluginPath) => {
      if (data.success) {
        toast({
          title: "Plugin Updated",
          description: `Plugin has been updated successfully`,
        });
        // Comprehensive refresh of all related data
        Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wordpress-data`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wrm/updates`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/update-logs`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}`] })
        ]).then(() => {
          // Show success notification after data refresh
          setTimeout(() => {
            toast({
              title: "Dashboard Updated",
              description: "All data has been refreshed with latest information",
            });
          }, 1000);
        });
      } else if (data.isTimeout) {
        // Handle timeout scenario with informative message
        toast({
          title: "Update In Progress",
          description: data.message || "Update initiated but taking longer than expected. Check back in a few minutes.",
          variant: "default",
        });
        // Suggest checking back later
        setTimeout(() => {
          toast({
            title: "Tip",
            description: "Refresh the page in a few minutes to see if the update completed successfully.",
          });
        }, 3000);
      } else {
        toast({
          title: "Update Failed",
          description: data.message || "Failed to update plugin",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      // Parse enhanced error details if available
      let errorTitle = "Update Failed";
      let errorDescription = "Failed to update plugin";
      
      if (error.details || error.error) {
        errorDescription = error.details || error.error || error.message || "Failed to update plugin";
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      // Check for timeout-specific errors first
      if (errorDescription.includes('timeout') || errorDescription.includes('ETIMEDOUT') || 
          errorDescription.includes('taking longer than expected')) {
        errorTitle = "Update In Progress";
        errorDescription = "The plugin update is taking longer than expected but may still be processing. Please check back in a few minutes.";
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "default", // Use default instead of destructive for timeout
        });
        
        // Add a helpful tip after timeout
        setTimeout(() => {
          toast({
            title: "Tip",
            description: "Large plugins may take several minutes to update. Refresh the page to check if the update completed.",
          });
        }, 2000);
        return;
      }
      
      // Check for specific error patterns to provide helpful guidance
      if (errorDescription.includes('404') || errorDescription.includes('not found')) {
        errorTitle = "Plugin Update Endpoint Not Available";
        errorDescription = "The WP Remote Manager plugin may need to be updated or reconfigured on your WordPress site";
      } else if (errorDescription.includes('Authentication failed') || errorDescription.includes('API key')) {
        errorTitle = "Authentication Error";
        errorDescription = "Please check your WP Remote Manager API key in the website settings";
      } else if (errorDescription.includes('Cannot connect') || errorDescription.includes('ECONNREFUSED')) {
        errorTitle = "Connection Error";
        errorDescription = "Cannot connect to your WordPress site. Please verify the website URL and try again";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    },
  });

  // Theme update mutation
  const updateThemeMutation = useMutation({
    mutationFn: async (themeSlug: string) => {
      console.log('themeSlug:',themeSlug)
      return apiCall(`/api/websites/${websiteId}/update-theme`, {
        method: 'POST',
        body: JSON.stringify({ theme: themeSlug }),
      });
    },
    onSuccess: (data, themeSlug) => {
      if (data.success) {
        toast({
          title: "Theme Updated",
          description: "Theme has been updated successfully",
        });
        // Comprehensive refresh of all related data
        Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wordpress-data`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/wrm/updates`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}/update-logs`] }),
          queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}`] })
        ]).then(() => {
          // Show success notification after data refresh
          setTimeout(() => {
            toast({
              title: "Dashboard Updated",
              description: "All data has been refreshed with latest information",
            });
          }, 1000);
        });
      } else {
        toast({
          title: "Update Failed",
          description: data.message || "Failed to update theme",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update theme",
        variant: "destructive",
      });
    },
  });

  // Process updates data correctly and merge with current version information
  // Use WRM updates if available, otherwise fall back to WordPress data
  let pluginUpdates: any[] = [];
  let themeUpdates: any[] = [];
  let wordpressUpdate: boolean = false;

  // Check if WRM updates are valid and contain actual update data
  const hasValidWRMUpdates = updates && !error && 
    ((updates.plugins && updates.plugins.length > 0) || 
     (updates.themes && updates.themes.length > 0) || 
     updates.wordpress?.update_available);

  if (hasValidWRMUpdates) {
    // Use WRM updates data
    const isValidUpdatesObject = (obj: any): boolean => {
      return obj && typeof obj === 'object' && !Array.isArray(obj);
    };

    if (!isValidUpdatesObject(updates)) {
      console.warn('Invalid updates object received:', updates);
      pluginUpdates = [];
      themeUpdates = [];
      wordpressUpdate = false;
    } else {
      console.log('=== WRM UPDATES DEBUG ===');
    console.log('Full updates object:', JSON.stringify(updates, null, 2));
    console.log('Plugins array length:', Array.isArray(updates.plugins) ? updates.plugins.length : 'Not an array');
    console.log('Themes array length:', Array.isArray(updates.themes) ? updates.themes.length : 'Not an array');
    console.log('WordPress update available:', updates.wordpress?.update_available || false);
    console.log('========================');
    
    // For WP Remote Manager, plugins array contains only items with updates available
    // Comprehensive array validation before any array operations
    const pluginsArray = updates?.plugins;
    if (pluginsArray && Array.isArray(pluginsArray) && pluginsArray.length >= 0) {
      try {
        // Ensure we're working with a valid array before mapping
        const validPluginsArray = Array.isArray(pluginsArray) ? pluginsArray : [];
        pluginUpdates = safeMap(validPluginsArray, (plugin: any) => {
          if (!plugin || typeof plugin !== 'object') {
            console.warn('Invalid plugin object in updates:', plugin);
            return null;
          }
          const currentPlugin = Array.isArray(pluginsData) ? pluginsData.find((p: any) => 
            p.plugin === plugin.name || 
            p.name === plugin.name ||
            p.plugin?.includes(plugin.name) ||
            plugin.name?.includes(p.name)
          ) : null;
          return {
            ...plugin,
            current_version: currentPlugin?.version || plugin.current_version || 'Unknown',
            slug: plugin.name || plugin.slug
          };
        }).filter(Boolean); // Remove any null entries
      } catch (mapError) {
        console.error('Error mapping plugin updates:', mapError);
        pluginUpdates = [];
      }
    } else {
      console.log('Updates plugins is not a valid array:', pluginsArray);
      pluginUpdates = [];
    }
    
    // For WP Remote Manager, themes array contains only items with updates available  
    // Comprehensive array validation before any array operations
    const themesArray = updates?.themes;
    if (themesArray && Array.isArray(themesArray) && themesArray.length >= 0) {
      try {
        // Ensure we're working with a valid array before mapping
        const validThemesArray = Array.isArray(themesArray) ? themesArray : [];
        themeUpdates = safeMap(validThemesArray, (theme: any) => {
          if (!theme || typeof theme !== 'object') {
            console.warn('Invalid theme object in updates:', theme);
            return null;
          }
          const currentTheme = Array.isArray(themesData) ? themesData.find((t: any) => 
            t.stylesheet === theme.name || 
            t.name === theme.name ||
            t.stylesheet?.includes(theme.name) ||
            theme.name?.includes(t.name)
          ) : null;
          return {
            ...theme,
            current_version: currentTheme?.version || theme.current_version || 'Unknown',
            slug: theme.name || theme.slug
          };
        }).filter(Boolean); // Remove any null entries
      } catch (mapError) {
        console.error('Error mapping theme updates:', mapError);
        themeUpdates = [];
      }
    } else {
      console.log('Updates themes is not a valid array:', themesArray);
      themeUpdates = [];
    }
    
      wordpressUpdate = updates?.wordpress?.update_available;
    }
  } else {
    // Fallback: Use WordPress data when WRM updates are unavailable or empty
    const safePluginsData = Array.isArray(pluginsData) ? pluginsData : [];
    const safeThemesData = Array.isArray(themesData) ? themesData : [];
    
    // Extract plugin updates from individual plugin data
    if (safePluginsData.length > 0) {
      try {
        pluginUpdates = safeMap(
          safePluginsData.filter((plugin: any) => plugin && plugin.update_available === true),
          (plugin: any) => ({
            name: plugin.name,
            current_version: plugin.version,
            new_version: plugin.new_version || 'Latest',
            slug: plugin.plugin,
            update_available: true
          }));
      } catch (mapError) {
        console.error('Error processing fallback plugin updates:', mapError);
        pluginUpdates = [];
      }
    }
    
    // Extract theme updates from individual theme data
    if (safeThemesData.length > 0) {
      try {
        themeUpdates = safeMap(
          safeThemesData.filter((theme: any) => theme && theme.update_available === true),
          (theme: any) => ({
            name: theme.name,
            current_version: theme.version,
            new_version: theme.new_version || 'Latest',
            slug: theme.stylesheet,
            update_available: true
          }));
      } catch (mapError) {
        console.error('Error processing fallback theme updates:', mapError);
        themeUpdates = [];
      }
    }
    
    // Extract WordPress core update from WordPress data
    wordpressUpdate = wordpressData?.updateData?.wordpress?.update_available || false;
  }
  
  const totalUpdates = pluginUpdates.length + themeUpdates.length + (wordpressUpdate ? 1 : 0);
  
  console.log('=== FINAL UPDATE COUNTS ===');
  console.log('Plugin updates:', pluginUpdates.length);
  console.log('Theme updates:', themeUpdates.length);
  console.log('WordPress update:', wordpressUpdate ? 1 : 0);
  console.log('Total updates:', totalUpdates);
  console.log('==========================');

  // Handle select all functionality with comprehensive array safety
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUpdates([]);
    } else {
      try {
        const safePluginUpdates = Array.isArray(pluginUpdates) ? pluginUpdates : [];
        const safeThemeUpdates = Array.isArray(themeUpdates) ? themeUpdates : [];
        
        const allUpdateIds = [
          ...(wordpressUpdate ? ['wordpress'] : []),
          ...safeMap(safePluginUpdates, (p: any) => `plugin-${p?.slug || p?.name || 'unknown'}`),
          ...safeMap(safeThemeUpdates, (t: any) => `theme-${t?.slug || t?.name || 'unknown'}`)
        ];
        setSelectedUpdates(allUpdateIds);
      } catch (error) {
        console.error('Error in handleSelectAll:', error);
        setSelectedUpdates([]);
      }
    }
    setSelectAll(!selectAll);
  };

  // Handle individual update selection
  const handleUpdateSelect = (updateId: string) => {
    setSelectedUpdates(prev => {
      if (prev.includes(updateId)) {
        return prev.filter(id => id !== updateId);
      } else {
        return [...prev, updateId];
      }
    });
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedUpdates.length === 0) return;

    toast({
      title: "Starting Updates",
      description: `Starting ${selectedUpdates.length} updates...`,
    });

    let successful = 0;
    let failed = 0;

    // Process selected updates sequentially to avoid overwhelming the server
    for (const updateId of selectedUpdates) {
      try {
        if (updateId === 'wordpress') {
          await updateWordPressMutation.mutateAsync();
          successful++;
        } else if (updateId.startsWith('plugin-')) {
          const pluginSlug = updateId.replace('plugin-', '');
          // Find the actual plugin to get the correct plugin path
          const plugin = pluginUpdates.find(p => (p.slug || p.name) === pluginSlug);
          const pluginPath = plugin?.plugin || plugin?.slug || pluginSlug;
          await updatePluginMutation.mutateAsync(pluginPath);
          successful++;
        } else if (updateId.startsWith('theme-')) {
          const themeSlug = updateId.replace('theme-', '');
          await updateThemeMutation.mutateAsync(themeSlug);
          successful++;
        }
      } catch (error) {
        failed++;
        console.error(`Failed to update ${updateId}:`, error);
      }
    }

    // Clear selections after bulk update
    setSelectedUpdates([]);
    setSelectAll(false);

    // Show summary toast
    if (failed === 0) {
      toast({
        title: "All Updates Completed",
        description: `Successfully updated ${successful} items`,
      });
    } else {
      toast({
        title: "Updates Completed with Errors",
        description: `${successful} successful, ${failed} failed`,
        variant: failed > successful ? "destructive" : "default",
      });
    }

    // Refresh the updates data
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking for updates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle maintenance mode or plugin authentication errors
  if (error && (error.message?.includes('maintenance') || error.message?.includes('not allowed') || error.message?.includes('rest_forbidden'))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium text-orange-600 mb-1">
                {error.message?.includes('maintenance') 
                  ? 'Site in Maintenance Mode' 
                  : error.message?.includes('not allowed') 
                    ? 'Authentication Issue'
                    : 'Plugin Connection Issue'
                }
              </p>
              <p className="text-xs text-gray-500">
                {error.message?.includes('maintenance') 
                  ? 'WordPress updates are temporarily unavailable'
                  : error.message?.includes('not allowed')
                    ? 'WP Remote Manager API key needs to be regenerated'
                    : 'WP Remote Manager plugin needs to be reactivated'
                }
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="mt-3"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if API failed and no fallback data
  if (error && !wordpressData && totalUpdates === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Updates</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
              Updates Check Failed
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              WordPress plugin needs a quick fix. Using plugin/theme data from cache.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Updates</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Update Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-3xl font-bold text-blue-600">{pluginUpdates.length}</div>
            <div className="text-sm text-blue-700 dark:text-blue-400 font-medium">Plugins</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-3xl font-bold text-purple-600">{themeUpdates.length}</div>
            <div className="text-sm text-purple-700 dark:text-purple-400 font-medium">Theme</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-3xl font-bold text-orange-600">{wordpressUpdate ? 1 : 0}</div>
            <div className="text-sm text-orange-700 dark:text-orange-400 font-medium">WordPress</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={selectedUpdates.length === 0 || updateWordPressMutation.isPending || updatePluginMutation.isPending || updateThemeMutation.isPending}
              onClick={handleBulkUpdate}
            >
              {(updateWordPressMutation.isPending || updatePluginMutation.isPending || updateThemeMutation.isPending) ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Update all
            </Button>
          </div>
        </div>

        {/* Select All Checkbox */}
        {totalUpdates > 0 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <span className="font-medium">Select All ({totalUpdates} updates)</span>
            </div>
            <div className="text-sm text-gray-600">
              {selectedUpdates.length} selected
            </div>
          </div>
        )}

        {/* Updates List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {/* WordPress Core Update */}
          {wordpressUpdate && (
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <Checkbox 
                checked={selectedUpdates.includes('wordpress')}
                onCheckedChange={() => handleUpdateSelect('wordpress')}
              />
              <Shield className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">WordPress Core</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-400">{updates?.wordpress?.current_version}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-green-600 font-medium">{updates?.wordpress?.new_version}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateWordPressMutation.mutate()}
                disabled={updateWordPressMutation.isPending}
                className="ml-2"
              >
                {updateWordPressMutation.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}

          {/* Plugin Updates */}
          {Array.isArray(pluginUpdates) && pluginUpdates.map((plugin) => (
            <div key={plugin.slug || plugin.name} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <Checkbox 
                checked={selectedUpdates.includes(`plugin-${plugin.slug || plugin.name}`)}
                onCheckedChange={() => handleUpdateSelect(`plugin-${plugin.slug || plugin.name}`)}
              />
              <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{plugin.name ? (plugin.name.charAt(0).toUpperCase() + plugin.name.slice(1).replace(/-/g, ' ')) : (plugin.slug || 'Unknown Plugin')}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-400">
                  {plugin.current_version && plugin.current_version !== 'Unknown' ? plugin.current_version : 'Current'}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-green-600 font-medium">{plugin.new_version}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
    console.log('PLUGIN OBJECT:', plugin);
    const pluginIdentifier = getPluginIdentifier(plugin);
    console.log('Updating plugin with identifier:', pluginIdentifier);
    updatePluginMutation.mutate(pluginIdentifier);
  }}
                disabled={updatePluginMutation.isPending}
                className="ml-2"
              >
                {updatePluginMutation.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}

          {/* Theme Updates */}
          {Array.isArray(themeUpdates) && themeUpdates.map((theme) => (
            <div key={theme.slug || theme.name} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <Checkbox 
                checked={selectedUpdates.includes(`theme-${theme.slug || theme.name}`)}
                onCheckedChange={() => handleUpdateSelect(`theme-${theme.slug || theme.name}`)}
              />
              <Palette className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{theme.name ? (theme.name.charAt(0).toUpperCase() + theme.name.slice(1).replace(/-/g, ' ')) : (theme.slug || 'Unknown Theme')}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-400">
                  {theme.current_version && theme.current_version !== 'Unknown' ? theme.current_version : 'Current'}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-green-600 font-medium">{theme.new_version}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateThemeMutation.mutate(theme.slug || theme.name)}
                disabled={updateThemeMutation.isPending}
                className="ml-2"
              >
                {updateThemeMutation.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
        
        {/* No updates message */}
        {totalUpdates === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
              All Up to Date!
            </h3>
            <p className="text-sm text-muted-foreground">
              Your website is running the latest versions
            </p>
          </div>
        )}

        {/* Select All Footer */}
        {totalUpdates > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSelectAll}
            >
              {selectAll ? 'Deselect all' : 'Select all'}
            </Button>
            <span className="text-sm text-gray-500">
              {selectedUpdates.length > 0 ? `${selectedUpdates.length} selected` : 'None selected'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}