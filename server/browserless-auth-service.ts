import { BrowserlessService } from './browserless-service';
import { TEST_USER } from './auth-bypass';

interface AuthenticatedBrowserOptions {
  viewport?: { width: number; height: number };
  userAgent?: string;
  bypassAuth?: boolean;
  sessionData?: any;
  timeout?: number;
}

export class BrowserlessAuthService extends BrowserlessService {
  private appBaseUrl: string;

  constructor(config?: any) {
    super(config);
    this.appBaseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : 'http://localhost:5000';
  }

  // Take authenticated screenshot using session injection
  public async takeAuthenticatedScreenshot(
    path: string = '/',
    options: AuthenticatedBrowserOptions = {}
  ): Promise<{ screenshot: string; timestamp: string; metadata: any }> {
    const browser = await this.getPlaywrightBrowser();
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1920, height: 1080 },
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; Playwright Testing Bot)'
    });
    
    const page = await context.newPage();

    try {
      console.log(`📸 Taking authenticated screenshot of ${path}`);
      
      // Set authentication bypass header
      await page.setExtraHTTPHeaders({
        'x-test-auth-bypass': 'true',
        'x-testing-mode': 'true'
      });

      const fullUrl = `${this.appBaseUrl}${path}`;
      await page.goto(fullUrl, { waitUntil: 'networkidle' });

      // Wait for authenticated content to load
      try {
        await page.waitForSelector('[data-testid="authenticated-content"]', { timeout: 5000 });
      } catch {
        console.log('⚠️ No authenticated content marker found, proceeding anyway');
      }

      const screenshot = await page.screenshot({ 
        fullPage: options.bypassAuth !== false,
        type: 'png'
      });

      const base64Image = Buffer.from(screenshot).toString('base64');
      const metadata = {
        url: page.url(),
        title: await page.title(),
        viewportSize: await page.viewportSize(),
        user: TEST_USER
      };

      return {
        screenshot: `data:image/png;base64,${base64Image}`,
        timestamp: new Date().toISOString(),
        metadata
      };
    } finally {
      await context.close();
    }
  }

  // Take authenticated PDF using session injection
  public async generateAuthenticatedPDF(
    path: string = '/',
    options: AuthenticatedBrowserOptions = {}
  ): Promise<{ pdf: string; timestamp: string; metadata: any }> {
    const browser = await this.getPlaywrightBrowser();
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();

    try {
      console.log(`📄 Generating authenticated PDF of ${path}`);
      
      // Set authentication bypass header
      await page.setExtraHTTPHeaders({
        'x-test-auth-bypass': 'true',
        'x-testing-mode': 'true'
      });

      const fullUrl = `${this.appBaseUrl}${path}`;
      await page.goto(fullUrl, { waitUntil: 'networkidle' });

      // Wait for authenticated content to load
      try {
        await page.waitForSelector('[data-testid="authenticated-content"]', { timeout: 5000 });
      } catch {
        console.log('⚠️ No authenticated content marker found, proceeding anyway');
      }

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
      });

      const base64PDF = Buffer.from(pdf).toString('base64');
      const metadata = {
        url: page.url(),
        title: await page.title(),
        user: TEST_USER
      };

      return {
        pdf: `data:application/pdf;base64,${base64PDF}`,
        timestamp: new Date().toISOString(),
        metadata
      };
    } finally {
      await context.close();
    }
  }

  // Test user flows with authentication
  public async testUserFlow(
    flowSteps: Array<{
      action: 'goto' | 'click' | 'fill' | 'screenshot' | 'wait';
      selector?: string;
      value?: string;
      path?: string;
      timeout?: number;
    }>,
    options: AuthenticatedBrowserOptions = {}
  ): Promise<{ success: boolean; screenshots: string[]; logs: string[]; timestamp: string }> {
    const browser = await this.getPlaywrightBrowser();
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    const screenshots: string[] = [];
    const logs: string[] = [];

    try {
      console.log('🎭 Starting authenticated user flow test');
      
      // Set authentication bypass header
      await page.setExtraHTTPHeaders({
        'x-test-auth-bypass': 'true',
        'x-testing-mode': 'true'
      });

      for (const [index, step] of flowSteps.entries()) {
        logs.push(`Step ${index + 1}: ${step.action}`);
        
        switch (step.action) {
          case 'goto':
            const fullUrl = `${this.appBaseUrl}${step.path || '/'}`;
            await page.goto(fullUrl, { waitUntil: 'networkidle' });
            logs.push(`Navigated to ${fullUrl}`);
            break;
            
          case 'click':
            if (step.selector) {
              await page.click(step.selector);
              logs.push(`Clicked ${step.selector}`);
            }
            break;
            
          case 'fill':
            if (step.selector && step.value) {
              await page.fill(step.selector, step.value);
              logs.push(`Filled ${step.selector} with value`);
            }
            break;
            
          case 'screenshot':
            const screenshot = await page.screenshot({ fullPage: true });
            const base64Image = Buffer.from(screenshot).toString('base64');
            screenshots.push(`data:image/png;base64,${base64Image}`);
            logs.push(`Screenshot taken`);
            break;
            
          case 'wait':
            if (step.selector) {
              await page.waitForSelector(step.selector, { timeout: step.timeout || 30000 });
              logs.push(`Waited for ${step.selector}`);
            } else {
              await page.waitForTimeout(step.timeout || 1000);
              logs.push(`Waited ${step.timeout || 1000}ms`);
            }
            break;
        }
      }

      return {
        success: true,
        screenshots,
        logs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ User flow test failed:', error);
      return {
        success: false,
        screenshots,
        logs: [...logs, `Error: ${error}`],
        timestamp: new Date().toISOString()
      };
    } finally {
      await context.close();
    }
  }

  // Scrape authenticated content
  public async scrapeAuthenticatedContent(
    path: string,
    selectors: string[] = [],
    options: AuthenticatedBrowserOptions = {}
  ): Promise<{ data: any; timestamp: string; metadata: any }> {
    const browser = await this.getPlaywrightBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log(`🕷️ Scraping authenticated content from ${path}`);
      
      // Set authentication bypass header
      await page.setExtraHTTPHeaders({
        'x-test-auth-bypass': 'true',
        'x-testing-mode': 'true'
      });

      const fullUrl = `${this.appBaseUrl}${path}`;
      await page.goto(fullUrl, { waitUntil: 'networkidle' });

      // Wait for authenticated content
      try {
        await page.waitForSelector('[data-testid="authenticated-content"]', { timeout: 5000 });
      } catch {
        console.log('⚠️ No authenticated content marker found');
      }

      const data: any = {};

      // Extract content from specified selectors
      for (const selector of selectors) {
        try {
          const elements = await page.locator(selector).allTextContents();
          data[selector] = elements;
        } catch (error) {
          data[selector] = `Error: ${error}`;
        }
      }

      // Extract general page info
      data.title = await page.title();
      data.url = page.url();
      data.userInfo = await this.extractUserInfo(page);

      const metadata = {
        url: page.url(),
        title: await page.title(),
        authenticated: true,
        user: TEST_USER
      };

      return {
        data,
        timestamp: new Date().toISOString(),
        metadata
      };
    } finally {
      await context.close();
    }
  }

  private async extractUserInfo(page: any): Promise<any> {
    try {
      // Try to extract user info from common selectors
      const userInfo: any = {};
      
      const selectors = [
        '[data-testid="user-avatar"]',
        '[data-testid="user-name"]',
        '[data-testid="energy-display"]',
        '[data-testid="aura-level"]'
      ];

      for (const selector of selectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible()) {
            userInfo[selector] = await element.textContent();
          }
        } catch {
          // Selector not found, continue
        }
      }

      return userInfo;
    } catch {
      return {};
    }
  }
}