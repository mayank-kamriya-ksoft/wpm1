// utils/pluginHelpers.ts
export const getPluginIdentifier = (pluginData: any): string => {
  // Priority order for finding the plugin path
  const possibleKeys = [
    'plugin', // Standard WordPress format (plugin-dir/plugin-file.php)
    'plugin_file', // Alternate key some APIs use
    'slug' // Fallback to slug if others don't exist
  ];

  for (const key of possibleKeys) {
    if (pluginData[key] && typeof pluginData[key] === 'string') {
      // Ensure the format matches plugin-dir/plugin-file.php
      const value = pluginData[key];
      if (value.includes('/')) {
        return value;
      }
      // If we have a slug, try to construct the path
      if (key === 'slug') {
        return `${value}/${value}.php`;
      }
    }
  }

  // Final fallback - shouldn't happen with proper WordPress data
  console.warn('Could not determine proper plugin identifier', pluginData);
  return pluginData.slug || pluginData.name || 'unknown-plugin';
};