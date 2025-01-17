/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { call, put, SagaGenerator, select, all, spawn, takeEvery } from 'typed-redux-saga'
import { actions as snackbarsActions } from '@reducers/snackbars'
import { actions } from '@reducers/exchange'
import {
  collateralAccount,
  collateralToken,
  userAccountAddress,
  xUSDAddress,
  mintAuthority,
  swap,
  exchangeAccount
} from '@selectors/exchange'
import { accounts, tokenAccount } from '@selectors/solanaWallet'
import testAdmin from '@consts/testAdmin'
import * as anchor from '@project-serum/anchor'
import { DEFAULT_PUBLICKEY } from '@consts/static'
import {
  Account,
  TransactionInstruction,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  sendAndConfirmRawTransaction
} from '@solana/web3.js'
import { pullAssetPrices } from './oracle'
import { createAccount, getToken, getWallet, sleep, signAndSend } from './wallet'
import { BN, Program } from '@project-serum/anchor'
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { tou64 } from '@consts/utils'
import { getExchangeProgram } from '@web3/programs/exchange'
import { getConnection } from './connection'

export function* pullExchangeState(): Generator {
  const exchangeProgram = yield* call(getExchangeProgram)
  const state = yield* call([exchangeProgram, exchangeProgram.getState])
  yield* put(actions.setState(state))
  const token = yield* call(getToken, state.collateralToken)
  const accountInfo = yield* call([token, token.getAccountInfo], state.collateralAccount)
  yield* put(actions.setCollateralAccountBalance(accountInfo.amount))
  yield* call(pullAssetPrices)
}
export function* getCollateralTokenAirdrop(): Generator {
  const wallet = yield* call(getWallet)
  const collateralTokenAddress = yield* select(collateralToken)
  const tokensAccounts = yield* select(accounts)
  const collateralTokenProgram = yield* call(getToken, collateralTokenAddress)
  let accountAddress = tokensAccounts[collateralTokenAddress.toString()]
    ? tokensAccounts[collateralTokenAddress.toString()][0].address
    : null
  if (accountAddress == null) {
    accountAddress = yield* call(createAccount, collateralTokenProgram.publicKey)
  }
  const ix = Token.createMintToInstruction(
    TOKEN_PROGRAM_ID,
    collateralTokenAddress,
    accountAddress,
    testAdmin.publicKey,
    [],
    1e8
  )
  const tx = new Transaction().add(ix)
  const connection = yield* call(getConnection)
  const blockhash = yield* call([connection, connection.getRecentBlockhash])
  tx.feePayer = wallet.publicKey
  tx.recentBlockhash = blockhash.blockhash
  tx.sign(testAdmin)
  const signedTx = yield* call([wallet, wallet.signTransaction], tx)
  yield* call([connection, connection.sendRawTransaction], signedTx.serialize(), {
    skipPreflight: true
  })

  console.log('Token Airdroped')
}
export function* depositCollateral(amount: BN): SagaGenerator<string> {
  const collateralTokenAddress = yield* select(collateralToken)
  const tokensAccounts = yield* select(accounts)
  const userCollateralTokenAccount = tokensAccounts[collateralTokenAddress.toString()][0]
  const userExchangeAccount = yield* select(exchangeAccount)
  const wallet = yield* call(getWallet)
  const exchangeProgram = yield* call(getExchangeProgram)
  if (userExchangeAccount.address.equals(DEFAULT_PUBLICKEY)) {
    const { account, ix } = yield* call(
      [exchangeProgram, exchangeProgram.createExchangeAccountInstruction],
      new PublicKey(wallet.publicKey.toBuffer())
    )
    const depositIx = yield* call([exchangeProgram, exchangeProgram.depositInstruction], {
      amount,
      exchangeAccount: account,
      userCollateralAccount: userCollateralTokenAccount.address
    })
    const approveIx = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      userCollateralTokenAccount.address,
      exchangeProgram.exchangeAuthority,
      wallet.publicKey,
      [],
      tou64(amount)
    )
    const tx = new Transaction().add(ix).add(approveIx).add(depositIx)
    const connection = yield* call(getConnection)
    const blockhash = yield* call([connection, connection.getRecentBlockhash])
    tx.feePayer = wallet.publicKey
    tx.recentBlockhash = blockhash.blockhash
    const signedTx = yield* call([wallet, wallet.signTransaction], tx)

    yield* put(
      actions.setExchangeAccount({
        address: account,
        collateralShares: new BN(0),
        debtShares: new BN(0)
      })
    )
    const signature = yield* call(sendAndConfirmRawTransaction, connection, signedTx.serialize())
    yield* call(sleep, 1500) // Give time to subscribe to account
    return signature
  } else {
    const depositIx = yield* call([exchangeProgram, exchangeProgram.depositInstruction], {
      amount,
      exchangeAccount: userExchangeAccount.address,
      userCollateralAccount: userCollateralTokenAccount.address
    })
    const approveIx = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      userCollateralTokenAccount.address,
      exchangeProgram.exchangeAuthority,
      wallet.publicKey,
      [],
      tou64(amount)
    )
    const tx = new Transaction().add(approveIx).add(depositIx)
    const connection = yield* call(getConnection)
    const blockhash = yield* call([connection, connection.getRecentBlockhash])
    tx.feePayer = wallet.publicKey
    tx.recentBlockhash = blockhash.blockhash
    const signedTx = yield* call([wallet, wallet.signTransaction], tx)
    const signature = yield* call(sendAndConfirmRawTransaction, connection, signedTx.serialize())
    return signature
  }
}

export function* mintUsd(amount: BN): SagaGenerator<string> {
  const usdTokenAddress = yield* select(xUSDAddress)
  const tokensAccounts = yield* select(accounts)
  const exchangeProgram = yield* call(getExchangeProgram)
  const wallet = yield* call(getWallet)
  const userExchangeAccount = yield* select(exchangeAccount)
  let accountAddress = tokensAccounts[usdTokenAddress.toString()]
    ? tokensAccounts[usdTokenAddress.toString()][0].address
    : null
  if (accountAddress == null) {
    accountAddress = yield* call(createAccount, usdTokenAddress)
  }
  const signature = yield* call([exchangeProgram, exchangeProgram.mint], {
    amount,
    exchangeAccount: userExchangeAccount.address,
    owner: wallet.publicKey,
    to: accountAddress
  })
  return signature[1]
}
export function* withdrawCollateral(amount: BN): SagaGenerator<string> {
  const collateralTokenAddress = yield* select(collateralToken)
  const collateralAccountAddress = yield* select(tokenAccount(collateralTokenAddress))

  const exchangeProgram = yield* call(getExchangeProgram)
  const userExchangeAccount = yield* select(exchangeAccount)
  const wallet = yield* call(getWallet)
  if (!collateralAccountAddress) {
    throw new Error('Collateral token account not found')
  }
  const signature = yield* call([exchangeProgram, exchangeProgram.withdraw], {
    amount,
    exchangeAccount: userExchangeAccount.address,
    owner: wallet.publicKey,
    to: collateralAccountAddress?.address
  })
  return signature[1]
}
export function* burnToken(amount: BN, tokenAddress: PublicKey): SagaGenerator<string> {
  const userTokenAccount = yield* select(tokenAccount(tokenAddress))
  if (!userTokenAccount) {
    return ''
  }
  const wallet = yield* call(getWallet)

  const exchangeProgram = yield* call(getExchangeProgram)
  const userExchangeAccount = yield* select(exchangeAccount)

  const signature = yield* call([exchangeProgram, exchangeProgram.burn], {
    amount,
    exchangeAccount: userExchangeAccount.address,
    owner: wallet.publicKey,
    tokenBurn: tokenAddress,
    userTokenAccountBurn: userTokenAccount.address
  })
  return signature[1]
}

export function* handleSwap(): Generator {
  const swapData = yield* select(swap)

  try {
    const wallet = yield* call(getWallet)

    const tokensAccounts = yield* select(accounts)
    const exchangeProgram = yield* call(getExchangeProgram)
    const userExchangeAccount = yield* select(exchangeAccount)

    let fromAddress = tokensAccounts[swapData.fromToken.toString()]
      ? tokensAccounts[swapData.fromToken.toString()][0].address
      : null
    if (fromAddress == null) {
      fromAddress = yield* call(createAccount, swapData.fromToken)
    }
    let toAddress = tokensAccounts[swapData.toToken.toString()]
      ? tokensAccounts[swapData.toToken.toString()][0].address
      : null
    if (toAddress == null) {
      toAddress = yield* call(createAccount, swapData.toToken)
    }
    const txid = yield* call([exchangeProgram, exchangeProgram.swap], {
      amount: swapData.amount,
      exchangeAccount: userExchangeAccount.address,
      owner: wallet.publicKey,
      tokenIn: swapData.fromToken,
      tokenFor: swapData.toToken,
      userTokenAccountIn: fromAddress,
      userTokenAccountFor: toAddress
    })
    yield* put(actions.swapDone({ txid: txid[1] }))

    yield put(
      snackbarsActions.add({
        message: 'Succesfully swaped token.',
        variant: 'success',
        persist: false
      })
    )
  } catch (error) {
    yield* put(actions.swapDone({ txid: '12' }))
    yield put(
      snackbarsActions.add({
        message: 'Failed to send. Please try again.',
        variant: 'error',
        persist: false
      })
    )
  }
}
export function* swapHandler(): Generator {
  yield* takeEvery(actions.swap, handleSwap)
}

export function* exchangeSaga(): Generator {
  yield all([swapHandler].map(spawn))
}
