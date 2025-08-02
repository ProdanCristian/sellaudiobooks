import nodemailer from 'nodemailer';

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });
};

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    cid?: string;
  }>;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const transporter = createTransporter();

    // Verify SMTP connection
    await transporter.verify();

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || 'FacelessCut',
        address: process.env.SMTP_FROM_EMAIL || 'hello@facelesscut.com'
      },
      replyTo: process.env.SMTP_FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      headers: {
        'X-Mailer': 'FacelessCut',
        'X-Priority': '3',
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('SMTP Error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send email');
  }
};

// Test SMTP connection
export const testSMTPConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP connection successful' };
  } catch (error) {
    console.error('SMTP Connection Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
};

// Diagnostic information for troubleshooting sender issues
export const getSMTPDiagnostics = () => {
  const domain = process.env.SMTP_FROM_EMAIL?.split('@')[1];
  
  return {
    domain: domain,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    fromName: process.env.SMTP_FROM_NAME,
    smtpUser: process.env.SMTP_USER,
    userMatchesSender: process.env.SMTP_USER === process.env.SMTP_FROM_EMAIL,
    requiredDNSRecords: {
      spf: `v=spf1 include:_spf.google.com ~all`,
      dmarc: `v=DMARC1; p=quarantine; rua=mailto:admin@${domain}`,
      mx: `1 smtp.google.com.`
    },
    troubleshooting: [
      'Verify domain ownership in Google Workspace Admin Console',
      'Add SPF record to DNS: v=spf1 include:_spf.google.com ~all',
      'Enable DKIM signing in Google Workspace',
      'Add DMARC policy to DNS',
      'Ensure SMTP_USER matches SMTP_FROM_EMAIL',
      'Check if domain is properly configured in Google Workspace'
    ]
  };
}; 