import { call, SagaGenerator, select } from 'typed-redux-saga'

import { getConnection } from './connection'
import { PublicKey, TransactionInstruction, Account } from '@solana/web3.js'
import { MintInfo, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { getWallet } from './wallet'
import { BN, Program } from '@project-serum/anchor'
import { tou64 } from '@consts/utils'

export function* createToken(
  decimals: number,
  freezeAuthority?: string,
  mintAuthority?: string
): SagaGenerator<string> {
  const wallet = yield* call(getWallet)
  const connection = yield* call(getConnection)

  const token = yield* call(
    [Token, Token.createMint],
    connection,
    new Account(),
    mintAuthority ? new PublicKey(mintAuthority) : wallet.publicKey,
    freezeAuthority ? new PublicKey(freezeAuthority) : null,
    decimals,
    TOKEN_PROGRAM_ID
  )
  const tokenPubKey = token.publicKey.toString() as string
  return tokenPubKey
}
export function* getTokenDetails(address: string): SagaGenerator<MintInfo> {
  const connection = yield* call(getConnection)
  const token = new Token(connection, new PublicKey(address), TOKEN_PROGRAM_ID, new Account())
  const info = yield* call([token, token.getMintInfo])
  return info
}

export function* mintToken(tokenAddress: string, recipient: string, amount: number): Generator {
  const wallet = yield* call(getWallet)
  const connection = yield* call(getConnection)
  const token = new Token(connection, new PublicKey(tokenAddress), TOKEN_PROGRAM_ID, new Account())
  // This should return txid in future
  yield* call([token, token.mintTo], new PublicKey(recipient), new Account(), [], amount)
}

export function* createTransferInstruction(
  tokenAddress: PublicKey,
  userAccount: PublicKey,
  destination: PublicKey,
  amount: BN
): SagaGenerator<TransactionInstruction> {
  const wallet = yield* call(getWallet)
  const connection = yield* call(getConnection)
  const token = new Token(connection, tokenAddress, TOKEN_PROGRAM_ID, new Account())
  return yield* call(
    [Token, Token.createTransferInstruction],
    token.programId,
    userAccount,
    destination,
    wallet.publicKey,
    [],
    tou64(amount)
  )
}
