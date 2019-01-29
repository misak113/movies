import React, { Component, Fragment } from 'react';
import AsyncSelect from 'react-select/lib/Async';
import _ from 'lodash';
import removeDiacritics from './removeDiacritics';
import './App.css';
const serverPort = parseInt(document.querySelector('meta[name="port"]').getAttribute("content"));

class App extends Component {

  filterGenres = [];
  state = {
    countries: [],
    genres: [],
  };

  async componentDidMount() {
    const response = await fetch('videoInfos.json');
    this.videoInfos = await response.json();
    this.videoInfos.forEach((videoInfo) => {
      videoInfo.videoInfos.forEach((subVideoInfo) => {
        subVideoInfo.videoTitle = this.getVideoTitle(subVideoInfo);
        subVideoInfo.videoTitlePlain = removeDiacritics(subVideoInfo.videoTitle);
      });
      videoInfo.videoTitle = this.getVideoTitle(videoInfo);
      videoInfo.videoTitlePlain = removeDiacritics(videoInfo.videoTitle);
    });
    this.setState({
      countries: _.uniq(_.flatten(this.videoInfos.filter((videoInfo) => videoInfo.movie).map((videoInfo) => videoInfo.movie.country)))
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
      genres: _.uniq(_.flatten(this.videoInfos.filter((videoInfo) => videoInfo.movie).map((videoInfo) => videoInfo.movie.genre)))
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
      creators: _.uniq(
        _.flatten(this.videoInfos.filter((videoInfo) => videoInfo.movie).map((videoInfo) => [...videoInfo.movie.directors, ...videoInfo.movie.writers, ...videoInfo.movie.actors]))
        .map((creator) => creator.name)
      )
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    });
    this.updateList();
  }

  updateList() {
    let videoInfos = this.videoInfos;

    const searchText = this.searchInput.value;
    if (searchText) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.videoTitlePlain.toLowerCase().indexOf(removeDiacritics(searchText).toLowerCase()) !== -1);
    }

    if (this.filterGenres.length > 0) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && _.difference(this.filterGenres, videoInfo.movie.genre).length === 0);
    }

    if (this.country) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.country.indexOf(this.country) !== -1);
    }

    if (this.minRatingInput.value) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.rating >= parseInt(this.minRatingInput.value));
    }

    if (this.maxRatingInput.value) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.rating <= parseInt(this.maxRatingInput.value));
    }

    if (this.minYearInput.value) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.year >= parseInt(this.minYearInput.value));
    }

    if (this.maxYearInput.value) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.year <= parseInt(this.maxYearInput.value));
    }

    if (this.director) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.directorsIndex[this.director]);
    }

    if (this.writer) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.writersIndex[this.writer]);
    }

    if (this.actor) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.movie && videoInfo.movie.actorsIndex[this.actor]);
    }

    if (this.sortBy) {
      videoInfos = videoInfos.sort((vi1, vi2) => {
        const direction = parseInt(this.sortBy[0] + '1');
        switch (this.sortBy) {
          case '+title':
          case '-title':
            return vi1.videoTitlePlain.toLowerCase().localeCompare(vi2.videoTitlePlain.toLowerCase()) * direction;
          case '+rating':
          case '-rating':
            return ((vi1.movie ? vi1.movie.rating : 0) - (vi2.movie ? vi2.movie.rating : 0)) * direction;
          case '+year':
          case '-year':
            return ((vi1.movie ? vi1.movie.year : 0) - (vi2.movie ? vi2.movie.year : 0)) * direction;
          case '+serie':
          case '-serie':
            return ((vi1.serie ? vi1.serie * 100 + vi1.episode : 0) - (vi2.serie ? vi2.serie * 100 + vi2.episode : 0)) * direction;
          case '+length':
          case '-length':
            return ((vi1.movie ? vi1.movie.length : 0) - (vi2.movie ? vi2.movie.length : 0)) * direction;
        }
      });
    }

    this.setState({ videoInfos });
  }

  getVideoTitle(videoInfo) {
    return videoInfo.movie ? videoInfo.movie.title : videoInfo.videoInfos ? videoInfo.videoInfos[0].name : videoInfo.name;
  }

  playInVlc(videoFilePath, enqueue = false) {
    fetch(`http://localhost:${serverPort}/play-in-vlc`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoFilePath,
        enqueue,
      }),
    })
    .then((response) => response.json())
    .then((data) => console.info('playing', data))
    .catch((error) => console.error(error));
  }

  copyToClipboard(videoFilePath) {
    const copyText = document.createElement('input');
    copyText.value = videoFilePath;
    document.body.appendChild(copyText);
    copyText.select();
    document.execCommand("copy");
    document.body.removeChild(copyText);
  }

  render() {
    const creatorsOptions = [{ value: null, label: 'nobody' }, ...this.state.creators ? this.state.creators.map((creator) => ({ value: creator, label: creator })) : []];
    return (
      <div>
        <div className="row">
          <div className="col-sm">
            <h1>Movies</h1>
            {this.state.videoInfos && this.videoInfos ? (
              <p><strong>Number of movies:</strong> {this.state.videoInfos.length} / {this.videoInfos.length}</p>
            ) : null}
            <div className="alert alert-danger">Number of unrecognized: {this.videoInfos && this.videoInfos.filter((videoInfo) => !videoInfo.movie).length}</div>
          </div>
          <div className="col-sm">
          <div className="form-group">
            <form onSubmit={(event) => { event.preventDefault(); this.updateList()}}>
              <label htmlFor="searchInput">Search</label>
              <input type="search" className="form-control" id="searchInput" placeholder="Search" ref={(searchInput) => this.searchInput = searchInput}/>
            </form>
            <div>
              <div className="alert alert-dark random-videoInfo">
              <a href="" onClick={(event) => {
                event.preventDefault();
                this.searchInput.value = this.state.randomVideoInfo.videoTitle;
                this.updateList();
              }}>{this.state.randomVideoInfo ? this.state.randomVideoInfo.videoTitle : null}</a>
              </div>
              <button className="btn btn-info" onClick={(event) => {
                event.preventDefault();
                const randomIndex = Math.floor(Math.random() * this.videoInfos.length);
                this.setState({ randomVideoInfo: this.videoInfos[randomIndex] })
              }}>Randomize</button>
            </div>
          </div>
          </div>
        </div>
        <table className="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = this.sortBy === '+title' ? '-title' : '+title';
                        this.updateList();
                      }}>
                        Title
                        {this.sortBy && this.sortBy.substring(1) === 'title' && (this.sortBy[0] === '-' ? '⮟' : '⮝')}
                      </a>
                    </th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = this.sortBy === '+rating' ? '-rating' : '+rating';
                        this.updateList();
                      }}>
                        Rating
                        {this.sortBy && this.sortBy.substring(1) === 'rating' && (this.sortBy[0] === '-' ? '⮟' : '⮝')}
                      </a>
                    </th>
                    <th>Genre</th>
                    <th>Country</th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = this.sortBy === '+year' ? '-year' : '+year';
                        this.updateList();
                      }}>
                        Year
                        {this.sortBy && this.sortBy.substring(1) === 'year' && (this.sortBy[0] === '-' ? '⮟' : '⮝')}
                      </a>
                    </th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = this.sortBy === '+serie' ? '-serie' : '+serie';
                        this.updateList();
                      }}>
                        Serie
                        {this.sortBy && this.sortBy.substring(1) === 'serie' && (this.sortBy[0] === '-' ? '⮟' : '⮝')}
                      </a>
                    </th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = this.sortBy === '+length' ? '-length' : '+length';
                        this.updateList();
                      }}>
                        Length
                        {this.sortBy && this.sortBy.substring(1) === 'length' && (this.sortBy[0] === '-' ? '⮟' : '⮝')}
                      </a>
                    </th>
                    <th>Directors</th>
                    <th>Writers</th>
                    <th>Actors</th>
                    <th>Video</th>
                </tr>
                <tr>
                    <th></th>
                    <th></th>
                    <th>
                      <form onSubmit={(event) => { event.preventDefault(); this.updateList()}}>
                        <div className="form-group">
                          <input type="number" className="form-control input" placeholder="0 - min" ref={(minRatingInput) => this.minRatingInput = minRatingInput}/>
                          <input type="number" className="form-control input" placeholder="100 - max" ref={(maxRatingInput) => this.maxRatingInput = maxRatingInput}/>
                        </div>
                        <button type="submit" style={{ display: 'none' }}/>
                      </form>
                    </th>
                    <th>
                      {[...this.filterGenres, ''].map((selectedGenre, index) => (
                        <div className="form-group" key={selectedGenre}>
                          <select value={selectedGenre} className="form-control" onChange={(event) => {
                            this.filterGenres.splice(index, 1, ...event.target.value ? [event.target.value] : []);
                            this.updateList();
                          }}>
                            <option value={''}>-- genre --</option>
                            {[...selectedGenre ? [selectedGenre] : [], ..._.difference(this.state.genres, this.filterGenres)].map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                          </select>
                        </div>
                      ))}
                    </th>
                    <th>
                        <div className="form-group">
                          <select className="form-control" onChange={(event) => {
                            this.country = event.target.value;
                            this.updateList();
                          }}>
                            <option value={''}>-- country --</option>
                            {this.state.countries.map((country) => <option key={country} value={country}>{country}</option>)}
                          </select>
                        </div>
                    </th>
                    <th>
                      <form onSubmit={(event) => { event.preventDefault(); this.updateList()}}>
                        <div className="form-group">
                          <input type="number" className="form-control input" placeholder="min" ref={(minYearInput) => this.minYearInput = minYearInput}/>
                          <input type="number" className="form-control input" placeholder="max" ref={(maxYearInput) => this.maxYearInput = maxYearInput}/>
                        </div>
                        <button type="submit" style={{ display: 'none' }}/>
                      </form>
                    </th>
                    <th></th>
                    <th></th>
                    <th>
                      <AsyncSelect className="select" defaultOptions loadOptions={(inputValue, callback) => {
                        callback(
                          creatorsOptions
                            .filter((creatorOption) => creatorOption.label && creatorOption.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1)
                            .slice(0, 20)
                        );
                      }} onChange={(value) => {
                        this.director = value.value;
                        this.updateList();
                      }} options={creatorsOptions}/>
                    </th>
                    <th>
                      <AsyncSelect className="select" defaultOptions loadOptions={(inputValue, callback) => {
                        callback(
                          creatorsOptions
                            .filter((creatorOption) => creatorOption.label && creatorOption.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1)
                            .slice(0, 20)
                        );
                      }} onChange={(value) => {
                        this.writer = value.value;
                        this.updateList();
                      }} options={creatorsOptions}/>
                    </th>
                    <th>
                      <AsyncSelect className="select" defaultOptions loadOptions={(inputValue, callback) => {
                        callback(
                          creatorsOptions
                            .filter((creatorOption) => creatorOption.label && creatorOption.label.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1)
                            .slice(0, 20)
                        );
                      }} onChange={(value) => {
                        this.actor = value.value;
                        this.updateList();
                      }} options={creatorsOptions}/>
                    </th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
              {this.state.videoInfos
                ? this.state.videoInfos.slice(0, 100).map((videoInfo) => {
                  return <Fragment key={videoInfo.uid}>
                    {this.renderVideoInfo(videoInfo)}
                    {this.state.showVideosVideoInfo === videoInfo ? videoInfo.videoInfos.map((subVideoInfo) => this.renderVideoInfo(subVideoInfo, 'sub-video')) : null}
                  </Fragment>
                })
                : <tr><td colSpan={7}><h2>Loading</h2></td></tr>}
            </tbody>
        </table>
    </div>
    );
  }

  renderVideoInfo(videoInfo, className) {
    const currentVideoInfo = videoInfo.videoInfos
      ? videoInfo.videoInfos[0]
      : videoInfo;
    const videoLength = currentVideoInfo.videoInfo
      ? Math.round(currentVideoInfo.videoInfo.format.duration / 60)
      : null;
    const winLetter = currentVideoInfo.filePath
      ? currentVideoInfo.filePath.match(/^\/(\w)\//)[1]
      : null;
    const winFilePath = currentVideoInfo.filePath
      ? winLetter + ':' + currentVideoInfo.filePath.substring(2).replace(/\//g, '\\')
      : null;
    return (
      <tr key={videoInfo.uid} className={className}>
        <td title={videoInfo.movie ? videoInfo.movie.description : null}>
          <img src={videoInfo.movie ? `https://${videoInfo.movie.image}` : null} width={60}/>
        </td>
        <td title={videoInfo.movie ? videoInfo.movie.description : null} className={!videoInfo.movie ? 'bg-danger' : null}>
          <a href={videoInfo.movie ? videoInfo.movie.csfdOverviewLink : null} target="_blank">
            {videoInfo.videoTitle}
          </a>
        </td>
        <td>
          {videoInfo.movie ? videoInfo.movie.rating + '%' : null}
        </td>
        <td>
          {videoInfo.movie ? videoInfo.movie.genre.join(' / ') : null}
        </td>
        <td>
          {videoInfo.movie ? videoInfo.movie.country.join(' / ') : null}
        </td>
        <td>
          {videoInfo.movie ? videoInfo.movie.year : null}
        </td>
        <td>
          {typeof videoInfo.serie !== 'undefined' && typeof videoInfo.episode !== 'undefined' ? <span><strong>S{videoInfo.serie}</strong>&nbsp;<i>E{videoInfo.episode}</i></span> : null}
        </td>
        <td
          title={videoLength ? videoLength + ' min' : null}
          className={videoLength && videoInfo.movie && Math.abs(videoLength - videoInfo.movie.length) > 10 ? 'bg-danger' : (videoLength ? null : 'bg-warning')}
        >
          {videoInfo.movie ? videoInfo.movie.length + ' min' : null}
        </td>
        <td>
          {videoInfo.movie ? this.renderCreators(videoInfo, videoInfo.movie.directors) : null}
        </td>
        <td>
          {videoInfo.movie ? this.renderCreators(videoInfo, videoInfo.movie.writers) : null}
        </td>
        <td>
          {videoInfo.movie ? this.renderCreators(videoInfo, videoInfo.movie.actors) : null}
        </td>
        <td className="video-counts-wrapper" title={winFilePath}>
          {!videoInfo.videoInfos || videoInfo.videoInfos.length === 1 ? (
            <div>
              <a className="btn btn-sm btn-success" href={'file://' + winFilePath} onClick={(event) => {
                event.preventDefault();
                this.playInVlc(winFilePath);
              }} target="_blank">
                PLAY
              </a>
              <a className="btn btn-sm btn-primary" href={'file://' + winFilePath} onClick={(event) => {
                event.preventDefault();
                this.playInVlc(winFilePath, true);
              }} target="_blank">
                ENQUEUE
              </a>
              <a className="btn btn-sm btn-info" href={'file://' + winFilePath} onClick={(event) => {
                event.preventDefault();
                this.copyToClipboard(winFilePath);
              }}>
                Copy&nbsp;path
              </a>
            </div>
          ) : (
            <div className="video-counts">
              <a href="" onClick={(event) => {
                event.preventDefault();
                this.setState({ showVideosVideoInfo: videoInfo });
              }}>
                {videoInfo.videoInfos.length}
              </a>
            </div>
          )}
        </td>
      </tr>
    );
  }

  renderCreators(videoInfo, creators) {
    return (
      <div>
        {videoInfo.movie ? (
          this.state.showAllCreatorsVideoInfo === videoInfo
            ? creators.map((creator) => this.renderCreator(creator))
            : (creators.length > 0 ? this.renderCreator(creators[0]) : null)
        ) : null}
        <a href="" onClick={(event) => {
          event.preventDefault();
          this.setState({ showAllCreatorsVideoInfo: videoInfo });
        }}>...</a>
      </div>
    );
  }

  renderCreator(creator) {
    return <a key={creator.name} className="creator" target="_blank" href={creator.link}>{creator.name}</a>;
  }
}

export default App;
