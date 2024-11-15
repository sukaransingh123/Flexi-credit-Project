require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const validator = require('validator');
console.log('MONGO_URI:', process.env.MONGO_URI); // Debugging line
const app = express();

// CORS Configuration
app.use(cors({
    origin: '*', // Allow requests from any origin (use with caution in production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Middleware to parse JSON data
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: [true, "Email is required"],
        validate: [validator.isEmail, "Invalid email format"],
    },
    password: { type: String, required: [true, "Password is required"] },
    fName: { type: String, required: [true, "First name is required"] },
    lName: { type: String, required: [true, "Last name is required"] },
    dob: { type: Date, required: [true, "Date of birth is required"] },
    country: { type: String, required: [true, "Country is required"] },
    gender: { type: String, required: [true, "Gender is required"] },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Routes
// Register User
app.post('/api/register', async (req, res) => {
    const { email, password, fName, lName, dob, country, gender } = req.body;

    try {
        // Validate Input Fields
        if (!email || !password || !fName || !lName || !dob || !country || !gender) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        // Check if User Already Exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email is already registered" });
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
        res.status(201).json({ success: true, message: "User registered successfully", userId: newUser._id });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        res.status(200).json({ success: true, message: "Login successful", userId: user._id });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});

// Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
