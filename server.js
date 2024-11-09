const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();  // To use environment variables

const app = express();

// Enable CORS for requests coming from the frontend (http://127.0.0.1:3000)
// You can modify this to allow requests from other domains in the future
app.use(cors({
    origin: 'http://127.0.0.1:3000',  // Allow requests only from this domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Allow certain HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],  // Allow certain headers
}));

// Middleware to parse JSON data
app.use(express.json());

// MongoDB connection URI (use environment variable for security)
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://raghavdhootbtech2023:Rajesh2738@nikedatabase.jex5x.mongodb.net/NikeDB?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(mongoURI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Create a user schema
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    fName: { type: String, required: true },
    lName: { type: String, required: true },
    dob: { type: Date, required: true },
    country: { type: String, required: true },
    gender: { type: String, required: true }
});

// Create a model based on the schema
const User = mongoose.model('User', userSchema);

// Register route
app.post('/api/register', async (req, res) => {
    const { email, password, fName, lName, dob, country, gender } = req.body;

    try {
        // Validate input fields
        if (!email || !password || !fName || !lName || !dob || !country || !gender) {
            return res.status(400).json({ success: false, message: "Please fill in all fields!" });
        }

        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists!" });
        }

        // Password length validation (optional but recommended)
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            email,
            password: hashedPassword,
            fName,
            lName,
            dob,
            country,
            gender
        });

        // Save the new user to the database
        await newUser.save();

        // Return success message
        res.status(201).json({ success: true, message: "User registered successfully!" });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: "An error occurred during registration. Please try again." });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Your login logic here
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials!" });
        }

        res.status(200).json({ success: true, message: "Login successful!" });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
});


// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

