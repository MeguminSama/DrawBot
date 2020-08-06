const {
  EventEmitter
} = require('events')
const color = require('colors')
const parser = require('socket.io-parser')
const eparser = require('engine.io-parser')
const WebSocket = require('ws')

class DrawClient extends EventEmitter {
  constructor(width, height) {
    super()
    this.socketURI = new URL('wss://sv3.drawaria.online/socket.io/')
    this.socketURI.searchParams.append('sid1', 'undefined')
    this.socketURI.searchParams.append('hostname', 'drawaria.online')
    this.socketURI.searchParams.append('transport', 'websocket')
    this.messageDecoder = new parser.Decoder()
    this.messageDecoder.on('decoded', packet => {
      _onDecodedListener(this, packet)
    })
    this.width = width
    this.height = height
  }

  /**
   * Connect to the room
   */
  connect() {
    return new Promise((resolve, reject) => {
      let uri = this.socketURI.toString()
      this.socket = new WebSocket(uri)
      const onConnectListener = message => {
        if (message === '40') {
          this.socket.removeListener('message', onConnectListener)
          resolve(message)
        } else if (message.startsWith('0{"sid":"')) {
          // do nothing
        } else {
          reject(message)
        }
      }
      this.socket.on('message', onConnectListener)
      this.socket.on('message', message => {
        _onMessageListener(this.socket, message, this.messageDecoder)
      })
      this.socket.on('error', err => {
        this.emit('error', err)
      })
      this.socket.on('close', _ => {
        this.emit('close', 'connection closed')
      })
    })
  }

  disconnect() {
    return new Promise(resolve => {
      this.socket.close()
      resolve()
    })
  }

  drawBox(x1, y1, x2, y2, colour = "#000000") {
    this.drawLine(x1, y1, x2, y1) // top
    this.drawLine(x2, y1, x2, y2) // right
    this.drawLine(x2, y2, x1, y2) // bottom
    this.drawLine(x1, y2, x1, y1) // left
  }

  drawLineCustom(x1, y1, x2, y2, w, h, colour = "#000000", big = false) {
    let data = [
      'drawcmd',
      0,
      [
        x1/w,
        y1/h,
        x2/w,
        y2/h,
        true,
        (big ? 2 : 1),
        colour,
        1
      ]
    ]
    let encoder = new parser.Encoder()
    encoder.encode({
      type: eparser.packets.message,
      data,
      id: 20
    }, cb => {
      this.socket.send(cb[0])
    })
  }

  drawLine(x1, y1, x2, y2, colour = "#000000", big = false) {
    let data = [
      'drawcmd',
      0,
      [
        x1/this.width,
        y1/this.height,
        x2/this.width,
        y2/this.height,
        true,
        (big ? 2 : 1),
        colour,
        1
      ]
    ]
    let encoder = new parser.Encoder()
    encoder.encode({
      type: eparser.packets.message,
      data,
      id: 20
    }, cb => {
      this.socket.send(cb[0])
    })
  }

  drawCustom(x, y, w, h, colour = "#000000", big = false) {
    let data = [
      'drawcmd',
      0,
      [
        x/w,
        y/h,
        x/w,
        y/h,
        true,
        (big ? 2 : 1),
        colour,
        32
      ]
    ]
    let encoder = new parser.Encoder()
    encoder.encode({
      type: eparser.packets.message,
      data,
      id: 20
    }, cb => {
      this.socket.send(cb[0])
    })
  }

  draw(x, y, colour = "#000000", big = false) {
    let data = [
      'drawcmd',
      0,
      [
        x/this.width,
        y/this.height,
        x/this.width,
        y/this.height,
        true,
        (big ? 2 : 1),
        colour,
        2
      ]
    ]
    let encoder = new parser.Encoder()
    encoder.encode({
      type: eparser.packets.message,
      data,
      id: 20
    }, cb => {
      this.socket.send(cb[0])
    })
  }

  /**
   * @param {string} roomId ID of the room to join
   * @param {object} roomOpts room settings
   * @param {string} roomOpts.username username
   */
  async joinRoom(roomId, roomOpts) {
    return new Promise((resolve,reject)=>{
      this.on('_ROOM_RECEIVED', (data)=>{
        console.log('Room Received')
        console.log('Users: ', data.players.length)
        resolve(data)
      })
      let data = [
        "startplay",
        roomOpts.username,
        1,
        "en",
        roomId,
        null,
        [
          null,
          "",
          this.width,
          this.height,
          [ // profile picture stuff i think
            null,
            "33a54a30-d464-11ea-8908-092bf758cccf",
            "1596333742644"
          ],
          "11525752753573597"
        ]
      ]
      let encoder = new parser.Encoder()
      encoder.encode({
        type: eparser.packets.message,
        data,
        id: 20
      }, cb => {
        this.socket.send(cb[0])
      })
    })
  }

  /**
   * 
   * @param {object} roomOpts room settings
   * @param {string} roomOpts.username username
   * @param {boolean} roomOpts.private is private room
   * @param {number} [roomOpts.maxPlayers=200] maximum players
   */
  createRoom(roomOpts) {
    roomOpts.maxPlayers = roomOpts.maxPlayers || 200

    let data = [
      'startplay',
      roomOpts.username,
      2,
      "en",
      null, {
        "privateroom": roomOpts.private,
        "maxplayers": roomOpts.maxPlayers,
        "drawstatelen": 90000,
        "cyclesnum": 0,
        "excludedefaultwords": true,
        "pgresettime": -1,
        "pgbrushsize": -1,
        "cursorsenabled": false,
        "pgdrawallowmode": false,
        "roomdescr": "",
        "pgmodeflags": []
      },
      [
        null,
        "",
        this.width,
        this.height,
        [
          null,
          "33a54a30-d464-11ea-8908-092bf758cccf", // avatar ID
          "1596333742644" // unknown
        ],
        "11525752753573597" // unknown
      ]
    ]
    let encoder = new parser.Encoder()
    encoder.encode({
      type: eparser.packets.message,
      data,
      id: 20
    }, cb => {
      this.socket.send(cb[0])
    })
  }
}

module.exports = {
  DrawClient
}

/**
 * Events Enumerable
 * @readonly
 * @enum {Events}
 */
const Events = {
  CLIENT_INIT: 0,
  CLIENT_READY: 40,
  CLIENT_COMMAND: 42,
  HEARTBEAT_REQUEST: 2,
  HEARTBEAT_RESPONSE: 3,
  ROOM_CREATED: 430,
}

const _onDecodedListener = (_this, packet) => {
  switch (packet.type) {
    case parser.CONNECT:
      console.log('CONNECT', packet)
      _this.emit('_CONNECT')
      break // this shouldnt run!
    case parser.EVENT:
      console.log('EVENT', packet)
      _this.emit('_EVENT', packet)
      break
    case parser.BINARY_EVENT:
      console.log('BINARY EVENT', packet)
      _this.emit('_BINARY_EVENT', packet)
      break
    case parser.ACK:
      console.log('ACK', packet)
      if (packet.id === 0) {
        if (!!packet.data[0].error) console.error(packet.data[0])
        _this.emit('_ROOM_RECEIVED', packet.data[0])
      }
      break
    case parser.BINARY_ACK:
      console.log('BINARY ACK', packet)
      _this.emit('_BINARY_ACK', packet)
      break
    case parser.DISCONNECT:
      console.log('DISCONNECT', packet)
      _this.emit('_DISCONNECT', packet)
      break
    case parser.ERROR:
      console.log('ERROR', packet)
      _this.emit('_ERROR', packet)
      break
    default:
      console.log('UNKNOWN', packet)
      _this.emit('_UNKNOWN', packet)
  }
}

const _heartbeat = socket => socket.send('2')

const _onMessageListener = (socket, packet, decoder) => {
  let parsed = eparser.decodePacket(packet)
  if (parsed.type === 'open') _parseConnectionMessage(socket, parsed)
  else if (parsed.type === 'pong') { /* do nothing */ }
  else decoder.add(parsed.data)
}

const _parseConnectionMessage = (socket, packet) => {
  let data = JSON.parse(packet.data)
  let heartbeatInterval = data.pingInterval
  console.log('Setting heartbeat to ' + heartbeatInterval + 'ms')
  setInterval(_ => {
    _heartbeat(socket)
  }, heartbeatInterval)
}
