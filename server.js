require('dotenv').config();
console.log("Email User:", process.env.EMAIL_USER); // Check if EMAIL_USER is correctly loaded
console.log("Email Pass:", process.env.EMAIL_PASS); // Check if EMAIL_PASS is correctly loaded

const nodemailer = require('nodemailer');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const validator = require('validator');
const app = express();

console.log('MONGO_URI:', process.env.MONGO_URI); // Debugging line

// CORS Configuration

app.use(
    cors({
        origin: '*', // Allows any origin
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);


// Middleware to parse JSON data
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
mongoose
    .connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            required: [true, 'Email is required'],
            validate: [validator.isEmail, 'Invalid email format'],
        },
        password: { type: String, required: [true, 'Password is required'] },
        fName: { type: String, required: [true, 'First name is required'] },
        lName: { type: String, required: [true, 'Last name is required'] },
        dob: { type: Date, required: [true, 'Date of birth is required'] },
        country: { type: String, required: [true, 'Country is required'] },
        gender: { type: String, required: [true, 'Gender is required'] },
        resetCode: { type: String }, // Store reset code
    resetCodeExpiry: { type: Date }, // Store reset code expiration time
    },
    { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Recipient Schema and Model for Storing Emails
const recipientSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, validate: [validator.isEmail, 'Invalid email format'] },
        name: { type: String },
        status: { type: String, default: 'active' }, // Manage active/inactive emails
    },
    { timestamps: true }
);

const Recipient = mongoose.model('Recipient', recipientSchema);

// Routes
// Register User
app.post('/api/register', async (req, res) => {
    const { email, password, fName, lName, dob, country, gender } = req.body;

    try {
        // Validate Input Fields
        if (!email || !password || !fName || !lName || !dob || !country || !gender) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        // Check if User Already Exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email is already registered' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save New User
        const newUser = new User({
            email,
            password: hashedPassword,
            fName,
            lName,
            dob,
            country,
            gender,
        });

        await newUser.save();
        res.status(201).json({ success: true, message: 'User registered successfully', userId: newUser._id });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.status(200).json({ success: true, message: 'Login successful', userId: user._id });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// Add Recipient
app.post('/api/add-recipient', async (req, res) => {
    const { email, name } = req.body;

    try {
        const newRecipient = new Recipient({ email, name });
        await newRecipient.save();
        res.status(201).json({ success: true, message: 'Recipient added successfully' });
    } catch (error) {
        console.error('Error adding recipient:', error);
        res.status(500).json({ success: false, message: 'Failed to add recipient' });
    }
});

// Send Email to a Single Recipient
const crypto = require('crypto'); // To generate secure random codes

app.post('/send-email', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "Email not found" });
        }

        // Generate reset code and expiration
        const resetCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);

        // Save reset code and expiry to the database
        user.resetCode = resetCode;
        user.resetCodeExpiry = resetCodeExpiry;
        await user.save();

        console.log("Generated Reset Code:", resetCode); // Debug log

        // Create email content
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
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
            to: email,
            subject: "Password Reset Code",
            text: `Your password reset code is: ${resetCode}. It will expire in 15 minutes.`,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log("Reset email sent successfully to:", email);

        res.status(200).json({ success: true, message: "Reset code sent successfully" });
    } catch (error) {
        console.error("Error in /send-email route:", error);
        res.status(500).json({ success: false, message: "Failed to send reset email" });
    }
});



app.post('/send-bulk-email', async (req, res) => {
    const { subject, message } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ success: false, message: "Subject and message are required" });
    }

    try {
        const recipients = await Recipient.find({ status: 'active' });
        if (!recipients.length) {
            return res.status(404).json({ success: false, message: "No active recipients found" });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const emailPromises = recipients.map((recipient) => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: recipient.email,
                subject,
                text: message,
            };
            return transporter.sendMail(mailOptions);
        });

        await Promise.all(emailPromises);
        console.log(`Bulk email sent to ${recipients.length} recipients.`);
        res.status(200).json({ success: true, message: "Bulk email sent successfully" });
    } catch (error) {
        console.error("Error sending bulk emails:", error);
        res.status(500).json({ success: false, message: "Failed to send bulk emails" });
    }
});


app.post('/api/reset-password', async (req, res) => {
    const { code, newPassword } = req.body;

    try {
        // Find user with the reset code
        const user = await User.findOne({ resetCode: code });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid reset code" });
        }

        // Check if the reset code is expired
        if (user.resetCodeExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: "Reset code expired" });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password and clear the reset code
        user.password = hashedPassword;
        user.resetCode = undefined;
        user.resetCodeExpiry = undefined;
        await user.save();

        res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ success: false, message: "Failed to reset password" });
    }
});

// Fetch user email by userId
app.get('/api/get-user-email', async (req, res) => {
    const { userId } = req.query; // Get the userId from the query parameters

    try {
        // Find the user by ID in MongoDB
        const user = await User.findById(userId).select('email');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, email: user.email });
    } catch (error) {
        console.error('Error fetching user email:', error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});


// Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
