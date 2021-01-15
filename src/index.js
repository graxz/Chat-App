const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
//Para chamar o filtro de palavroes
// const Filter = require('bad-words')
const { generateMessage, generateMsgLocation } = require('./utils/messages')
const { getUsersInRoom, getUser, removeUser, addUser } = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Chat App', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Chat App', `${user.username} has joined.`))
        
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        //Filtro de palavroes em ingles
        // const filter = new Filter()

        // if (filter.isProfane(message)) {
        //     return callback('Sem palavrao irmao')
        // }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('location', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateMsgLocation(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Chat App', `${user.username} has left.`))
            
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(PORT, () => {
    console.log(`Server is up on http://localhost:${PORT}`)
})