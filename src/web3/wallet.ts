/* eslint-disable no-case-declarations */
import { WalletAdapter } from './adapters/types'
import { PhantomWalletAdapter } from './adapters/phantom'
import Wallet from '@project-serum/sol-wallet-adapter'
export enum WalletType {
  PHANTOM,
  SOLLET,
  SOLLET_EXTENSION
}
let _wallet: WalletAdapter
const getSolanaWallet = (): WalletAdapter => {
  if (_wallet) {
    return _wallet
  }
  _wallet = new PhantomWalletAdapter()
  return _wallet
}
// Here we will pass wallet type right
const connectWallet = async (wallet: WalletType): Promise<WalletAdapter> => {
  return await new Promise((resolve, reject) => {
    switch (wallet) {
      case WalletType.PHANTOM:
        _wallet = new PhantomWalletAdapter()
        _wallet.on('connect', () => {
          resolve(_wallet)
        })
        _wallet.connect()
        break
      case WalletType.SOLLET:
        const providerUrl = 'https://www.sollet.io'
        _wallet = new Wallet(providerUrl) as WalletAdapter

        _wallet.on('connect', () => {
          resolve(_wallet)
        })
        _wallet.connect()
        break
      case WalletType.SOLLET_EXTENSION:
        _wallet = new Wallet((window as any).sollet) as WalletAdapter

        _wallet.on('connect', () => {
          resolve(_wallet)
        })
        _wallet.connect()
        break

      default:
        _wallet = new PhantomWalletAdapter()
        _wallet.on('connect', () => {
          resolve(_wallet)
        })
        _wallet.connect()
        break
    }
  })
}

export { getSolanaWallet, connectWallet }
