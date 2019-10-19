import moment from 'moment';

export function seconds_to_duration(seconds) {
  // Returns a human-readable duration string
  var hrs = Math.floor(seconds / 60 / 60);
  var min = Math.floor((seconds / 60) % 60);
  var sec = Math.floor(seconds % 60);
  let l = [];
  if (hrs != 0) l.push(hrs + 'h');
  if (min != 0) l.push(min + 'm');
  if (sec != 0 || l.length == 0) l.push(sec + 's');
  return l.join(' ');
}

export function friendlydate(timestamp) {
  let now = moment();
  let m = moment.parseZone(timestamp);
  let sinceNow = moment.duration(m.diff(now));
  if (-sinceNow.asSeconds() <= 60) {
    return `${Math.round(-sinceNow.asSeconds())}s ago`;
  } else if (-sinceNow.asSeconds() <= 60 * 60 * 24) {
    return sinceNow.humanize(true);
  }
  return sinceNow.humanize(true);
}

export function get_day_start_with_offset(dateParam) {
  var dateMoment = dateParam ? moment(dateParam) : moment().startOf('day');
  var start_of_day = localStorage.startOfDay;
  var start_of_day_hours = parseInt(start_of_day.split(':')[0]);
  var start_of_day_minutes = parseInt(start_of_day.split(':')[1]);
  return dateMoment
    .hour(start_of_day_hours)
    .minute(start_of_day_minutes)
    .format();
}

export function get_day_end_with_offset(date) {
  return moment(get_day_start_with_offset(date))
    .add(1, 'days')
    .format();
}

export function get_day_period(date) {
  return get_day_start_with_offset(date) + '/' + get_day_end_with_offset(date);
}

export function get_day_start(datestr) {
  // Get start time of date
  var datestart = moment(datestr);
  datestart.set('hour', 0);
  datestart.set('minute', 0);
  datestart.set('second', 0);
  datestart.set('millisecond', 0);
  return datestart;
}

export function get_prev_day(datestr) {
  return moment(datestr).add(-1, 'days');
}

export function get_next_day(datestr) {
  return moment(datestr).add(1, 'days');
}
