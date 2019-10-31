# Manage votes from an Agent app

⁉️  Don't know what an Agent app is? [Check out all its possibilities](http://aragon.org/agent)!

🚧 At the moment, you are only able to generate transaction data to create votes from an Agent.

## Usage

1. Install node.js 8+
1. Clone this repo, do an npm install inside of it
1. Set up the votes you'd like an Agent to create (see the [examples](./examples))
1. Run `npm run create:vote -- <agent app address> <path to votes (see examples/)> <voting app address (optional; only required if votes don't specify one)>`
1. Depending on how you'd like to create votes:
  - Via `agent.execute()`: send transactions to `agent.execute()` with the voting address and each vote's transaction data
  - Via `agent.forward()`: send a single transaction to `agent.forward()` with the forwarding data
