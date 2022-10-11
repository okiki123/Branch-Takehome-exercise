let _ = require("lodash");
let moment = require("moment");
const fs = require("fs");
let { dateDiff } = require("./time_helpers");

let k;
let approvedId = [];
let defaultedUsers = {};
let approvedLoans = [];
let dailyBalance;
let repaymentsByDay = {};

function run(file, startCapital, maxActiveLoan) {
  let data = fs.readFileSync(file, "utf-8");
  dailyBalance = startCapital;
  k = maxActiveLoan;
  data = JSON.parse(data);
  data = _.orderBy(data, ["disbursement_date"], ["asc"]);

  // group all the disbursement by day
  let disbursementByDay = _(data)
    .groupBy((application) => application.disbursement_date)
    .value();

  const day = new Date("2020-01-01");
  const nextYear = new Date("2021-01-01");
  // Iterate from Jan 1 2020 to December 31st 2020 and handle requests
  // for each day and also update the daily balance
  while (day < nextYear) {
    const formattedDate = moment(day).format("YYYY-MM-DD"); // e.g 2020-05-02

    updateDailyBalance(formattedDate);
    // check if there is a disbursement for that day, if there is then handle all the applications for that day
    if (disbursementByDay.hasOwnProperty(formattedDate)) {
      handleDailyApplications(disbursementByDay[formattedDate]);
    }
    day.setDate(day.getDate() + 1); // increment the day by 1 i.e go to the next day
  }

  writeResultsToCSV();
}

function updateDailyBalance(formattedDate) {
  // If there is a repayment for that day, then update the repayment balance for that day
  if (repaymentsByDay.hasOwnProperty(formattedDate)) {
    dailyBalance += repaymentsByDay[formattedDate];
  }
}

function handleDailyApplications(applications) {
  applications.forEach(handle);
}

function handle(application) {
  if (willApprove(application)) {
    if (willDefault(application))
      defaultedUsers[application.customer_id] = true;
    approvedLoans.push(application);
    dailyBalance -= application.principal;
    registerRepayments(application.repayments);
    registerLoan(application.application_id);
  }
}

function willApprove(application) {
  if (2020 !== new Date(application.disbursement_date).getFullYear())
    return false;
  if (dailyBalance <= 0) return false; // Balance is less than 0
  if (application.principal > dailyBalance) return false; // Principal is greater than balance
  if (
    !application.hasOwnProperty("repayments") ||
    _.isEmpty(application.repayments)
  )
    return false; // Customer did not make repayment
  if (!willFullyRepay(application)) return false;
  if (defaultedUsers.hasOwnProperty(application.customer_id)) return false;

  const activeLoans = getActiveLoans(application.disbursement_date);
  if (activeLoans.length >= k) return false; // Active loan is more than necessary
  if (activeLoans.some((item) => item.customer_id === application.customer_id))
    return false;

  return true;
}

function getLastRepaymentDate(application) {
  const sortedApplication = _.orderBy(
    application.repayments,
    ["date"],
    ["desc"]
  ); // sorted in descending order
  return sortedApplication[0].date;
}

function willFullyRepay(application) {
  const totalToPay = application.principal + application.fee;
  const totalRepaymentAmount = application.repayments.reduce(
    (total, repayment) => {
      const date = new Date(repayment.date);
      if (2020 === date.getFullYear()) return total + repayment.amount;
      return total;
    },
    0
  );

  return totalRepaymentAmount >= totalToPay;
}

function willDefault(application) {
  const lastRepaymentDate = getLastRepaymentDate(application);
  return dateDiff(application.disbursement_date, lastRepaymentDate) > 90;
}

function isActiveLoan(application, date) {
  const numOfDaysSinceDisbursed = dateDiff(application.disbursement_date, date);
  const lastRepaymentDate = getLastRepaymentDate(application);

  return (
    numOfDaysSinceDisbursed <= 90 &&
    moment(lastRepaymentDate).isAfter(moment(date))
  );
}

function getActiveLoans(date) {
  return approvedLoans.filter((application) => isActiveLoan(application, date));
}

function registerRepayments(repayments) {
  repayments.forEach((repayment) => {
    const formattedDate = moment(repayment.date).format("YYYY-MM-DD"); // e.g 2020-05-02
    if (repaymentsByDay.hasOwnProperty(formattedDate)) {
      // Here we have previously added a repayment for that date, so we just update the repayment amount
      // for that day
      repaymentsByDay[formattedDate] += repayment.amount;
    } else {
      // There is no previous repayment for that day so just simply create a new one
      repaymentsByDay[formattedDate] = repayment.amount;
    }
  });
}

function registerLoan(id) {
  approvedId.push(id);
}

function writeResultsToCSV() {
  const data = approvedId.reduce(
    (result, id) => result + `${id.toString()}\n`,
    ""
  ); // [1, 2, 3] => "1\n2\n3\n"
  fs.writeFile("output.csv", data, function (err) {
    if (err) throw err;
  });
}

module.exports = run;
