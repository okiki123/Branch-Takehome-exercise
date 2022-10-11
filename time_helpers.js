const moment = require("moment");

function dateDiff(date1, date2) {
  const momentDate1 = moment(date1);
  const momentDate2 = moment(date2);

  return Math.abs(momentDate1.diff(momentDate2, "days"));
}

module.exports = {
  dateDiff: dateDiff,
};
