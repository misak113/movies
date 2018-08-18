import React, { Component } from 'react';
import removeDiacritics from './removeDiacritics';
import './App.css';

class App extends Component {

  state = {};

  async componentDidMount() {
    const response = await fetch('videoInfos.json');
    this.videoInfos = await response.json();
    this.videoInfos.forEach((videoInfo) => {
      videoInfo.videoTitle = this.getVideoTitle(videoInfo);
      videoInfo.videoTitlePlain = removeDiacritics(videoInfo.videoTitle);
    });
    this.updateList();
  }

  updateList() {
    let videoInfos = this.videoInfos;

    const searchText = this.searchInput.value;
    if (searchText) {
      videoInfos = videoInfos.filter((videoInfo) => videoInfo.videoTitlePlain.toLowerCase().indexOf(searchText.toLowerCase()) !== -1);
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
          <div class="form-group">
            <form onSubmit={(event) => { event.preventDefault(); this.updateList()}}>
              <label for="searchInput">Search</label>
              <input type="search" className="form-control" id="searchInput" placeholder="Search" ref={(searchInput) => this.searchInput = searchInput}/>
            </form>
          </div>
          </div>
        </div>
        <table className="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Title</th>
                    <th>Rating</th>
                    <th>Genre</th>
                    <th>Country</th>
                    <th>Year</th>
                    <th>Length</th>
                    <th>Video</th>
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
