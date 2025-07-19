import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
  ): Promise<void> {
    // TODO: Implement email sending using SMTP configuration
    console.log(
      `Sending password reset email to ${email} with link: ${resetLink}`,
    );

    // This is where you would integrate with your email service
    // For example, using nodemailer or another email service

    // const mailOptions = {
    //   from: 'noreply@simonair.com',
    //   to: email,
    //   subject: 'Reset Your Password',
    //   html: `
    //     <h2>Password Reset Request</h2>
    //     <p>You requested to reset your password. Click the link below to reset it:</p>
    //     <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    //     <p>This link will expire in 1 hour.</p>
    //     <p>If you didn't request this, please ignore this email.</p>
    //   `
    // };
  }

  async sendPasswordChangedEmail(email: string): Promise<void> {
    // TODO: Implement email sending
    console.log(`Sending password changed notification to ${email}`);

    // const mailOptions = {
    //   from: 'noreply@simonair.com',
    //   to: email,
    //   subject: 'Your Password Has Been Changed',
    //   html: `
    //     <h2>Password Changed</h2>
    //     <p>Your password has been successfully changed.</p>
    //     <p>If you didn't make this change, please contact support immediately.</p>
    //   `
    // };
  }

  async sendVerificationEmail(
    email: string,
    verificationLink: string,
  ): Promise<void> {
    // TODO: Implement email sending
    console.log(
      `Sending verification email to ${email} with link: ${verificationLink}`,
    );

    // const mailOptions = {
    //   from: 'noreply@simonair.com',
    //   to: email,
    //   subject: 'Verify Your Email',
    //   html: `
    //     <h2>Email Verification</h2>
    //     <p>Please verify your email address by clicking the link below:</p>
    //     <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
    //     <p>If you didn't create an account, please ignore this email.</p>
    //   `
    // };
  }
}
