require('dotenv').config()

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: process.env.FE_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});
//const cors = require('cors');

//app.use(cors())

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

let numUsers = 0
let queue = []

io.on('connection', socket => {
  console.log('a user connected');
  numUsers++;

  io.emit('update users', numUsers);

  socket.partner = null

  socket.on('search', (data) => {
    console.log("Searching")
    console.log(queue.length)
    socket.username = data.username
    console.log(queue.length)
    if (queue.length > 0) {
      console.log("Match Found")
      const partner = queue.pop()
      socket.partner = partner.id
      partner.partner = socket.id
      io.to(partner.id).emit('match found', "You are partner")
      socket.emit('match found', "You are main guy")
    } else {
      queue.unshift(socket)
    }
  })

  socket.on('stop search', () => {
    console.log("user stopped search")
    queue = queue.filter(queuedSocket => queuedSocket.id !== socket.id)
    console.log(queue)
  })

  socket.on('message', (data) => {
    socket.to(socket.partner).emit('message', {username: socket.username, message: data.message})
    socket.emit('message', {username: socket.username, message: data.message})
  })

  socket.on('typing', () => {
    socket.to(socket.partner).emit('typing')
  })

  socket.on('not typing', () => {
    socket.to(socket.partner).emit('not typing')
  })

  socket.on('leave chat', () => {
    socket.to(socket.partner).emit('leave chat')
    socket.partner = null
  })

  socket.on('disconnect', () =>{
    console.log("user disconnected")
    queue = queue.filter(queuedSocket => queuedSocket.id !== socket.id)
    numUsers--;
    io.emit('update users', numUsers);
  })
})


http.listen(2500, () => {
  console.log("Listening on port 2500")
})