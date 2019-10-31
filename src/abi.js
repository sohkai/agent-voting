const AGENT_ABI = require('@aragon/apps-agent/abi/Agent.json').abi
const VOTING_ABI = require('@aragon/apps-voting/abi/Voting.json').abi

const EXECUTE_ABI =
  AGENT_ABI.find(interface =>
    interface.type === 'function' && interface.name === 'execute'
  )
const NEW_VOTE_ABI =
  VOTING_ABI.find(interface =>
    interface.type === 'function' && interface.name === 'newVote' && interface.inputs.length === 2
  )

module.exports = {
  EXECUTE_ABI,
  NEW_VOTE_ABI,
}
