import express, { Request, Response, Application } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app: Application = express();
app.use(express.json());
app.use(cors());

// Check for environment variables
if (!process.env.MONGO_URI) {
    console.error("Error: MONGO_URI is not defined in .env file");
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => {
        console.error("MongoDB connection failed", err);
        process.exit(1);  // Exit the process if MongoDB fails to connect
    });

// Define Schema & Model
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
const User = mongoose.model("User", userSchema);

// Event Schema
const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    session: { type: String, enum: ["Morning", "Afternoon", "Full Day"], required: true },
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: String, required: true },
    contact: { type: String, required: true },
    additionalInfo: { type: String, required: true },
    audi: { type: String, required: true },
});

const Event = mongoose.model("Event", eventSchema);

// API Route to Fetch Users
app.get("/user/:email", async (req: Request, res: Response) => {
    const email: string = req.params.email;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("Error fetching user", error);
        res.status(500).json({ error: "Error fetching user" });
    }
});

// API Route to Add a User
app.post("/users", async (req: Request, res: Response) => {
    const { name, email } = req.body;
    try {
        const newUser = new User({ name, email });
        await newUser.save();
        res.json(newUser);
    } catch (error) {
        console.error("Error adding user", error);
        res.status(500).json({ error: "Error adding user" });
    }
});

// API Route to Fetch Events for a specific Auditorium
app.get("/events/:audiname", async (req: Request, res: Response) => {
    try {
        const audi: string = req.params.audiname;
        const events = await Event.find({ audi });
        if (!events.length) {
            return res.status(404).json({ error: "No events found" });
        }
        res.json(events);
    } catch (error) {
        console.error("Error fetching events", error);
        res.status(500).json({ error: "Error fetching events" });
    }
});

// Book an Event
app.post("/book", async (req: Request, res: Response) => {
    const { eventName, startDate, endDate, session, isBooked, bookedBy, audi, contact, additionalInfo } = req.body;
    try {
        const newBooking = new Event({ eventName, startDate, endDate, session, isBooked, bookedBy, audi, contact, additionalInfo });
        const result = await newBooking.save();
        res.json({ message: "Booking successful!", event: result });
    } catch (err) {
        console.error("Error booking event:", err);
        res.status(500).json({ error: "Error booking event" });
    }
});

// Start Server
const PORT = Number(process.env.PORT) || 5000; // Convert to number

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
});
