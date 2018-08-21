
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const child_process = require('child_process');

Object.assign(process.env, require('./env.json'));

const vlcBin = process.env.vlc_bin;
const port = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.post('/play-in-vlc', (req, res) => {
    console.log('play in vlc', req.body);
    const vlcProcess = child_process.spawn(vlcBin, [
        '--one-instance',
        ...req.body.enqueue ? ['--playlist-enqueue'] : [],
        req.body.videoFilePath,
    ], {
        detached: true,
    });
    vlcProcess.stdout.on('data', (data) => process.stdout.write(data));
    vlcProcess.stderr.on('data', (data) => process.stderr.write(data));
    res.send({ status: 'OK' });
});

app.listen(port, () => console.log(`Server running on port ${port}`));

process.on('unhandledRejection', (error) => { throw error; });
process.on('uncaughtException', (error) => console.error(error));
