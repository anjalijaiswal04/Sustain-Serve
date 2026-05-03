import { createServer } from 'http';
import { Server } from 'socket.io';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const DATA_FILE = './data.json';

const INITIAL_DATA = {
  users: [
    { id: '1', name: 'Admin User', email: 'admin@sharefood.com', phone: '1234567890', password: 'password', role: 'admin' }
  ],
  donations: [],
  deliveries: [],
};

function loadData() {
  try {
    if (existsSync(DATA_FILE)) {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading data file, starting fresh:', e.message);
  }
  return JSON.parse(JSON.stringify(INITIAL_DATA));
}

function saveData(data) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving data file:', e.message);
  }
}

let appData = loadData();

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  // Send the current authoritative dataset to the newly connected client
  socket.emit('full_sync', appData);

  // Client is pushing a data change
  socket.on('data_change', ({ type, action, payload }) => {
    if (type === 'donations') {
      if (action === 'save') {
        // Only add if not already present (idempotent)
        if (!appData.donations.find(d => d.id === payload.id)) {
          appData.donations.push(payload);
        }
      } else if (action === 'update') {
        const idx = appData.donations.findIndex(d => d.id === payload.id);
        if (idx > -1) appData.donations[idx] = payload;
      } else if (action === 'delete') {
        appData.donations = appData.donations.filter(d => d.id !== payload);
      }
    } else if (type === 'users') {
      if (action === 'save') {
        if (!appData.users.find(u => u.id === payload.id)) {
          appData.users.push(payload);
        }
      } else if (action === 'update') {
        const idx = appData.users.findIndex(u => u.id === payload.id);
        if (idx > -1) appData.users[idx] = payload;
      } else if (action === 'delete') {
        appData.users = appData.users.filter(u => u.id !== payload);
      }
    } else if (type === 'deliveries') {
      if (action === 'save') {
        if (!appData.deliveries.find(d => d.id === payload.id)) {
          appData.deliveries.push(payload);
        }
      } else if (action === 'update') {
        const idx = appData.deliveries.findIndex(d => d.id === payload.id);
        if (idx > -1) appData.deliveries[idx] = payload;
      }
    }

    saveData(appData);

    // Broadcast to ALL OTHER connected clients
    socket.broadcast.emit('data_changed', { type, action, payload });
  });

  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
  });
});

const PORT = 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
