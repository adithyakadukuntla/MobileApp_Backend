import express, { Request, Response, Application } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app: Application = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Define Schema & Model
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
const User = mongoose.model("User", userSchema);

// Event Schema
// Event Schema
const eventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    startDate: { type: String, required: true }, // Start date of the event
    endDate: { type: String, required: true },   // End date of the event
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
    const user = await User.findOne({ email });
    res.json(user);
});

// API Route to Add a User
app.post("/users", async (req: Request, res: Response) => {
    const { name, email } = req.body;
    const newUser = new User({ name, email });
    await newUser.save();
    res.json(newUser);
});

// API Route to Fetch Events for a specific Auditorium
app.get("/events/:audiname", async (req: Request, res: Response) => {
    try {
        const audi: string = req.params.audiname;
        const events = await Event.find({ audi });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Error fetching events" });
    }
});

// Book an Event
app.post("/book", async (req: Request, res: Response) => {
    const { eventName, startDate,endDate, session, isBooked, bookedBy, audi, contact, additionalInfo } = req.body;
  //console.log("event",req.body)
    try {
      const newBooking = new Event({ eventName, startDate,endDate, session, isBooked, bookedBy, audi, contact, additionalInfo });
      const result = await newBooking.save();
      res.json({ message: "Booking successful!", event: result });
    } catch (err) {
      console.error("Error booking event:", err); // Log the error
      res.status(500).json({ error: "Error booking event" });
    }
  });
      

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  