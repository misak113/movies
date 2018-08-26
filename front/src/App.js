import React, { Component } from 'react';
import _ from 'lodash';
import removeDiacritics from './removeDiacritics';
import './App.css';
const serverPort = 4000;

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
      videoInfo.videoTitle = this.getVideoTitle(videoInfo);
      videoInfo.videoTitlePlain = removeDiacritics(videoInfo.videoTitle);
    });
    this.setState({
      countries: _.uniq(_.flatten(this.videoInfos.filter((videoInfo) => videoInfo.movie).map((videoInfo) => videoInfo.movie.country))),
      genres: _.uniq(_.flatten(this.videoInfos.filter((videoInfo) => videoInfo.movie).map((videoInfo) => videoInfo.movie.genre))),
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
    return videoInfo.movie ? videoInfo.movie.title : videoInfo.name;
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

  render() {
    return (
      <div className="container">
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
                    <th>Video</th>
                </tr>
                <tr>
                    <th></th>
                    <th></th>
                    <th>
                      <form onSubmit={(event) => { event.preventDefault(); this.updateList()}}>
                        <div className="form-group">
                          <input type="number" className="form-control" placeholder="0 - min" ref={(minRatingInput) => this.minRatingInput = minRatingInput}/>
                          <input type="number" className="form-control" placeholder="100 - max" ref={(maxRatingInput) => this.maxRatingInput = maxRatingInput}/>
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
                          <input type="number" className="form-control" placeholder="min" ref={(minYearInput) => this.minYearInput = minYearInput}/>
                          <input type="number" className="form-control" placeholder="max" ref={(maxYearInput) => this.maxYearInput = maxYearInput}/>
                        </div>
                        <button type="submit" style={{ display: 'none' }}/>
                      </form>
                    </th>
                    <th></th>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
              {this.state.videoInfos
                ? this.state.videoInfos.map((videoInfo) => {
                  const videoLength = videoInfo.videoInfo ? Math.round(videoInfo.videoInfo.format.duration / 60) : null;
                  const winLetter = videoInfo.filePath.match(/^\/(\w)\//)[1];
                  const winFilePath = winLetter + ':' + videoInfo.filePath.substring(2).replace(/\//g, '\\');
                  return (
                    <tr key={videoInfo.filePath}>
                      <td title={videoInfo.movie ? videoInfo.movie.description : null}>
                        <img src={videoInfo.movie ? videoInfo.movie.image : null} width={60}/>
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
                      <td title={winFilePath}>
                        <a className="btn btn-sm btn-success" href={'file://' + winFilePath} onClick={() => this.playInVlc(winFilePath)} target="_blank">
                          PLAY
                        </a>
                        <a className="btn btn-sm btn-primary" href={'file://' + winFilePath} onClick={() => this.playInVlc(winFilePath, true)} target="_blank">
                          ENQUEUE
                        </a>
                      </td>
                    </tr>
                  );
                })
                : <tr><td colSpan={7}><h2>Loading</h2></td></tr>}
            </tbody>
        </table>
    </div>
    );
  }
}

export default App;
