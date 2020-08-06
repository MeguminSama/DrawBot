const {
  DrawClient
} = require('./DrawClient')
const getPixels = require('get-pixels')
const sharp = require('sharp')
const fs = require('fs')
const FileType = require('file-type')

const ROOM_ID = '01bf5836-0900-413f-a858-3bcc5911b51b.3'

const FILE_URL = './test.jpg'
const FILE_W = 1000
const FILE_H = 1000
const RESIZE_FILE = true

const DELTA_FILTERING = true
const MAX_DELTA_LENGTH = 10

const TIMED_DRAW = true



async function main() {
  let buffer = Buffer.from(fs.readFileSync(FILE_URL))

  if (RESIZE_FILE) buffer = Buffer.from(
    (await sharp(buffer).resize(
        FILE_W,
        FILE_H, {
          fit: 'contain'
        })
      .toBuffer())
  )

  let pixels = await getPxFromImg(buffer)
  const client = new DrawClient('tbi', FILE_W, FILE_H)

  eventHandler.apply(client)
  await client.connect().catch(console.error)
  await client.joinRoom(ROOM_ID, {
    username: makeid(6),
  })

  let lineBuffer = {
    from: 0,
    to: 0,
    height: 0,
    fresh: true,
    newLine: true,
    hex: pixels.data[0].hex,
    delta: 0,
  }

  let startTime = Date.now()
  await sleep(1000)
  for (let i = 0; i < pixels.data.length; i++) {
    let x = pixels.data[i].targetX
    let y = pixels.data[i].targetY
    let hex = pixels.data[i].hex
    if (lineBuffer.fresh) {
      lineBuffer.from = x
      lineBuffer.to = x
      lineBuffer.height = y
      lineBuffer.hex = hex
      lineBuffer.fresh = false
      lineBuffer.delta = 0
    } else {
      if (y != lineBuffer.height || hex != lineBuffer.hex) { // draw & flush the buffer
        lineBuffer.newLine = (y != lineBuffer.height)
        let delta = hexColorDelta(lineBuffer.hex.substr(1), hex.substr(1))
        if (lineBuffer.delta >= MAX_DELTA_LENGTH) delta = 0
        if (DELTA_FILTERING && (!lineBuffer.newLine) && delta > 0.95) {
          lineBuffer.delta = lineBuffer.delta + 1
          lineBuffer.to = lineBuffer.to + 1
        } else {
          client.drawLineCustom(lineBuffer.from, lineBuffer.height, lineBuffer.to, lineBuffer.height, pixels.width, pixels.height, lineBuffer.hex)
          lineBuffer.fresh = true
          lineBuffer.delta = 0
          lineBuffer.newLine = true
          await sleep(10)
        }
      } else {
        lineBuffer.to = lineBuffer.to + 1
      }
    }
  }

  if (TIMED_DRAW) {
    let diff = (Date.now() - startTime) / 1000
    console.log('Drawing took ' + diff + 'seconds')
  }
}

/**
 * generates a delta (0-1) comparing two hexadecimal values
 */
function hexColorDelta(hex1, hex2) {
  var r1 = parseInt(hex1.substring(0, 2), 16);
  var g1 = parseInt(hex1.substring(2, 4), 16);
  var b1 = parseInt(hex1.substring(4, 6), 16);
  var r2 = parseInt(hex2.substring(0, 2), 16);
  var g2 = parseInt(hex2.substring(2, 4), 16);
  var b2 = parseInt(hex2.substring(4, 6), 16);
  var r = 255 - Math.abs(r1 - r2);
  var g = 255 - Math.abs(g1 - g2);
  var b = 255 - Math.abs(b1 - b2);
  r /= 255;
  g /= 255;
  b /= 255;
  return (r + g + b) / 3;
}

/**
 * get formatted pixels from image
 */
function getPxFromImg(buffer) {
  return new Promise(async (resolve, reject) => {
    let type = await FileType.fromBuffer(buffer)
    getPixels(buffer, type.mime, (err, pixels) => {
      if (err) throw err
      let obj = {
        height: pixels.shape[1],
        width: pixels.shape[0],
        data: []
      }
      for (let y = 0; y < pixels.shape[1]; y++) {
        for (let x = 0; x < pixels.shape[0]; x++) {
          let r = pixels.get(x, y, 0)
          let g = pixels.get(x, y, 1)
          let b = pixels.get(x, y, 2)
          let rgb = `rgb(${r}, ${g}, ${b})`
          let hex = '#' + rgba2hex(rgb);
          hex = hex.substring(0, hex.length - 2)
          obj.data.push({
            targetX: x,
            targetY: y,
            hex,
          })
        }
      }
      resolve(obj)
    })
  })
}

function eventHandler() {
  this.on('error', console.error)
  this.on('close', console.error)
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function rgba2hex(orig) {
  var a,
    isPercent,
    rgb = orig
    .replace(/\s/g, "")
    .match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
    alpha = ((rgb && rgb[4]) || "").trim(),
    hex = rgb ?
    (rgb[1] | (1 << 8)).toString(16).slice(1) +
    (rgb[2] | (1 << 8)).toString(16).slice(1) +
    (rgb[3] | (1 << 8)).toString(16).slice(1) :
    orig;

  if (alpha !== "") {
    a = alpha;
  } else {
    a = 1;
  }
  a = ((a * 255) | (1 << 8)).toString(16).slice(1);
  hex = hex + a;

  return hex;
}

const sleep = async ms => await new Promise(r => setTimeout(r, ms));

main()