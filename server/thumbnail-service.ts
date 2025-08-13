import axios from 'axios';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { websites } from '../shared/schema.js';
import dotenv from 'dotenv';
dotenv.config();

export interface ThumbnailOptions {
  url: string;
  width?: number;
  height?: number;
  format?: 'png' | 'jpg' | 'webp';
  fullPage?: boolean;
  deviceScaleFactor?: number;
}

export interface ThumbnailResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

export class ThumbnailService {
  private static readonly SCREENSHOTONE_ACCESS_KEY = process.env.SCREENSHOTONE_ACCESS_KEY;
  private static readonly SCREENSHOTONE_SECRET_KEY = process.env.SCREENSHOTONE_SECRET_KEY;
  
  static async captureScreenshot(options: ThumbnailOptions): Promise<ThumbnailResult> {
    try {
      console.log(`[Thumbnail] Capturing screenshot for: ${options.url}`);
      
      // Clean and validate URL
      const cleanUrl = this.cleanUrl(options.url);
      if (!cleanUrl) {
        return { success: false, error: 'Invalid URL provided' };
      }

      // Try ScreenshotOne API first if we have credentials
      if (this.SCREENSHOTONE_ACCESS_KEY) {
        try {
          const screenshotUrl = await this.captureWithScreenshotOne(cleanUrl, options);
          return {
            success: true,
            thumbnailUrl: screenshotUrl
          };
        } catch (screenshotOneError) {
          console.warn('[Thumbnail] ScreenshotOne failed, using fallback:', screenshotOneError);
        }
      }

      // Fallback to WebThumbnail API
      try {
        const webThumbnailUrl = await this.captureWithWebThumbnail(cleanUrl, options);
        return {
          success: true,
          thumbnailUrl: webThumbnailUrl
        };
      } catch (webThumbnailError) {
        console.warn('[Thumbnail] WebThumbnail failed:', webThumbnailError);
      }

      // Final fallback to URL2PNG (may not work in production)
      const fallbackUrl = this.generateThumbnailUrl(cleanUrl, options);
      return {
        success: true,
        thumbnailUrl: fallbackUrl
      };

    } catch (error) {
      console.error('[Thumbnail] Error capturing screenshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static async captureWithScreenshotOne(url: string, options: ThumbnailOptions): Promise<string> {
    if (!this.SCREENSHOTONE_ACCESS_KEY) {
      throw new Error('ScreenshotOne access key not configured');
    }

    const params = new URLSearchParams({
      access_key: this.SCREENSHOTONE_ACCESS_KEY,
      url: url,
      viewport_width: (options.width || 1200).toString(),
      viewport_height: (options.height || 800).toString(),
      device_scale_factor: (options.deviceScaleFactor || 1).toString(),
      format: options.format || 'png',
      full_page: (options.fullPage || false).toString(),
      block_ads: 'true',
      block_cookie_banners: 'true',
      cache: 'true',
      cache_ttl: '86400' // 24 hours
    });

    const screenshotUrl = `https://api.screenshotone.com/take?${params.toString()}`;
    
    // Test if the URL is accessible
    const response = await axios.get(screenshotUrl, { 
      timeout: 15000,
      responseType: 'arraybuffer',
      validateStatus: (status) => status < 500
    });
    
    if (response.status >= 400) {
      const errorText = Buffer.from(response.data).toString();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    return screenshotUrl;
  }

  private static async captureWithWebThumbnail(url: string, options: ThumbnailOptions): Promise<string> {
    const width = options.width || 1200;
    const height = options.height || 800;
    
    // WebThumbnail is a more reliable alternative to URL2PNG
    return `https://webthumbnail.org/api/?width=${width}&height=${height}&screen=1280&url=${encodeURIComponent(url)}`;
  }

  private static cleanUrl(url: string): string | null {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Validate URL
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return null;
    }
  }

  private static generateThumbnailUrl(url: string, options: ThumbnailOptions): string {
    // Fallback to URL2PNG (may not work in production)
    const width = options.width || 1200;
    const height = options.height || 800;
    return `https://api.url2png.com/v6/P4DE4C-55D9C7/png/?thumbnail_max_width=${width}&thumbnail_max_height=${height}&url=${encodeURIComponent(url)}`;
  }

  static async refreshThumbnail(websiteId: number, url: string): Promise<ThumbnailResult> {
    console.log(`[Thumbnail] Refreshing thumbnail for website ${websiteId}`);
    
    return this.captureScreenshot({
      url,
      width: 1200,
      height: 800,
      format: 'png',
      fullPage: false,
      deviceScaleFactor: 1
    });
  }
}