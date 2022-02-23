import http from 'http';
import Websocket from 'ws';
import express from 'express';
import SocketIO, { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use('/public', express.static(__dirname + '/public'));

app.get('/', (_, res) => res.render('home'));
app.get('/*', (_, res) => res.redirect('/'));

const handleListener = () => console.log('Listening on http://localhost:3000');

const server = http.createServer(app);
// const wss = new Websocket.Server({ server });
const wsServer = new Server(server, {
  cors: {
    origin: ['https://admin.socket.io'],
    credentials: true,
  },
});

instrument(wsServer, { auth: false });

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;

  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });

  return publicRooms;
}

function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on('connection', (socket) => {
  socket.nickname = 'Anon';
  socket.onAny((event) => {
    console.log('test', event);
  });

  socket.on('enter_room', (roomName, done) => {
    socket.join(roomName);
    done();
    socket.to(roomName).emit('welcome', socket.nickname, countRoom(roomName));
    wsServer.sockets.emit('room_change', publicRooms());
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit('bye', socket.nickname, countRoom(room) - 1),
    );
  });

  socket.on('disconnect', () =>
    wsServer.sockets.emit('room_change', publicRooms()),
  );

  socket.on('new_message', (msg, room, done) => {
    socket.to(room).emit('new_message', `${socket.nickname} : ${msg}`);
    done();
  });

  socket.on('nickname', (nickname) => (socket['nickname'] = nickname));
});

// const sockets = [];

// wss.on('connection', (socket) => {
//   sockets.push(socket);
//   console.log('connect to server ');
//   socket['nickname'] = 'Anon';

//   socket.on('close', () => console.log('disconnected from browser'));

//   socket.on('message', (msg) => {
//     const message = JSON.parse(msg);

//     switch (message.type) {
//       case 'new_message':
//         sockets.forEach((asocket) =>
//           asocket.send(`${socket.nickname}:${message.payload}`),
//         );

//       case 'nickname':
//         socket['nickname'] = message.payload;
//     }
//   });
// });

server.listen(3000, handleListener);
