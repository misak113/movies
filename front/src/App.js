import React, { Component } from 'react';
import './App.css';

class App extends Component {

  state = {};

  async componentDidMount() {
    const response = await fetch('videoInfos.json');
    const videoInfos = await response.json();
    this.setState({ videoInfos });
  }

  render() {
    return (
      <div className="container">
        <h1>Movies</h1>
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
                          {videoInfo.movie ? videoInfo.movie.title : videoInfo.name}
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
