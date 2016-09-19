// The overall wrapping component for sparklines.
// This handles the data, headings, and statistics, while passing
// on the actual chart rendering to other classes. This could make
// way for there to be multiple ways to display the same
// data/widget (such as a bar graph instead of lines)

import React from 'react';
import * as d3 from 'd3';
import ReactChart from './react-chart';
import { register } from '../react-wrapper';
import { Loading, discoverService } from '../utils';
import units from '../utils/units';

const states = {
  LOADING: 'loading',
  NOTAVAILABLE: 'notavailable',
  TIMEDOUT: 'timedout',
  NODATA: 'nodata',
  BROKEN: 'broken',
  LOADED: 'loaded'
}

const timespan = 60 * 60 * 1000; // 1 hour

class SparklineWidget extends React.Component {
  constructor() {
    super();
    this.updateInProgress = false;
    this.interval = null;
    this.state = {
      data: [],
      showStats: false,
      sortedValues: [],
      state: states.LOADING
    }
  }

  componentWillMount() {
    this.setState({
      state: states.LOADING
    });
    this.update();
    this.interval = setInterval(this.update.bind(this), 30 * 1000);
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    clearInterval(this.interval);
  }

  // UX: when a user clicks "retry", it's possible that we'll
  // have a response immediately (< 100ms). While this is good
  // for performance, the user won't see the loading state,
  // which may lead them to believe their "retry" action didn't
  // actually do any work.
  // Adding a brief delay alleviates this
  retry() {
    this.setState({
      state: states.LOADING
    });

    setTimeout(this.update.bind(this), 300);
  }

  update() {
    if (this.updateInProgress) {
      // prevent pile-ups
      return;
    }
    this.updateInProgress = true;

    discoverService({
      serviceName: 'prometheus',
      available: this.doUpdate.bind(this),
      unavailable: this.doUnavailable.bind(this)
    });
  }

  doUnavailable() {
    this.updateInProgress = false;
    clearInterval(this.interval);
    this.setState({
      state: states.NOTAVAILABLE
    });
  }

  doUpdate(baseURL) {
    const end = Date.now();
    const start = end - (timespan);

    $.ajax(`${basePath}/api/v1/query_range?query=${this.props.query}&start=${start / 1000}&end=${end / 1000}&step=30`)
      .done((json) => {
        if (!this._isMounted) {
          return;
        }

        if (json.status !== 'success') {
          this.setState({
            state: states.BROKEN
          });
          return;
        }
        if (json.data.result.length < 1 || json.data.result[0].values < 1) {
          this.setState({
            state: states.NODATA
          });
          return;
        }
        this.updateData(json.data.result[0].values);
      })
      .fail((jqXHR, textStatus) => {
        if (!this._isMounted) {
          return;
        }

        if (textStatus === 'timeout') {
          this.setState({
            state: states.TIMEDOUT
          });
        }
        this.setState({
          state: states.BROKEN
        });
      })
      .always(() => {
        this.updateInProgress = false;
      });
  }

  updateData(newData) {
    const data = newData.map((item) => {
      return {
        date: item[0],
        value: item[1],
      }
    });

    const sortedValues = _.map(_.sortBy(data, (item) => item.value), 'value');
    this.setState({
      data,
      sortedValues,
      state: states.LOADED
    });
  }

  isState(s) {
    return this.state.state === s;
  }

  setShowStats(value) {
    this.setState({
      showStats: value
    });
  }

  render() {
    return <div className="co-sparkline">
      <div className="widget__header">
        <span className="widget__title">{this.props.heading}</span>
        <span className="widget__timespan">1h</span>
        { this.isState(states.LOADED)
          ? <i className="widget__data-toggle fa fa-table widget__data-toggle--enabled" onMouseOver={this.setShowStats.bind(this, true)} onMouseOut={this.setShowStats.bind(this, false)}></i>
          : <i className="widget__data-toggle fa fa-table"></i>
        }
      </div>
      <div className="widget__content">
        { this.isState(states.LOADING) && <Loading /> }
        { this.isState(states.NOTAVAILABLE) && <p className="widget__text">Monitoring is not available for this cluster</p> }
        { this.isState(states.TIMEDOUT) && <p className="widget__text"><i className="fa fa-question-circle"></i>Request timed out. <a className="widget__link" onClick={this.retry.bind(this)}>Retry</a></p> }
        { this.isState(states.NODATA) && <p className="widget__text">No data found</p> }
        { this.isState(states.BROKEN) && <p className="widget__text widget__text--error"><i className="fa fa-ban"></i>Monitoring is misconfigured or broken</p> }
        { this.isState(states.LOADED) && <ReactChart
          data={this.state.data}
          limit={this.props.limit}
          units={this.props.units}
          timespan={timespan} /> }
        { this.isState(states.LOADED) &&
          <div className={this.state.showStats ? 'stats stats--in' : 'stats'}>
            <dl className="stats__item">
              <dt className="stats__item-title">Limit</dt>
              <dd className="stats__item-value">{this.props.limit ? units.humanize(this.props.limit, this.props.units, true).string : 'None'}</dd>
            </dl>
            <dl className="stats__item">
              <dt className="stats__item-title">Median</dt>
              <dd className="stats__item-value">{units.humanize(d3.median(this.state.data, (d) => d.value), this.props.units, true).string}</dd>
            </dl>
            <dl className="stats__item">
              <dt className="stats__item-title">95th Perc.</dt>
              <dd className="stats__item-value">{units.humanize(d3.quantile(this.state.sortedValues, 0.95), this.props.units, true).string}</dd>
            </dl>
            <dl className="stats__item">
              <dt className="stats__item-title">Latest</dt>
              <dd className="stats__item-value">{units.humanize(this.state.data[this.state.data.length - 1].value, this.props.units, true).string}</dd>
            </dl>
          </div>
        }
      </div>
    </div>;
  }
}
SparklineWidget.propTypes = {
  heading: React.PropTypes.string,
  testState: React.PropTypes.string,
  query: React.PropTypes.string,
  limit: React.PropTypes.number,
  units: React.PropTypes.string
}

register('sparklinewidget', SparklineWidget);
export { SparklineWidget };
