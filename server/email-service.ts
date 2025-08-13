import { MailService } from '@sendgrid/mail';

// if (!process.env.SENDGRID_API_KEY) {
//   throw new Error("SENDGRID_API_KEY environment variable must be set");
// }

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  private static fromEmail = 'aiositecare@gmail.com'; // Verified sender email
  private static baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';

  static async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const emailData: any = {
        to: params.to,
        from: params.from,
        subject: params.subject,
      };
      
      if (params.text) emailData.text = params.text;
      if (params.html) emailData.html = params.html;
      
      await mailService.send(emailData);
      console.log(`Email sent successfully to ${params.to}`);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
    const subject = 'Welcome to AIO Webcare!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AIO Webcare</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to AIO Webcare!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Thank you for joining AIO Webcare - your comprehensive WordPress management platform!</p>
            
            <p>With AIO Webcare, you can:</p>
            <ul>
              <li>📊 Monitor website performance and security</li>
              <li>🔧 Manage WordPress updates and maintenance</li>
              <li>📈 Generate professional client reports</li>
              <li>🛡️ Perform security scans and SEO analysis</li>
            </ul>
            
            <p>Ready to get started? Log in to your dashboard and begin managing your WordPress sites like a pro!</p>
            
            <div style="text-align: center;">
              <a href="${this.baseUrl}/login" class="button">Get Started</a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>The AIO Webcare Team</p>
          </div>
          <div class="footer">
            <p>© 2025 AIO Webcare. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to AIO Webcare, ${firstName}!

Thank you for joining our comprehensive WordPress management platform!

With AIO Webcare, you can:
- Monitor website performance and security
- Manage WordPress updates and maintenance
- Generate professional client reports
- Perform security scans and SEO analysis

Get started: ${this.baseUrl}/login

Best regards,
The AIO Webcare Team
    `;

    return this.sendEmail({
      to: userEmail,
      from: this.fromEmail,
      subject,
      html,
      text,
    });
  }

  static async sendPasswordResetEmail(userEmail: string, firstName: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - AIO Webcare';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - AIO Webcare</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>We received a request to reset your password for your AIO Webcare account.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
            </div>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p><strong>This link will expire in 1 hour</strong> for security reasons.</p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">${resetUrl}</p>
            
            <p>If you continue to have trouble, contact our support team.</p>
            
            <p>Best regards,<br>The AIO Webcare Team</p>
          </div>
          <div class="footer">
            <p>© 2025 AIO Webcare. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Password Reset Request - AIO Webcare

Hello ${firstName}!

We received a request to reset your password for your AIO Webcare account.

If you didn't request this password reset, please ignore this email. Your account remains secure.

To reset your password, visit this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you continue to have trouble, contact our support team.

Best regards,
The AIO Webcare Team
    `;

    return this.sendEmail({
      to: userEmail,
      from: this.fromEmail,
      subject,
      html,
      text,
    });
  }
}