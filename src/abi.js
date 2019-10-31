const FORWARDER_ABI = require('@aragon/os/abi/IForwarder.json').abi
const VOTING_ABI = require('@aragon/apps-voting/abi/Voting.json').abi

const FORWARD_ABI =
  FORWARDER_ABI.find(interface =>
    interface.type === 'function' && interface.name === 'forward'
  )
const NEW_VOTE_ABI =
  VOTING_ABI.find(interface =>
    interface.type === 'function' && interface.name === 'newVote' && interface.inputs.length === 2
  )

module.exports = {
  FORWARD_ABI,
  NEW_VOTE_ABI,
}
