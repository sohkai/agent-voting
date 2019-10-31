const fs = require('fs')
const path = require('path')
const util = require('util')
const { isAddress } = require('web3-utils')

const { encodeCallsScript, encodeExecute, encodeNewVote } = require('./encoding')

function help() {
  console.log("Usage: npm run create:vote -- <agent app address> <path to votes (see examples/)> <voting app address (optional; only required if votes don't specify one)>")
}

async function parseArgs() {
  // First two args are node and name of script
  const [agentAddress, voteFilePath, votingAddress] = process.argv.slice(2, 4)

  if (!isAddress(agentAddress)) {
    console.error(`Error: agent app address ${agentAddress}' is not a valid address.`)
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
    agentAddress,
    votesByApp
  }
}

async function main() {
  const { agentAddress, votesByApp } = await parseArgs()
  const encodedNewVotesByApp = Object.entries(votesByApp).reduce(
    (encodedVotes, [votingApp, votes]) => {
      encodedVotes[votingApp] = votes.map(
        ({ evmScript, title, votingApp }) => ({ title, data: encodeNewVote(evmScript, title), to: votingApp })
      )
      return encodedVotes
    },
    {}
  )

  // Generate transaction data to create each vote
  console.log()
  console.log('In case you need it, this is the transaction data to create each vote, grouped by voting app:')
  Object.entries(encodedNewVotesByApp).forEach(([votingApp, votes]) => {
    console.log(`  ${votingApp}:`)
    votes.forEach(({ title, data }) => console.log(`    ${title}: ${data}`))
  })

  // Generate calls scripts to create all votes in one transaction
  console.log()
  console.log('============================================================')
  console.log()
  console.log("You can create these votes in one transaction, by either:")
  console.log("  - Using `agent.forward()`")
  console.log('  - Using another script runner, like the Voting app, to call `agent.execute()` for each vote')
  console.log()
  console.log('The EVM calls scripts are provided below for each case.')
  console.log()
  console.log('============================================================')

  const newVoteActions = []
    .concat(...Object.values(encodedNewVotesByApp))
    .map(({ data, to }) => ({
      data,
      to,
    }))
  const newVotesCallsScript = encodeCallsScript(newVoteActions)
  console.log()
  console.log('EVM calls script to create all votes via `agent.forward()`:')
  console.log('  ', newVotesCallsScript)

  const executeActions = newVoteActions
    .map(({ to, data }) => ({
      to: agentAddress,
      data: encodeExecute(to, 0, data)
    }))

  const executeCallsScript = encodeCallsScript(executeActions)
  console.log()
  console.log('EVM calls script to create all votes via agent execution (using another script runner, e.g. `voting.newVote()`):')
  console.log('  ', executeCallsScript)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
