const nodemailer = require('nodemailer');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Send team invitation email
const sendTeamInviteEmail = async (to, teamName, inviterName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: `You've been invited to join ${teamName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Team Invitation</h2>
        <p>Hello,</p>
        <p>${inviterName} has invited you to join their team "${teamName}" on our platform.</p>
        <p>Click the button below to accept the invitation and start collaborating:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/teams" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Team invitation email sent to ${to}`);
  } catch (error) {
    console.error('Error sending team invitation email:', error);
    throw error;
  }
};

module.exports = {
  sendTeamInviteEmail
}; 