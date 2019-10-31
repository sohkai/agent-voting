const fs = require('fs')
const path = require('path')
const util = require('util')
const { isAddress } = require('web3-utils')

const { encodeCallsScript, encodeForward, encodeNewVote } = require('./encoding')

function help() {
  console.log("Usage: npm run create:vote -- <path to votes (see examples/)> <voting app address (optional; only required if votes don't specify one)>")
}

async function parseArgs() {
  // First two args are node and name of script
  const [voteFilePath, votingAddress] = process.argv.slice(2, 4)

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

  const votingApps = new Set(votes.map(({ votingApp = 'none' }) => votingApp))

  // Check for errors based on combination of votingApp being declared in votes and given voting
  // app address
  if (votingApps.size > 1 && votingApps.has('none')) {
    console.error("Error: all votes must declare a 'votingApp' key")
    console.log()
    help()
    process.exit(0)
  } else if (votingApps.size === 1 && votingApps.has('none') && !votingAddress) {
    console.error(`Error: voting app address must be given if votingApp is not declared in '${voteFilePath}'`)
    console.log()
    help()
    process.exit(0)
  }
  if (votingAddress) {
    if (votingApps.size !== 1 && !votingApps.has('none')) {
      console.error(`Error: voting app address was given despite votingApp being declared in '${voteFilePath}'`)
      console.log()
      help()
      process.exit(0)
    }

    if (!isAddress(votingAddress)) {
      console.error(`Error: voting app address ${votingAddress}' is not a valid address.`)
      console.log()
      help()
      process.exit(0)
    }

    votes = votes.map(vote => ({ ...vote, votingApp: votingAddress }))
  }

  const votesByApp = votes.reduce((byApp, vote) => {
    byApp[vote.votingApp] = byApp[vote.votingApp] || []
    byApp[vote.votingApp].push(vote)
    return byApp
  }, {})

  return {
    votesByApp
  }
}

async function main() {
  const { votesByApp } = await parseArgs()
  const encodedNewVotesByApp = Object.entries(votesByApp).reduce(
    (encodedVotes, [votingApp, votes]) => {
      encodedVotes[votingApp] = votes.map(
        ({ evmScript, title, votingApp }) => ({ title, data: encodeNewVote(evmScript, title), to: votingApp })
      )
      return encodedVotes
    },
    {}
  )

  console.log()
  console.log('Transaction data to create each vote, grouped by voting app:')
  Object.entries(encodedNewVotesByApp).forEach(([votingApp, votes]) => {
    console.log(`  ${votingApp}:`)
    votes.forEach(({ title, data }) => console.log(`    ${title}: ${data}`))
  })

  const callsScriptActions = []
    .concat(...Object.values(encodedNewVotesByApp))
    .map(({ data, to }) => ({
      data,
      to,
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
