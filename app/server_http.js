#!/usr/bin/env node

/*сервер*/

const fs = require('fs');
const express = require('express');
const app = express();

const cors = require('cors')

const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const port_default = 8000;
const port = (process.argv.length > 2)? parseInt(process.argv[2]) : port_default;
const cons = require('consolidate');
const sockets = {};
const dotenv = require('dotenv');
dotenv.config({ path: '/usr/src/env/app/.env' });
const NODE_ENV = process.env.NODE_ENV;
const ice = require('./ice.json');
const aliases = {};

server.listen(port,function(){
    console.log('Server start at port '+port+ ' ' + (new Date()).toLocaleString());
});


/* CORS */
app.use(cors());

/* настройки для рендеринга шаблонов*/
app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views',__dirname+'/views');

/* подключение каталога статических файлов, cookies, bodyParser */
app.use(express.static(__dirname+'/public'));
app.use(cookieParser());

/*обработка запросов*/
app.get('/', function (req, res) {
    res.render('index');
})
app.get('/room/:room', function (req, res) {
    const room = req.params.room;
    res.render('room', {room: room, NODE_ENV: NODE_ENV});
});

const roomsNsp = io.of(/^\/room\/.*?$/);
roomsNsp.on('connection', function (socket) {
    const namespace = socket.nsp;
    const room = namespace.name.replace('/room/', '');
    console.log('namespace:', namespace.name, 'room:', room);
    console.log('Socket connected, id=', socket.id);
    if (sockets[room] === undefined){
        sockets[room] = {};
    }
    sockets[room][socket.id] = socket;
    //console.log(socket.handshake.query);
    console.log('sockets: ', Object.keys(sockets[room]).length);
    socket.emit('users', {sockets: Object.keys(sockets[room]), ice: ice});
    socket.broadcast.emit('users', {sockets: Object.keys(sockets[room]), ice: ice});
    socket.on('disconnect', function () {
        console.log('Socket disconnected, id=', socket.id);
        delete sockets[room][socket.id];
        delete aliases[room][socket.id];
        if (Object.keys(sockets[room]).length === 0){
            delete sockets[room];
        }
        if (Object.keys(aliases[room]).length === 0){
            delete aliases[room];
        }
        if (sockets[room]){
            socket.broadcast.emit('users', {sockets: Object.keys(sockets[room]), ice: ice});
            console.log('sockets: ', Object.keys(sockets[room]).length);
        }
    });
    socket.on('alias', function(data){
        console.log(data);
        if (aliases[room] === undefined){
            aliases[room] = {};
        }
        aliases[room][data.socket_id] = data.alias;
        socket.emit('aliases', {aliases: aliases[room]})
        socket.broadcast.emit('aliases', {aliases: aliases[room]})
    });
    socket.on('message', function(data){
        console.log(data);
        socket.emit('message', {message: data.message, user: socket.id})
        socket.broadcast.emit('message', {message: data.message, user: socket.id})
    });
    socket.on('wrtc_message', function(data){
        var nicname = socket.id; //socket_id from
        var adresat_id = data.to; //socket_id to
        var message = data.message; //message
        if (nicname !== adresat_id){
            //console.log(nicname, adresat_id, message);
            socket.broadcast.to(adresat_id).emit('wrtc_message', {message:message, from: nicname});
        }
    });
});



