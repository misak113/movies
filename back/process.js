
const fs = require('fs-extra');
const _ = require('lodash');
const moment = require('moment');
const getVideoInfo = require('get-video-info');
const path = require('path');
const crypto = require('crypto');
const request = require('request-promise');
const GoogleSearch = require('google-search');
const { JSDOM } = require("jsdom");
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
const jQuery = require('jquery')(window);
const ProgressBar = require('progress');

Object.assign(process.env, require('./env.json'));

const googleSearch = new GoogleSearch({
    key: process.env.google_api_key,
    cx: process.env.google_api_cx,
});

const cacheDbPath = __dirname + '/cache';
const videoInfosPath = __dirname + '/../front/public/videoInfos.json';
const memoryCache = {};

const movieDirectoryPaths = JSON.parse(process.env.directory_paths);
const movieExcludePaths = process.env.exclude_paths ? JSON.parse(process.env.exclude_paths) : [];

const movieExtensions = [
    '.mp4',
    '.avi',
    '.mkv',
];

function md5checksum(data) {
    return crypto.createHash('md5').update(data).digest("hex");
}

async function loadCache(name) {
    const cacheDbFilePath = cacheDbPath + '/' + name + '.json';
    try {
        memoryCache[name] = memoryCache[name] || (fs.existsSync(cacheDbFilePath) ? JSON.parse(fs.readFileSync(cacheDbFilePath).toString()) : undefined);
    } catch (error) {
        console.warn(`Wrong cache ${name}`, error);
        fs.unlinkSync(cacheDbFilePath);
    }
    if (typeof memoryCache[name] !== 'undefined' && moment(memoryCache[name].expireAt).isBefore(moment())) {
        console.warn('Cache has expired. Use old value.');
    }
    return memoryCache[name] ? memoryCache[name].value : undefined;
}

async function loadOrSaveCache(name, execute, expiration) {
    const cacheDbFilePath = cacheDbPath + '/' + name + '.json';
    try {
        memoryCache[name] = memoryCache[name] || (fs.existsSync(cacheDbFilePath) ? JSON.parse(fs.readFileSync(cacheDbFilePath).toString()) : undefined);
    } catch (error) {
        console.warn(`Wrong cache ${name}`, error);
        fs.unlinkSync(cacheDbFilePath);
    }
    if (typeof memoryCache[name] === 'undefined' || moment(memoryCache[name].expireAt).isBefore(moment())) {
        try {
            const value = await execute();
            memoryCache[name] = {
                expireAt: moment().add(...expiration).toISOString(),
                value,
            };
            fs.writeFileSync(cacheDbFilePath, JSON.stringify(memoryCache[name]));
            return value;
        } catch (error) {
            if (typeof memoryCache[name] !== 'undefined') {
                console.warn('Cannot refresh cache. Use old value.', error);
                return memoryCache[name].value;
            } else {
                throw error;
            }
        }
    } else {
        return memoryCache[name].value;
    }
}

function scanMovies(directoryPaths, excludePaths) {
    const filePaths = directoryPaths
    .reduce(
        (filePaths, baseDirPath) => [
            ...filePaths,
            ...fs.readdirSync(baseDirPath).map((dirName) => baseDirPath + '/' + dirName),
        ],
        [],
    )
    .filter((filePath) => _.every(excludePaths, (excludePath) => filePath.indexOf(excludePath) !== 0));
    return _.flatten(filePaths.map(
        (filePath) => {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                return scanMovies([filePath]);
            } else {
                if (movieExtensions.indexOf(path.extname(filePath)) !== -1) {
                    return filePath;
                } else {
                    return [];
                }
            }
        },
    ));
}

function searchGoogle(query, siteSearch = "http://www.csfd.cz/") {
    return new Promise((resolve, reject) => {
        googleSearch.build({
            q: query,
            num: 1,
            siteSearch,
        }, (error, response) => {
            if (error) {
                reject(error);
            } else
            if (response.error) {
                reject(response.error);
            } else {
                resolve(response);
            }
        });
    });
}

function sanitizeName(fileBaseName) {
    let yearBracketsMatches;
    if (yearBracketsMatches = fileBaseName.match(/(\(\d{4,4}\))/)) {
        fileBaseName = fileBaseName.replace(yearBracketsMatches[1], ' ' + yearBracketsMatches[1].substring(1, 5) + ' ');
    }
    const spacedName = fileBaseName
        .match(/^([^\(\)]+)/i)[1]
        .replace(/([^a-zA-Z0-9ěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮ]|_)/gi, ' ')
        .replace(/\s+/g, ' ');
    const meanlessWords = ['hdtv', 'czdab', 'xvid', 'divx', 'h264', '1080', 'x264', '480p', 'dvdrip', 'dvd rip', 'brrip', 'dvb', 'dlrip', 'dabing', 'tv rip', ' část ', 'titulky', ' cz ', ' en '];
    const firstIndexOfMeanlessWord = meanlessWords
        .reduce((index, word) => {
            const indexOfWord = spacedName.toLowerCase().indexOf(word);
            return indexOfWord !== -1 && indexOfWord < index ? indexOfWord : index
        }, spacedName.length);
    const sanitizedName = spacedName.substring(0, firstIndexOfMeanlessWord)
        //.replace(/\S*(hdtv|czdab|endab|xvid|divx|h264|1080|x264|dvdrip|brrip|dvb|dlrip|dabing|titulky)\S*/gi, ' ')
        .replace(/(\s+)(cz|dl|cd\d|vtv|avi|lol|tit|ing|dl|web|xor|zip|dub|dd5|bluray|ac3|aac|avi)(\s+|$)/gi, ' ')
        .replace(/(\s+)(cz|dl|cd\d|vtv|avi|lol|tit|ing|dl|web|xor|zip|dub|dd5|bluray|ac3|aac|avi)(\s+|$)/gi, ' ')
        .replace(/\s+/g, ' ');
    const firstPartNameMatches = sanitizedName
        .match(/(^([a-zA-Z0-9ěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮ ]*(\D|^))((19|20)\d{2,2}|s\d{2,2}e\d{2,2}|\d{1,2}x\d{2,2}))/i);
    const name = firstPartNameMatches ? firstPartNameMatches[1] : sanitizedName;
    const simpleName = firstPartNameMatches ? (firstPartNameMatches[2].length < 2 ? '' : firstPartNameMatches[2]).trim() : sanitizedName;
    return { spacedName, sanitizedName, name, simpleName };
}

function parseSeries(spacedName) {
    let seriesMatches, serie, episode;
    if (seriesMatches = spacedName.match(/s(\d{2,2})e(\d{2,2})/i)) {
        serie = parseInt(seriesMatches[1]);
        episode = parseInt(seriesMatches[2]);
    } else
    if (seriesMatches = spacedName.match(/(\d{1,2})x(\d{2,2})/i)) {
        serie = parseInt(seriesMatches[1]);
        episode = parseInt(seriesMatches[2]);
    } else
    if (seriesMatches = spacedName.match(/(0\d{1,1})(\d{2,2})/i)) {
        serie = parseInt(seriesMatches[1]);
        episode = parseInt(seriesMatches[2]);
    }
    return { serie, episode };
}

function parseYear(spacedName) {
    let seriesMatches, year;
    if (seriesMatches = spacedName.match(/(^([a-zA-Z0-9ěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮ ]*)((19|20)\d{2,2}))/i)) {
        year = parseInt(seriesMatches[3]);
    }
    return { year };
}

function getCreatorSection($creators, sectionName) {
    let $creatorSection;
    $creators.each(function () {
        if (jQuery(this).find('h4').text().trim() === sectionName + ':') {
            $creatorSection = jQuery(this);
        }
    });
    return $creatorSection;
}

function parseCreators($creatorSection) {
    const creators = [];
    $creatorSection.each(function () {
        const $anchors = jQuery(this).find('span a');
        $anchors.each(function () {
            const $anchor = jQuery(this);
            creators.push({ name: $anchor.text().trim(), link: 'https://www.csfd.cz' + $anchor.attr('href') });
        });
    });
    return creators;
}

async function run() {
    const videoInfos = await getVideoInfos();
    const groupedVideoInfos = groupVideoInfosByMovie(videoInfos);
    fs.writeFileSync(videoInfosPath, JSON.stringify(groupedVideoInfos));
}

async function getVideoInfos() {
    const movieFilePaths = await loadOrSaveCache('filePaths', () => scanMovies(movieDirectoryPaths, movieExcludePaths), [1, 'hour']);
    const bar = new ProgressBar('  processing [:bar] :rate videos per second :percent (:current/:total) :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: movieFilePaths.length,
    });
    const movieFilePathsChunks = _.chunk(movieFilePaths, 1);
    let videoInfos = [];
    for (const movieFilePathsChunk of movieFilePathsChunks) {
        const videoInfosChunk = await Promise.all(movieFilePathsChunk.map(
            async (filePath) => {
                const videoInfo = await loadOrSaveCache(`videoFileInfo.${md5checksum(filePath)}`, async () => {   
                    try {
                        return await getVideoInfo(filePath);
                    } catch (error) {
                        return undefined;
                    }
                }, [5, 'weeks']);
                return {
                    filePath,
                    videoInfo,
                };
            },
        ));
        videoInfos = [...videoInfos, ...videoInfosChunk];
    }

    let skipSearch = false;
    for (const videoInfo of videoInfos) {
        try {
            const fileBaseName = path.basename(videoInfo.filePath, path.extname(videoInfo.filePath));
            let { name, spacedName, simpleName } = sanitizeName(fileBaseName);
            const { year } = parseYear(spacedName);
            const { serie, episode } = parseSeries(spacedName);
            if (!simpleName) {
                const baseFolder = path.dirname(videoInfo.filePath);
                const baseFolderDirname = path.basename(baseFolder);
                const { name: subName, simpleName: subSimpleName } = sanitizeName(path.basename(path.dirname(baseFolder))+ '/' + baseFolderDirname + '/' + fileBaseName);
                name = subName;
                simpleName = subSimpleName;
            }
            const simpleNameYear = simpleName + (year ? ' ' + year : '');
            videoInfo.name = name;
            const searchResult = skipSearch
                ? await loadCache(`movieSearch.${md5checksum(simpleNameYear)}`)
                : await loadOrSaveCache(`movieSearch.${md5checksum(simpleNameYear)}`, () => searchGoogle(simpleNameYear), [1, 'year']);
            if (searchResult && searchResult.items && searchResult.items.length > 0) {
                const csfdLink = searchResult.items[0].link;
                const csfdLinkMatches = csfdLink.match(/^https\:\/\/www\.csfd\.cz\/film\/([\w-]+)\//);
                if (csfdLinkMatches) {
                    const csfdOverviewLink = `https://www.csfd.cz/film/${csfdLinkMatches[1]}/prehled/`;
                    const csfdOverview = await loadOrSaveCache(`movieCsfdOverview.${md5checksum(csfdOverviewLink)}`, () => request({
                        uri: csfdOverviewLink,
                        gzip: true,
                    }), [Math.round(Math.random() * 30 + 6), 'days']);
                    const $csfdOverview = jQuery(csfdOverview);
                    const title = $csfdOverview.find('#profile .info .header [itemprop="name"]').text().trim();
                    const rating = parseInt($csfdOverview.find('#rating .average').text().trim().match(/(\d+)%/)[1]);
                    const image = $csfdOverview.find('#poster img').attr('src');
                    const description = $csfdOverview.find('#plots .content ul li:nth-child(1) div:nth-child(1)').text().trim();
                    const genre = $csfdOverview.find('#profile .info .genre').text().trim().split(' / ');
                    const origin = $csfdOverview.find('#profile .info .origin').text().trim().match(/([a-zA-Z0-9ěščřžýáíéóúůďťňĎŇŤŠČŘŽÝÁÍÉÚŮ \/]+), (\d{4,4})( - (\d{4,4}))?, ((\d+) h )?(\d+)(x(\d+)(–(\d+))?)? min/i);
                    const hours = origin[5] ? parseInt(origin[6]) : 0;
                    const minutes = typeof origin[8] === 'undefined' ? parseInt(origin[7]) : parseInt(origin[7]) * (parseInt(origin[9]) + parseInt(origin[11] || origin[9])) / 2;
                    const $creators = $csfdOverview.find('#profile .info .creators div');
                    const $directors = getCreatorSection($creators, 'Režie');
                    const directors = $directors ? parseCreators($directors) : [];
                    const $writers = getCreatorSection($creators, 'Scénář');
                    const writers = $writers ? parseCreators($writers) : [];
                    const $actors = getCreatorSection($creators, 'Hrají');
                    const actors = $actors ? parseCreators($actors) : [];
                    videoInfo.movie = {
                        title,
                        rating,
                        genre,
                        country: origin[1].split(' / '),
                        year: parseInt(origin[2]),
                        yearEnd: origin[4] ? parseInt(origin[4]) : parseInt(origin[2]),
                        length: hours * 60 + minutes,
                        image,
                        csfdOverviewLink,
                        description,
                        directors,
                        writers,
                        actors,
                    };
                    videoInfo.movie.directorsIndex = videoInfo.movie.directors.reduce((index, creator) => ({ ...index, [creator.name]: true }), {});
                    videoInfo.movie.writersIndex = videoInfo.movie.writers.reduce((index, creator) => ({ ...index, [creator.name]: true }), {});
                    videoInfo.movie.actorsIndex = videoInfo.movie.actors.reduce((index, creator) => ({ ...index, [creator.name]: true }), {});
                    videoInfo.serie = serie;
                    videoInfo.episode = episode;
                } else {
                    console.warn('Not correct CSFD link', name, simpleName, simpleNameYear, csfdLink);
                }
            } else {
                console.warn('No searched CSFD link', name, simpleName, simpleNameYear);
            }
        } catch (error) {
            if (error.errors && error.errors[0] && error.errors[0].domain === 'usageLimits') {
                console.warn('Skip all search because of usage limit');
                skipSearch = true;
            } else {
                console.error(videoInfo.filePath, error);
            }
        } finally {
            bar.tick();
        }
    }
    return videoInfos;
}

function groupVideoInfosByMovie(videoInfos) {
    const groups = _.groupBy(videoInfos, (videoInfo) => videoInfo.movie ? videoInfo.movie.csfdOverviewLink : videoInfo.filePath);
    return Object.keys(groups).map((key) => {
        const group = groups[key];
        return {
            uid: key,
            movie: group[0].movie,
            videoInfos: group,
        };
    });
}

process.on('unhandledRejection', (error) => { throw error; });
process.on('uncaughtException', (error) => console.error(error));

run();
