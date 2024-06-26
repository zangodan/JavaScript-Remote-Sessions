import express from 'express';
import { getSessionsCode, getSessionCodeById, setSessionCode } from './database.js'
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.static(path.join(__dirname, '..Client/build')));
app.use(cors());
app.use(express.json());

app.get('/sessionscode', async (req, res) => {
    const sessionsCode = await getSessionsCode();
    res.send(sessionsCode);
})

app.get('/sessionscode/:sessionID', async (req, res) => {
    const sessionID = req.params.sessionID;
    const sessionCode = await getSessionCodeById(sessionID);
    res.send(sessionCode['code']);
})

app.post('/sessionscode', async (req, res) => {
    const { sessionId, newCode } = req.body;
    await setSessionCode(sessionId, newCode);
    res.send(`id = ${sessionId}, code = ${newCode}`);
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

// app.get('*', (req, res) => {
//     console.log("serving index.html");
//     res.sendFile(path.join(__dirname, '../Client/build', 'index.html'));
// });

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('join_room', (data) => {
        const roomId = data.roomId; 
        socket.join(roomId);
        socket.emit('entered_room', {canEdit: (io.sockets.adapter.rooms.get(roomId)?.size > 1)});
        console.log(io.sockets.adapter.rooms.get(roomId)?.size);
        console.log(`Client joined room ${roomId}`);

        socket.on('send_code_update', (data) =>{
            socket.to(roomId).emit('get_code_update', {new_code: data});
        })
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Listening to port ${process.env.PORT}`);
})