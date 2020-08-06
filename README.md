# DrawBot

## A rudimentary [drawaria](https://drawaria.online) bot

### Installation

```
yarn install
node .
```

### Configuration

You can change certain variables at the top of index.js

#### `FILE_URL`

Set the path to your image (e.g. `./test.jpg`)

#### `RESIZE_FILE`

This is recommended for large files. It will resize your image to be equal to `FILE_W x FILE_H`

#### `DELTA_FILTERING`

By enabling delta filtering, you can improve draw speeds by merging similar colours together. This causes artifacting, so it's recommended to keep `MAX_DELTA_LENGTH` fairly low. The default value for this is `10`. set `DELTA_FILTERING` to `false` if you don't want artifacting.

You can get much faster draw speeds by settings `MAX_DELTA_LENGTH` to be the same as `FILE_W`, however lots of artifacting **will** occur.

#### `TIMED_DRAW`

Displays how long it took to draw an image once it's completed.
