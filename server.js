import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io'; // Correct way to import socket.io
import {app} from './app.js';
const server = http.createServer(app);
const io = new socketIo(server); // Initialize Socket.IO with the server

// WebSocket connection
io.on('connection', (socket) => {
    console.log('A user connected');

   // Listen for location updates from the driver app
   socket.on('locationUpdate', (locationData) => {
    const { latitude, longitude } = locationData;

    console.log(`Location received: Latitude = ${latitude}, Longitude = ${longitude}`);

});

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
