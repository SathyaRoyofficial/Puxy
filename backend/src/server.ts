import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import cloudinary from './cloudinary';
import multer from 'multer';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const upload = multer({ dest: 'uploads/' });

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Puxy backend is running' });
});

// Endpoint to verify user and create a room
app.post('/api/rooms', async (req, res) => {
  try {
    const { userId } = req.body; // clerk userId
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Upsert User
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: `${userId}@puxy.internal` }, // Simplified for prototype
      });
    }

    const room = await prisma.room.create({
      data: {
        participants: {
          create: { userId: user.id }
        }
      }
    });

    const invite = await prisma.invite.create({
      data: {
        roomId: room.id,
        token: `inv_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
      }
    });

    res.json({ room, inviteLink: `${process.env.FRONTEND_URL}/join/${invite.token}` });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room', details: error.message || String(error) });
  }
});

// Endpoint to join a room via invite token
app.post('/api/join/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { userId } = req.body;
    
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    const room = await prisma.room.findUnique({
      where: { id: invite.roomId },
      include: { participants: true }
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.locked || room.participants.length >= 2) {
      return res.status(403).json({ error: 'Room is full or locked' });
    }

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: `${userId}@puxy.internal` },
      });
    }

    // Add user to room if not already in it
    const existingParticipant = room.participants.find(p => p.userId === user?.id);
    if (!existingParticipant) {
      await prisma.roomParticipant.create({
        data: { roomId: room.id, userId: user.id }
      });
      // If this is the second person, lock the room
      if (room.participants.length === 1) {
        await prisma.room.update({
          where: { id: room.id },
          data: { locked: true }
        });
      }
    }

    res.json({ roomId: room.id });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join room', details: error.message || String(error) });
  }
});

// Endpoint for media upload
app.post('/api/media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'puxy',
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Media upload failed' });
  }
});

// Endpoint to fetch active rooms for a user
app.get('/api/rooms/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return res.json({ rooms: [] });

    // Find all rooms where the user is a participant
    const rooms = await prisma.room.findMany({
      where: {
        participants: {
          some: { userId: user.id }
        }
      },
      include: {
        participants: true,
        invites: {
          where: { expiresAt: { gt: new Date() } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format the response to include the invite link if available
    const activeRooms = rooms.map(room => ({
      id: room.id,
      locked: room.locked,
      participantCount: room.participants.length,
      createdAt: room.createdAt,
      inviteLink: room.invites.length > 0 ? `${process.env.FRONTEND_URL}/join/${room.invites[0].token}` : null
    }));

    res.json({ rooms: activeRooms });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms', details: error.message || String(error) });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', async ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
    
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true }
    });

    if (room) {
      io.to(roomId).emit('roomData', { participantCount: room.participants.length });
    }

    // Fetch previous messages
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true }
    });
    
    socket.emit('previousMessages', messages);
  });

  socket.on('sendMessage', async (data) => {
    const { roomId, userId, text, type = 'TEXT', isSecret = false } = data;
    try {
      // Create message in DB
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (user) {
        const message = await prisma.message.create({
          data: {
            roomId,
            senderId: user.id,
            content: text,
            type,
            isSecret,
          },
          include: { sender: true }
        });
        
        io.to(roomId).emit('newMessage', message);
      }
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
