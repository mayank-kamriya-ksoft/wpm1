import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Database, 
  Zap, 
  HardDrive, 
  Clock, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  Server
} from "lucide-react";

interface WordPressHealthStatusProps {
  websiteId: number;
}

interface SecurityScanData {
  id: number;
  overallSecurityScore: number;
  threatLevel: 'low' | 'medium' | 'high';
  threatsDetected: number;
  malwareStatus: string;
  scanStatus: string;
}

interface PerformanceScanData {
  id: number;
  pagespeedScore: number;
  yslowScore: number;
  loadTime: number;
  scanTimestamp: string;
}

interface WordPressData {
  systemInfo: {
    wordpress_version: string;
    php_version: string;
    mysql_version: string;
    memory_limit: string;
    max_execution_time: string;
    upload_max_filesize: string;
    disk_space_used: string;
    disk_space_available: string;
    server_software: string;
    site_url: string;
    admin_email: string;
  } | null;
  updateData: {
    wordpress: {
      update_available: boolean;
      new_version?: string;
    };
    plugins: Array<{
      name: string;
      current_version: string;
      new_version: string;
    }>;
    themes: Array<{
      name: string;
      current_version: string;
      new_version: string;
    }>;
    count: {
      total: number;
      plugins: number;
      themes: number;
      core: number;
    };
  };
  pluginData: Array<{
    name: string;
    version: string;
    active: boolean;
    update_available: boolean;
  }>;
  themeData: Array<{
    name: string;
    version: string;
    status: string;
    update_available: boolean;
  }>;
}

export function WordPressHealthStatus({ websiteId }: WordPressHealthStatusProps) {
  const { data: rawWpData, isLoading, refetch } = useQuery<WordPressData>({
    queryKey: ['/api/websites', websiteId, 'wordpress-data'],
    enabled: !!websiteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper to normalize data from both local and production
  function normalizeWordPressData(data: any): WordPressData | null {
    if (!data) return null;
    // --- SYSTEM INFO ---
    let systemInfo = data.systemInfo;
    if (systemInfo && systemInfo.site_info) {
      // Production format
      const s = systemInfo.site_info;
      systemInfo = {
        wordpress_version: s.wordpress_version,
        php_version: s.php_version,
        mysql_version: s.mysql_version,
        memory_limit: s.memory_limit,
        max_execution_time: s.max_execution_time || '',
        upload_max_filesize: s.upload_max_filesize || '',
        disk_space_used: (s.disk_usage && (s.disk_usage.used || s.disk_usage.free || s.disk_usage.total)) || '',
        disk_space_available: (s.disk_usage && (s.disk_usage.available || s.disk_usage.free)) || '',
        server_software: s.server_software || '',
        site_url: s.url || '',
        admin_email: s.admin_email || '',
      };
    }
    // --- PLUGIN DATA ---
    let pluginData = data.pluginData;
    if (pluginData && pluginData.plugins) {
      pluginData = pluginData.plugins.map((p: any) => ({
        name: p.name,
        version: p.version,
        active: p.active,
        update_available: p.update_available,
        // fallback for local/production
        plugin: p.plugin || p.path,
        author: p.author,
        plugin_uri: p.plugin_uri,
        description: p.description,
      }));
    }
    // --- THEME DATA ---
    let themeData = data.themeData;
    if (Array.isArray(themeData)) {
      themeData = themeData.map((t: any) => ({
        name: t.name,
        version: t.version,
        status: t.active !== undefined ? (t.active ? 'active' : 'inactive') : (t.status || ''),
        update_available: t.update_available,
        author: t.author,
        theme_uri: t.theme_uri,
        description: t.description,
        template: t.template,
        stylesheet: t.stylesheet,
        screenshot: t.screenshot,
      }));
    }
    // --- UPDATE DATA ---
    let updateData = data.updateData;
    if (updateData && updateData.updates) {
      // Production format
      updateData = {
        wordpress: { update_available: (updateData.updates.wordpress && updateData.updates.wordpress.length > 0) },
        plugins: updateData.updates.plugins || [],
        themes: updateData.updates.themes || [],
        count: {
          total: updateData.updates.total_count || 0,
          plugins: (updateData.updates.plugins && updateData.updates.plugins.length) || 0,
          themes: (updateData.updates.themes && updateData.updates.themes.length) || 0,
          core: (updateData.updates.wordpress && updateData.updates.wordpress.length) || 0,
        },
      };
    }
    // --- Compose normalized object ---
    return {
      systemInfo: systemInfo || null,
      updateData: updateData || { wordpress: { update_available: false }, plugins: [], themes: [], count: { total: 0, plugins: 0, themes: 0, core: 0 } },
      pluginData: pluginData || [],
      themeData: themeData || [],
    } as WordPressData;
  }

  const wpData = normalizeWordPressData(rawWpData);

  // Fetch latest security scan data
  const { data: securityScan } = useQuery<SecurityScanData>({
    queryKey: ['/api/websites', websiteId, 'security-scans', 'latest'],
    enabled: !!websiteId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch latest performance scan data
  const { data: performanceScans } = useQuery<PerformanceScanData[]>({
    queryKey: ['/api/websites', websiteId, 'performance-scans'],
    enabled: !!websiteId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="shadow-md border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-green-600" />
            WordPress Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wpData) {
    return (
      <Card className="shadow-md border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-green-600" />
            WordPress Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Unable to fetch WordPress data</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateHealthScore = () => {
    let score = 100;
    
    // Deduct for available updates
    if (wpData.updateData?.wordpress?.update_available) score -= 15;
    score -= Math.min((wpData.updateData?.count?.plugins || 0) * 3, 30); // Max 30 points for plugins
    score -= Math.min((wpData.updateData?.count?.themes || 0) * 5, 20); // Max 20 points for themes
    
    // Check PHP version (rough check for modern versions)
    const phpVersionStr = wpData.systemInfo?.php_version;
    if (phpVersionStr && wpData.systemInfo) {
      const phpVersion = parseFloat(phpVersionStr);
      if (phpVersion < 8.0) score -= 15;
      else if (phpVersion < 8.1) score -= 5;
    }
    
    // Check memory limit
    const memoryLimit = wpData.systemInfo?.memory_limit;
    if (memoryLimit && wpData.systemInfo) {
      const memoryMB = parseInt(memoryLimit.replace(/[^\d]/g, ''));
      if (memoryMB < 256) score -= 10;
      else if (memoryMB < 512) score -= 5;
    }

    // Security assessment impact
    if (securityScan) {
      const securityScore = securityScan.overallSecurityScore || 0;
      if (securityScore < 50) score -= 20;
      else if (securityScore < 70) score -= 10;
      else if (securityScore < 85) score -= 5;

      // Additional deductions for specific threats
      if (securityScan.threatsDetected > 0) score -= 15;
      if (securityScan.threatLevel === 'high') score -= 10;
      else if (securityScan.threatLevel === 'medium') score -= 5;
    }

    // Performance impact
    if (performanceScans && performanceScans.length > 0) {
      const latestPerformance = performanceScans[0];
      const perfScore = latestPerformance.pagespeedScore || 0;
      if (perfScore < 50) score -= 10;
      else if (perfScore < 70) score -= 5;
      else if (perfScore < 85) score -= 2;
    }
    
    return Math.max(score, 0);
  };

  const healthScore = calculateHealthScore();
  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return XCircle;
  };

  const HealthIcon = getHealthIcon(healthScore);

  const formatBytes = (bytes: string) => {
    if (!bytes) return 'N/A';
    const num = parseFloat(bytes.replace(/[^\d.]/g, ''));
    const unit = bytes.replace(/[\d.]/g, '').trim() || 'MB';
    return `${num.toFixed(1)} ${unit}`;
  };

  return (
    <Card className="shadow-md border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-green-600" />
          WordPress Health
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Score */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <HealthIcon className={`h-8 w-8 ${getHealthColor(healthScore)}`} />
            <span className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore}%
            </span>
          </div>
          <Badge className={getHealthBadgeColor(healthScore)}>
            {healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Needs Attention'}
          </Badge>
          <Progress value={healthScore} className="w-full" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4 text-blue-500" />
              WordPress
            </div>
            <div className="text-sm text-muted-foreground">
              v{wpData.systemInfo?.wordpress_version || 'N/A'}
              {wpData.updateData?.wordpress?.update_available && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Update Available
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-purple-500" />
              PHP
            </div>
            <div className="text-sm text-muted-foreground">
              v{wpData.systemInfo?.php_version || 'N/A'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-green-500" />
              MySQL
            </div>
            <div className="text-sm text-muted-foreground">
              v{wpData.systemInfo?.mysql_version || 'N/A'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="h-4 w-4 text-orange-500" />
              Memory
            </div>
            <div className="text-sm text-muted-foreground">
              {wpData.systemInfo?.memory_limit || 'N/A'}
            </div>
          </div>
        </div>

        {/* Updates Summary */}
        {((wpData.updateData?.count?.plugins || 0) > 0 || (wpData.updateData?.count?.themes || 0) > 0 || wpData.updateData?.wordpress?.update_available) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Available Updates
            </div>
            <div className="space-y-2">
              {wpData.updateData?.wordpress?.update_available && (
                <div className="flex items-center justify-between text-sm">
                  <span>WordPress Core</span>
                  <Badge variant="outline">v{wpData.updateData.wordpress.new_version}</Badge>
                </div>
              )}
              {(wpData.updateData?.count?.plugins || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Plugins</span>
                  <Badge variant="outline">{wpData.updateData.count.plugins} updates</Badge>
                </div>
              )}
              {(wpData.updateData?.count?.themes || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Themes</span>
                  <Badge variant="outline">{wpData.updateData.count.themes} updates</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security & Performance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-green-500" />
            Security & Performance
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Security Score:</span>
              <div className={`font-medium ${securityScan ? (securityScan.overallSecurityScore >= 80 ? 'text-green-600' : securityScan.overallSecurityScore >= 60 ? 'text-yellow-600' : 'text-red-600') : ''}`}>
                {securityScan ? `${securityScan.overallSecurityScore}%` : 'No scan'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">PageSpeed:</span>
              <div className={`font-medium ${performanceScans && performanceScans.length > 0 ? (performanceScans[0].pagespeedScore >= 80 ? 'text-green-600' : performanceScans[0].pagespeedScore >= 60 ? 'text-yellow-600' : 'text-red-600') : ''}`}>
                {performanceScans && performanceScans.length > 0 ? `${performanceScans[0].pagespeedScore}%` : 'No test'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Threat Level:</span>
              <div className={`font-medium capitalize ${securityScan ? (securityScan.threatLevel === 'low' ? 'text-green-600' : securityScan.threatLevel === 'medium' ? 'text-yellow-600' : 'text-red-600') : ''}`}>
                {securityScan ? securityScan.threatLevel || 'Unknown' : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Load Time:</span>
              <div className={`font-medium ${performanceScans && performanceScans.length > 0 ? (performanceScans[0].loadTime <= 2 ? 'text-green-600' : performanceScans[0].loadTime <= 4 ? 'text-yellow-600' : 'text-red-600') : ''}`}>
                {performanceScans && performanceScans.length > 0 ? `${performanceScans[0].loadTime || 'N/A'}s` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* System Performance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-yellow-500" />
            System Resources
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Max Execution:</span>
              <div className="font-medium">{wpData.systemInfo?.max_execution_time ? `${wpData.systemInfo.max_execution_time}s` : 'N/A'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Upload Limit:</span>
              <div className="font-medium">{wpData.systemInfo?.upload_max_filesize ? formatBytes(wpData.systemInfo.upload_max_filesize) : 'N/A'}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}