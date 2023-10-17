import { CrossChainMessenger } from '@eth-optimism/sdk'
import { providers } from 'ethers'
import { createPublicClient, http } from 'viem'
import { base, mainnet } from 'viem/chains'
import { bench, describe } from 'vitest'
import { forkUrl, rollupForkUrl } from '../../../_test/constants.js'
import { baseAddresses } from '../../../chains/index.js'
import { getOutputForL2Block } from '../L1/getOutputForL2Block.js'
import { getProveWithdrawalTransactionArgs } from './getProveWithdrawalTransactionArgs.js'
import { getWithdrawalMessages } from './getWithdrawalMessages.js'

describe('Computes L1 prove args from L2 tx hash', () => {
  const hash = '0xd0eb2a59f3cc4c61b01c350e71e1804ad6bd776dc9abc1bdb5e2e40695ab2628'
  bench(
    'op-viem: `getWithdrawalMessages, getOutputForL2Block, getProveArgsForWithdrawal`',
    async () => {
      // cannot currently use anvil rollupPublicClient for this as eth_getProof isn't working
      const client = createPublicClient({
        chain: base,
        transport: http(),
      })

      const withdrawalMessages = await getWithdrawalMessages(client, {
        hash,
      })

      const l1Client = createPublicClient({
        chain: mainnet,
        transport: http(),
      })

      const output = await getOutputForL2Block(l1Client, {
        l2BlockNumber: withdrawalMessages.blockNumber,
        ...baseAddresses,
      })

      await getProveWithdrawalTransactionArgs(client, {
        message: withdrawalMessages.messages[0],
        output: output,
      })
    },
  )

  bench(
    '@eth-optimism/sdk: `getBedrockMessageProof`',
    async () => {
      const ethersProvider = new providers.JsonRpcProvider(
        forkUrl,
      )
      const ethersRollupProvider = new providers.JsonRpcProvider(
        rollupForkUrl,
      )
      const messenger = new CrossChainMessenger({
        l1ChainId: mainnet.id,
        l2ChainId: base.id,
        l1SignerOrProvider: ethersProvider,
        l2SignerOrProvider: ethersRollupProvider,
      })
      await messenger.getBedrockMessageProof(hash)
    },
  )
})
