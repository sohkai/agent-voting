const fs = require('fs')
const path = require('path')
const util = require('util')
const { isAddress } = require('web3-utils')

const { encodeCallsScript, encodeForward, encodeNewVote } = require('./encoding')

function help() {
  console.log('Usage: npm run create:vote -- <voting app address> <path to votes (see examples/)>')
}

async function parseArgs() {
  // First two args are node and name of script
  const [votingAddress, voteFilePath] = process.argv.slice(2, 4)

  if (!isAddress(votingAddress)) {
    console.error(`Error: specified voting address ${votingAddress}' is not a valid address.`)
    console.log()
    help()
    process.exit(0)
  }

  let votes
  try {
    const voteFileData = await util.promisify(fs.readFile)(voteFilePath, 'utf8')
    votes = JSON.parse(voteFileData)
  } catch (_) {
    // Handle afterwards
  }

  if (!Array.isArray(votes) || !votes.length) {
    console.error(`Error: votes file '${voteFilePath}' does not exist or did not contain an array of votes`)
    console.log()
    help()
    process.exit(0)
  }

  return {
    votingAddress,
    votes
  }
}

async function main() {
  // Check vars, local config
  const { votingAddress, votes } = await parseArgs()
  const encodedNewVotes = votes.map(
    ({ evmScript, title }) => ({ title, data: encodeNewVote(evmScript, title) })
  )

  console.log()
  console.log('Transaction data to create each vote:')
  encodedNewVotes.forEach(({ title, data }) => console.log(`  ${title}: ${data}`))

  const callsScriptActions = encodedNewVotes.map(({ data }) => ({
    to: votingAddress,
    data,
  }))

  const callsScript = encodeCallsScript(callsScriptActions)
  console.log()
  console.log('Calls script to create all votes:')
  console.log('  ', callsScript)

  const forwardData = encodeForward(callsScript)
  console.log()
  console.log('Transaction data to forward the calls script:')
  console.log('  ', forwardData)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
