// React wrapper around d3 chart generation.
// This prepares the component for d3 to render it's chart into

import React from 'react';
import ReactDOM from 'react-dom';
import Chart from './chart';

class ReactChart extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      width: 0
    };

    this._id = _.uniqueId('sparkline-');
  }

  componentDidMount() {
    const el = ReactDOM.findDOMNode(this);
    this.chart = new Chart(el, {
      height: 60,
      limit: this.props.limit,
      units: this.props.units,
      timespan: this.props.timespan
    }, this.getChartState());

    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  componentDidUpdate() {
    const el = ReactDOM.findDOMNode(this);
    this.chart.update(el, this.getChartState());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  handleResize() {
    this.setState({
      width: ReactDOM.findDOMNode(this).offsetWidth
    });
  }

  getChartState() {
    return {
      data: this.props.data,
      width: this.state.width
    };
  }

  render() {
    return (
      <div className="chart">
        <svg width="100%" height="100%">
          <defs>
            <linearGradient id={this._id + '-gradient'} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f84d1" stopOpacity="1" />
              <stop offset="100%" stopColor="#b6e2ff" stopOpacity="1" />
            </linearGradient>
            <clipPath id={this._id + '-clip-path'}>
              <path className="chart__area" />
            </clipPath>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%" fillOpacity="0.5"
            fill={`url(${window.location.pathname}#${this._id}-gradient)`}
            clipPath={`url(${window.location.pathname}#${this._id}-clip-path`} />
          <line className="chart__limit-line chart__limit-line-before" x1="0" x2="3" style={{display: 'none'}} />
          <line className="chart__limit-line chart__limit-line-after" style={{display: 'none'}} />
          <text className="chart__text chart__limit-text" style={{display: 'none'}} />
          <g className="chart__tip-group" style={{display: 'none'}}>
            <circle className="chart__tip" r="3" />
            <rect className="chart__tip-text-bg" />
            <g className="chart__tip-text-group">
              <text className="chart__text chart__value chart__tip-data" dy="9" />
              <text className="chart__text chart__date chart__tip-data" dy="23" />
            </g>
          </g>
          <rect className="chart__mouse-trigger" width="100%" height="100%" fill="none" style={{pointerEvents: 'all'}} />
        </svg>
      </div>
    );
  }
}
ReactChart.propTypes = {
  data: React.PropTypes.array,
  limit: React.PropTypes.number,
  units: React.PropTypes.string,
  timespan: React.PropTypes.number
}

export default ReactChart;
