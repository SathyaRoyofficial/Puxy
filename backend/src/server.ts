import express, { Request, Response } from 'express';
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
    methods: ['GET', 'POST', 'DELETE'],
  },
});

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const upload = multer({ dest: 'uploads/' });

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
}));
app.use(express.json());

// ─── In-memory tracking ──────────────────────────────────────────────────────
// Map<userId, { socketId, lastSeen }>
const onlineUsers = new Map<string, { socketId: string; lastSeen: Date }>();
// Map<roomId, Set<socketId>>
const roomSockets = new Map<string, Set<string>>();

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Puxy backend is running' });
});

// ─── Create Room ──────────────────────────────────────────────────────────────
app.post('/api/rooms', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: `${userId}@puxy.internal` },
      });
    }

    // Room expires 24 hours from now
    const roomExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const room = await prisma.room.create({
      data: {
        expiresAt: roomExpiresAt,
        participants: {
          create: { userId: user.id }
        }
      }
    });

    // Invite expires in 4 hours
    const invite = await prisma.invite.create({
      data: {
        roomId: room.id,
        token: `inv_${Math.random().toString(36).substr(2, 12)}`,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      }
    });

    res.json({
      room,
      inviteLink: `${process.env.FRONTEND_URL}/join/${invite.token}`,
      inviteToken: invite.token,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room', details: error.message || String(error) });
  }
});

// ─── Get Active Rooms for User ────────────────────────────────────────────────
app.get('/api/rooms/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return res.json({ rooms: [] });

    const rooms = await prisma.room.findMany({
      where: {
        participants: { some: { userId: user.id } },
        // Only show non-expired rooms
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ]
      },
      include: {
        participants: true,
        invites: { orderBy: { expiresAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' }
    });

    const activeRooms = rooms.map(room => ({
      id: room.id,
      locked: room.locked,
      participantCount: room.participants.length,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      // Always include invite link if one exists (even for locked rooms)
      inviteLink: room.invites.length > 0 && room.invites[0].expiresAt > new Date()
        ? `${process.env.FRONTEND_URL}/join/${room.invites[0].token}`
        : null,
    }));

    res.json({ rooms: activeRooms });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms', details: error.message || String(error) });
  }
});

// ─── Join Room via Invite Token ───────────────────────────────────────────────
app.post('/api/join/:token', async (req: Request, res: Response) => {
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
    if (room.participants.length >= 2) {
      return res.status(403).json({ error: 'Room is full' });
    }

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: `${userId}@puxy.internal` },
      });
    }

    const existingParticipant = room.participants.find(p => p.userId === user?.id);
    if (!existingParticipant) {
      await prisma.roomParticipant.create({
        data: { roomId: room.id, userId: user.id }
      });
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

// ─── Media Upload ─────────────────────────────────────────────────────────────
app.post('/api/media', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'puxy',
      resource_type: 'auto',
    });
    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Media upload failed' });
  }
});

// ─── Delete Room (Full cleanup) ───────────────────────────────────────────────
app.delete('/api/rooms/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    // Fetch all media messages for Cloudinary cleanup
    const mediaMessages = await prisma.message.findMany({
      where: { roomId, mediaPublicId: { not: null } },
      select: { mediaPublicId: true }
    });

    // Delete Cloudinary assets
    for (const msg of mediaMessages) {
      if (msg.mediaPublicId) {
        try {
          await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: 'auto' });
        } catch (e) {
          console.error('Cloudinary delete error:', e);
        }
      }
    }

    // Delete room (cascades: messages, participants, invites)
    await prisma.room.delete({ where: { id: roomId } });

    // Notify all room sockets
    io.to(roomId).emit('roomDeleted', { roomId });

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete room', details: error.message });
  }
});

// ─── Delete Single Message ────────────────────────────────────────────────────
app.delete('/api/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { forEveryone } = req.body;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (message.mediaPublicId) {
      try {
        await cloudinary.uploader.destroy(message.mediaPublicId, { resource_type: 'auto' });
      } catch (e) {
        console.error('Cloudinary delete error:', e);
      }
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedForEveryone: !!forEveryone,
        content: forEveryone ? '[deleted]' : message.content,
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete message', details: error.message });
  }
});

// ─── Refresh Invite Link ──────────────────────────────────────────────────────
app.post('/api/rooms/:roomId/invite', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const invite = await prisma.invite.create({
      data: {
        roomId,
        token: `inv_${Math.random().toString(36).substr(2, 12)}`,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      }
    });

    res.json({ inviteLink: `${process.env.FRONTEND_URL}/join/${invite.token}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create invite', details: error.message });
  }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  let currentUserId: string | null = null;
  let currentRoomId: string | null = null;

  // ── joinRoom ──────────────────────────────────────────────────────────────
  socket.on('joinRoom', async ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.join(roomId);
    currentUserId = userId;
    currentRoomId = roomId;

    // Track online
    onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });

    // Track room sockets
    if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
    roomSockets.get(roomId)!.add(socket.id);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true }
    });

    if (room) {
      io.to(roomId).emit('roomData', {
        participantCount: room.participants.length,
        expiresAt: room.expiresAt,
      });
    }

    // Notify partner of online status
    socket.to(roomId).emit('userOnline', { userId });

    // Fetch previous messages
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        replyTo: { include: { sender: true } }
      }
    });

    socket.emit('previousMessages', messages.map(m => ({
      id: m.id,
      content: m.content,
      type: m.type,
      senderId: m.sender?.clerkId || m.senderId,
      senderName: m.sender?.name,
      createdAt: m.createdAt,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
      deletedAt: m.deletedAt,
      deletedForEveryone: m.deletedForEveryone,
      expiresAt: m.expiresAt,
      replyTo: m.replyTo ? {
        id: m.replyTo.id,
        content: m.replyTo.content,
        senderId: m.replyTo.sender?.clerkId || m.replyTo.senderId,
      } : null,
    })));

    // Mark all unread messages from partner as delivered
    await prisma.message.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        deliveredAt: null,
        deletedAt: null,
      },
      data: { deliveredAt: new Date() }
    });
    socket.to(roomId).emit('messagesDelivered', { roomId });
  });

  // ── sendMessage ───────────────────────────────────────────────────────────
  socket.on('sendMessage', async (data: {
    roomId: string;
    userId: string;
    text: string;
    type?: string;
    isSecret?: boolean;
    expiresInSeconds?: number;
    replyToId?: string;
    mediaPublicId?: string;
  }) => {
    const { roomId, userId, text, type = 'TEXT', isSecret = false, expiresInSeconds, replyToId, mediaPublicId } = data;
    try {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (!user) return;

      const expiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;

      const message = await prisma.message.create({
        data: {
          roomId,
          senderId: user.id,
          content: text,
          type: type as any,
          isSecret,
          expiresAt,
          replyToId: replyToId || null,
          mediaPublicId: mediaPublicId || null,
        },
        include: {
          sender: true,
          replyTo: { include: { sender: true } }
        }
      });

      const payload = {
        id: message.id,
        content: message.content,
        type: message.type,
        senderId: message.sender?.clerkId || message.senderId,
        senderName: message.sender?.name,
        createdAt: message.createdAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        deletedAt: message.deletedAt,
        deletedForEveryone: message.deletedForEveryone,
        expiresAt: message.expiresAt,
        replyTo: message.replyTo ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderId: message.replyTo.sender?.clerkId || message.replyTo.senderId,
        } : null,
      };

      io.to(roomId).emit('newMessage', payload);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // ── typing indicators ─────────────────────────────────────────────────────
  socket.on('typing', ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.to(roomId).emit('typing', { userId });
  });

  socket.on('stopTyping', ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.to(roomId).emit('stopTyping', { userId });
  });

  // ── deleteMessage (unsend) ────────────────────────────────────────────────
  socket.on('deleteMessage', async (data: {
    messageId: string;
    roomId: string;
    forEveryone: boolean;
  }) => {
    try {
      const { messageId, roomId, forEveryone } = data;

      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return;

      if (message.mediaPublicId) {
        try {
          await cloudinary.uploader.destroy(message.mediaPublicId, { resource_type: 'auto' });
        } catch (e) {
          console.error('Cloudinary delete error:', e);
        }
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          deletedForEveryone: forEveryone,
          content: forEveryone ? '[deleted]' : message.content,
        }
      });

      if (forEveryone) {
        io.to(roomId).emit('messageDeleted', { messageId, forEveryone: true });
      } else {
        socket.emit('messageDeleted', { messageId, forEveryone: false });
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  });

  // ── markRead ──────────────────────────────────────────────────────────────
  socket.on('markRead', async ({ roomId, userId }: { roomId: string; userId: string }) => {
    try {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (!user) return;

      await prisma.message.updateMany({
        where: {
          roomId,
          senderId: { not: user.id },
          readAt: null,
          deletedAt: null,
        },
        data: { readAt: new Date() }
      });

      socket.to(roomId).emit('messagesRead', { roomId, readBy: userId });
    } catch (err) {
      console.error('markRead error:', err);
    }
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    if (currentUserId) {
      onlineUsers.set(currentUserId, { socketId: socket.id, lastSeen: new Date() });
    }

    if (currentRoomId) {
      roomSockets.get(currentRoomId)?.delete(socket.id);
      if (currentUserId) {
        socket.to(currentRoomId).emit('userOffline', {
          userId: currentUserId,
          lastSeen: new Date(),
        });
      }
    }
  });
});

// ─── Background Jobs ──────────────────────────────────────────────────────────

// Cleanup expired rooms every 2 minutes
setInterval(async () => {
  try {
    const expiredRooms = await prisma.room.findMany({
      where: { expiresAt: { lt: new Date() } },
      include: {
        messages: {
          where: { mediaPublicId: { not: null } },
          select: { mediaPublicId: true }
        }
      }
    });

    for (const room of expiredRooms) {
      for (const msg of room.messages) {
        if (msg.mediaPublicId) {
          try {
            await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: 'auto' });
          } catch (e) {
            // ignore
          }
        }
      }
      await prisma.room.delete({ where: { id: room.id } });
      io.to(room.id).emit('roomDeleted', { roomId: room.id, reason: 'expired' });
      console.log(`Auto-deleted expired room: ${room.id}`);
    }
  } catch (e) {
    console.error('Room expiry job error:', e);
  }
}, 2 * 60 * 1000);

// Cleanup disappearing messages every minute
setInterval(async () => {
  try {
    const expiredMessages = await prisma.message.findMany({
      where: {
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
      select: { id: true, roomId: true, mediaPublicId: true }
    });

    for (const msg of expiredMessages) {
      if (msg.mediaPublicId) {
        try {
          await cloudinary.uploader.destroy(msg.mediaPublicId, { resource_type: 'auto' });
        } catch (e) {
          // ignore
        }
      }
      await prisma.message.update({
        where: { id: msg.id },
        data: { deletedAt: new Date(), deletedForEveryone: true, content: '[disappeared]' }
      });
      io.to(msg.roomId).emit('messageDeleted', { messageId: msg.id, forEveryone: true, reason: 'expired' });
    }
  } catch (e) {
    console.error('Message expiry job error:', e);
  }
}, 60 * 1000);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Puxy backend listening on port ${PORT}`);
});
