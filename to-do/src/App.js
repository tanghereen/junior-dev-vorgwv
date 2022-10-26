import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import './style.css';
import './favicon.ico';
class App extends Component {
  render() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={'./favicon.ico'} className="App-logo" alt="logo" />
        <p>
          Hello, World!
        </p>
        <a href="https:/reactjs.org" className="App-link" target="_blank" rel="noopener noreferrer">
          Learn React
        </a>
      </header>
    </div>
  );
}
}
export default App;
