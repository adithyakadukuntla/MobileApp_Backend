const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Define Schema & Model
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  phone: String,
});
const User = mongoose.model("User", userSchema);

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
  useremail: { type: String, required: true },
});

const Event = mongoose.model("Event", eventSchema);

// API Route to Fetch Users
app.get("/user/:email", async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email });
  res.json(user);
});

app.put("/user/:email", async (req, res) => {
  //get the email fromparams and req .body of uer details and update the user with email
  const email = req.params.email;
  //using try and catc and send result
  try {
    const result = await User.findOneAndUpdate({ email }, req.body, { new: true });
    res.json(result);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user" });
  }
});

//api to chnage password
app.put("/userpassword/:email", async (req, res) => {
  //get the email fromparams and req .body of uer details and update the user with email
  const email = req.params.email;
  //using try and catc and send result
  try {
    const result = await User.findOneAndUpdate({ email }, { password: req.body.password }, { new: true });
    //console.log("result",result);
    res.json(result);
  } catch (error) {
    //console.log("Error updating password:", error);
    res.status(500).json({ error: "Error updating password" });
  }
});

// API Route to Add a User
app.post("/users", async (req, res) => {
  const newuser = req.body;
  try {
    //check the user exists before psting
    const userExists = await User.findOne({ email: newuser.email });
    if (userExists) return res.send({ message: "User already exists" });
    else {
      const newUser = new User(newuser);
      const result = await newUser.save();
      res.send({ message: "User created successfully", user: newUser });
    }
  } catch (error) {
    res.status(500).json({ error: "Error creating user" });
  }

});

// API Route to Fetch Events for a specific Auditorium
app.get("/events/:audiname", async (req, res) => {
  try {
    const audi = req.params.audiname;
    const events = await Event.find({ audi });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Error fetching events" });
  }
});

// Book an Event
app.post("/book", async (req, res) => {
  const { eventName, startDate, endDate, session, isBooked, bookedBy, audi, contact, additionalInfo, useremail } = req.body;
  try {
    const newBooking = new Event({ eventName, startDate, endDate, session, isBooked, bookedBy, audi, contact, additionalInfo, useremail });
    const result = await newBooking.save();
    res.json({ message: "Booking successful!", event: result });
  } catch (err) {
    console.error("Error booking event:", err);
    res.status(500).json({ error: "Error booking event" });
  }
});

//delete the event 
app.delete('/events/:id', async (req, res) => {
  const id = req.params.id;
  //console.log(id)

  try {
    await Event.findByIdAndDelete(id);
    res.json({ message: "Event deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting event" })
  }
})

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
