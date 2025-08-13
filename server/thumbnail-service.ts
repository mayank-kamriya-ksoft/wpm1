import axios from 'axios';
import { eq } from 'drizzle-orm';
import { db } from './db.js';
import { websites } from '../shared/schema.js';
import dotenv from 'dotenv'
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
  private static readonly SCREENSHOTONE_ACCESS_KEY = process.env.SCREENSHOTONE_ACCESS_KEY || (() => {
    console.log(`[Thumbnail] Current NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[Thumbnail] Available env vars: ${JSON.stringify(process.env, null, 2)}`);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SCREENSHOTONE_ACCESS_KEY environment variable is required in production');
    }
    console.warn('⚠️  WARNING: Using fallback screenshot service key in development');
    return 'hHY5I29lGy78hg'; // Fallback for dev
  })();
  private static readonly SCREENSHOTONE_SECRET_KEY = process.env.SCREENSHOTONE_SECRET_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SCREENSHOTONE_SECRET_KEY environment variable is required in production');
    }
    return 'sf5Q_4W0wKVTDw'; // Fallback for dev
  })();
  
  static async captureScreenshot(options: ThumbnailOptions): Promise<ThumbnailResult> {
    try {
      console.log(`[Thumbnail] Capturing screenshot for: ${options.url}`);
      console.log(`[Thumbnail] Using access key: ${this.SCREENSHOTONE_ACCESS_KEY.substring(0, 4)}...`);
      
      // Clean and validate URL
      const cleanUrl = this.cleanUrl(options.url);
      if (!cleanUrl) {
        return { success: false, error: 'Invalid URL provided' };
      }

      // Try ScreenshotOne API first, then fallback to alternative service
      try {
        const screenshotUrl = await this.captureWithScreenshotOne(cleanUrl, options);
        return {
          success: true,
          thumbnailUrl: screenshotUrl
        };
      } catch (screenshotOneError) {
        const errorMessage = screenshotOneError instanceof Error ? screenshotOneError.message : 'Unknown error';
        console.warn('[Thumbnail] ScreenshotOne failed, using fallback:', errorMessage);
        
        // Fallback to URL2PNG
        const fallbackUrl = this.generateThumbnailUrl(cleanUrl, options);
        return {
          success: true,
          thumbnailUrl: fallbackUrl
        };
      }
    } catch (error) {
      console.error('[Thumbnail] Error capturing screenshot:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static async captureWithScreenshotOne(url: string, options: ThumbnailOptions): Promise<string> {
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
    
    console.log(`[Thumbnail] Testing screenshot URL: ${screenshotUrl.substring(0, 100)}...`);
    
    // Test if the URL is accessible by making a GET request to check for errors
    try {
      const response = await axios.get(screenshotUrl, { 
        timeout: 15000,
        responseType: 'arraybuffer',
        validateStatus: (status) => status < 500 // Accept 4xx errors to see what's wrong
      });
      
      console.log(`[Thumbnail] Screenshot API responded with status: ${response.status}`);
      
      if (response.status >= 400) {
        const errorText = Buffer.from(response.data).toString();
        console.error('[Thumbnail] API Error Response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      
      return screenshotUrl;
    } catch (error) {
      console.error('[Thumbnail] Screenshot API error details:', {
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        url: screenshotUrl,
        errorMessage: (error as Error).message,
        stack: (error as Error).stack
      });
      throw new Error(`Failed to capture screenshot: ${(error as any) instanceof Error ? (error as any).message : 'Unknown error'}`);
    }
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
    // Use URL2PNG which is reliable and works well
    const cleanUrl = url.replace(/^https?:\/\//, '');
    const width = options.width || 1200;
    const height = options.height || 800;
    
    // Use url2png.com API (has free tier)
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