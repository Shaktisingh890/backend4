import express from 'express';
import http from 'http';
import {app} from './app.js';
const server = http.createServer(app);
const io = new socketIo(server); // Initialize Socket.IO with the server



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
