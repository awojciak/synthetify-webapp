import { PublicKey, Transaction } from '@solana/web3.js'

export interface WalletAdapter {
  publicKey: PublicKey
  autoApprove: boolean
  connected: boolean
  signTransaction: (transaction: Transaction) => Promise<Transaction>
  signAllTransactions: (transaction: Transaction[]) => Promise<Transaction[]>
  connect: () => any
  disconnect: () => any
  on<T>(event: string, fn: () => void): this
}
