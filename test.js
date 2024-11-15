require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // Use TLS
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'your-email@gmail.com', // Test recipient email
            subject: "Test Email",
            text: "This is a test email from Nodemailer",
        };

        await transporter.sendMail(mailOptions);
        console.log("Test email sent successfully");
    } catch (error) {
        console.error("Error sending test email:", error);
    }
}

sendTestEmail();
