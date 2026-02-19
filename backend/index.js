const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// socket.io for real-time team chat
const io = new Server(server, {
    cors: { origin: '*' },
});
app.set('io', io);

app.use(cors());
app.use(express.json());

// connect to mongodb
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('connected to mongodb'))
    .catch(err => {
        console.log('db connection failed:', err.message);
        process.exit(1);
    });

app.get('/', (req, res) => {
    res.send('fest management api');
});

// reCAPTCHA v2 is handled client-side; verification happens in auth middleware

// routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/organizer', require('./routes/organizerRoutes'));
app.use('/api/participant', require('./routes/participantRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/password-reset', require('./routes/passwordResetRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// socket.io connection handling for team chat
io.on('connection', (socket) => {
    console.log('socket connected:', socket.id);

    socket.on('joinTeam', (teamId) => {
        socket.join(`team-${teamId}`);
        console.log(`socket ${socket.id} joined team-${teamId}`);
    });

    socket.on('leaveTeam', (teamId) => {
        socket.leave(`team-${teamId}`);
    });

    socket.on('disconnect', () => {
        console.log('socket disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`server running on port ${PORT}`));
