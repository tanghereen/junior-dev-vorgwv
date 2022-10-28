import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
export { default, SwipeableViewsContext } from './SwipeableViews';


ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();