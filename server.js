const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv").config();
const http = require("http");
// const blogRoutes=require('./routes/blog')
// Initialize Express app
const app = express();

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.io
const { Server } = require("socket.io");
const io = new Server(httpServer, {
  cors: {
    origin: "*",  // Allow frontend connections
    methods: ["GET", "POST"]
  }
});


// Middleware
app.use(cors());
app.use(express.json()); 
// app.use(express.static("public"));
// app.use("/blog", blogRoutes);

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
//Messages Schema
const MessageSchema = new mongoose.Schema({
  sender: { type: String },
  receiver: { type: String,  },
  message: { type: String,  },
  image: { type: String},
  chatType: { type: String, enum: ["team", "private"]  }, 
  time: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", MessageSchema);



// Socket.io Event Listeners
io.on("connection", (socket) => {
  //console.log(`User connected: ${socket.id}`);
   // Join a "team chat" room
   socket.on("join_team_chat", () => {
    socket.join("team_chat"); // Users join the same room for team chat
    //console.log(`User ${socket.id} joined team chat`);
  });

  // Listen for team messages
  socket.on("join_team_chat", async () => {
    //console.log("User joined team chat");

    // Fetch past messages from DB
    try {
      const pastMessages = await Message.find({ receiver: "team" }).sort({ time: 1 });

      // Send past messages only to the newly joined user
      socket.emit("past_team_messages", pastMessages);
    } catch (err) {
      console.error("Error fetching past messages:", err);
    }
  });

  socket.on("team_message", async (data) => {
    io.to("team_chat").emit("team_message", data);
  
    // Save the message in DB
    try {
      const newMessage = new Message({
        sender: data.sender,
        receiver: "team",
        message: data.message,
        time: data.time,
      });
      await newMessage.save();
    } catch (err) {
      console.error("Error saving team message:", err);
    }
  });
  
  // Listen for messages
  socket.on("message", async (data) => {
    const { sender, receiver, message } = data;

    // Save message in DB
    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();

    // Send message to the receiver in real-time
    io.emit(`message_${receiver}`, { sender, receiver, message, time: newMessage.time });

    // Notify receiver
    io.emit(`notification_${receiver}`, { sender, message: "You have a new message" });
  });

  socket.on("team_message", async (msgData) => {
    const newMessage = new Message({ ...msgData, chatType: "team" });
    await newMessage.save();
  
    io.emit("team_message", msgData); // Broadcast only team messages
  });
  socket.on("team_message", async (data) => {
  io.emit("new_team_message", data); // Emit globally (so all users get it)

  // Save message in DB
  try {
    const newMessage = new Message({
      sender: data.sender,
      receiver: "team",
      message: data.message,
      time: data.time,
    });
    await newMessage.save();
  } catch (err) {
    console.error("Error saving team message:", err);
  }
});

  

  socket.on("disconnect", () => {
    //console.log(`User disconnected: ${socket.id}`);
  });
});

// API to fetch previous messages
app.get("/messages/:sender/:receiver", async (req, res) => {
  const { sender, receiver } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    }).sort({ time: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//delete all messages 
app.delete("/messages/:sender/:receiver", async (req, res) => {
  const { sender, receiver } = req.params;
  try {
    const messages = await Message.deleteMany({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    })

    res.json({ success: true, message: "Chat deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//delete selected messages 
app.delete("/messages", async (req, res) => {
  const { messageIds } = req.body; // Expect an array of message IDs
console.log(messageIds);
console.log("djujw",req.body)
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, message: "No messages selected for deletion." });
  }

  try {
    await Message.deleteMany({ _id: { $in: messageIds } });

    res.json({ success: true, message: "Selected messages deleted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/messages/team", async (req, res) => {
  const teamMessages = await Message.find({ chatType: "team" }).sort({ time: 1 });
  res.json(teamMessages);
});


app.get('/version',async(req,res)=>{
  try {
    const version = require('./version.json');
    //console.log(version);
    res.json({ version });
  } catch (error) {
    res.status(500).json({ error: "Error fetching version" });
  }
})





// API Route to Fetch Users
app.get("/user/:email", async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email });
  // console.log(user)
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

//get all users 

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
   // console.log(users.length);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
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
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
