import React, { Component } from 'react';
import _ from 'lodash';
import removeDiacritics from './removeDiacritics';
import './App.css';

class App extends Component {

  state = {
    countries: []
  };

  async componentDidMount() {
    const response = await fetch('videoInfos.json');
    this.videoInfos = await response.json();
    this.videoInfos.forEach((videoInfo) => {
      videoInfo.videoTitle = this.getVideoTitle(videoInfo);
      videoInfo.videoTitlePlain = removeDiacritics(videoInfo.videoTitle);
    });
    this.setState({ countries: _.uniq(_.flatten(this.videoInfos.filter((videoInfo) => videoInfo.movie).map((videoInfo) => videoInfo.movie.country))) });
    this.updateList();
  }

  updateList() {
    let videoInfos = this.videoInfos;

    const searchText = this.searchInput.value;
    if (searchText) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.videoTitlePlain.toLowerCase().indexOf(searchText.toLowerCase()) !== -1);
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
        switch (this.sortBy) {
          case 'title':
            return vi1.videoTitlePlain.toLowerCase().localeCompare(vi2.videoTitlePlain.toLowerCase());
          case 'rating':
            return (vi2.movie ? vi2.movie.rating : 0) - (vi1.movie ? vi1.movie.rating : 0);
          case 'year':
            return (vi1.movie ? vi1.movie.year : 0) - (vi2.movie ? vi2.movie.year : 0);
          case 'length':
            return (vi1.movie ? vi1.movie.length : 0) - (vi2.movie ? vi2.movie.length : 0);
        }
      });
    }

    this.setState({ videoInfos });
  }

  getVideoTitle(videoInfo) {
    return videoInfo.movie ? videoInfo.movie.title : videoInfo.name;
  }

  render() {
    return (
      <div className="container">
        <div className="row">
          <div className="col-sm">
            <h1>Movies</h1>
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
                        this.sortBy = 'title';
                        this.updateList();
                      }}>
                        Title
                      </a>
                    </th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = 'rating';
                        this.updateList();
                      }}>
                        Rating
                      </a>
                    </th>
                    <th>Genre</th>
                    <th>Country</th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = 'year';
                        this.updateList();
                      }}>
                        Year
                      </a>
                    </th>
                    <th>
                      <a href="" onClick={(event) => {
                        event.preventDefault();
                        this.sortBy = 'length';
                        this.updateList();
                      }}>
                        Length
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
                        </div>
                        <div className="form-group">
                          <input type="number" className="form-control" placeholder="100 - max" ref={(maxRatingInput) => this.maxRatingInput = maxRatingInput}/>
                        </div>
                        <button type="submit" style={{ display: 'none' }}/>
                      </form>
                    </th>
                    <th></th>
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
                        </div>
                        <div className="form-group">
                          <input type="number" className="form-control" placeholder="max" ref={(maxYearInput) => this.maxYearInput = maxYearInput}/>
                        </div>
                        <button type="submit" style={{ display: 'none' }}/>
                      </form>
                    </th>
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
                      <td title={videoInfo.movie ? videoInfo.movie.description : null}>
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
                      <td
                        title={videoLength ? videoLength + ' min' : null}
                        className={videoLength && videoInfo.movie && Math.abs(videoLength - videoInfo.movie.length) > 10 ? 'bg-danger' : (videoLength ? null : 'bg-warning')}
                      >
                        {videoInfo.movie ? videoInfo.movie.length + ' min' : null}
                      </td>
                      <td title={winFilePath}>
                        <a href={'file://' + winFilePath} target="_blank">
                          PLAY
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
