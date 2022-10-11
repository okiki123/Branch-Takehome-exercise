#!/usr/bin/env node

const yargs = require('yargs/yargs')
const run = require('../index')

const options = yargs(process.argv.slice(2))
  .usage('Usage: loan_app -f=<file_path> -N=<start-capital> -K=<max-active-loan>')
  .options({
    file: { demandOption: true, alias: 'f', describe: 'Path to file containing list of applications' },
    'start-capital': { demandOption: true, alias: 'N', describe: 'The Start Capital', type: 'number' },
    'max-active-loan': { demandOption: true, alias: 'K', describe: 'The maximum active loan allowed at any time', type: 'number' },
  })
  .scriptName('loan_app')
  .argv;

if (isNaN(options.N)) {
  console.log('The start-capital is not a valid number')
} else if (isNaN(options.K)) {
  console.log('The max-active-loan is not a valid number')
} else {
  console.log('Processing applications...')
  run(options.file, options.N, options.K)
  console.log('Finished Processing application, results available in output.csv')
}



