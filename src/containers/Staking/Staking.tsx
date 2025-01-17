import React from 'react'

import { useDispatch, useSelector } from 'react-redux'
import Staking from '@components/Staking/Staking'
import { accountsArray } from '@selectors/solanaWallet'
import { stakedValue, userDebtValue, userCollateralRatio } from '@selectors/exchange'
import { actions as modalsActions } from '@reducers/modals'
import { PublicKey } from '@solana/web3.js'

export const StakingWrapper: React.FC = () => {
  const stakedUserValue = useSelector(stakedValue)
  const userDebt = useSelector(userDebtValue)
  const collateralRatio = useSelector(userCollateralRatio)
  const dispatch = useDispatch()
  const userTokens = useSelector(accountsArray)
  return (
    <>
      <Staking
        collateralRatio={collateralRatio}
        debt={userDebt}
        stakedValue={stakedUserValue}
        tokens={userTokens.filter(a => a.symbol?.startsWith('x'))}
        onSend={(address: PublicKey) => {
          dispatch(modalsActions.openSend({ tokenAddress: address }))
        }}
        onDeposit={() => {
          dispatch(modalsActions.openModal('deposit'))
        }}
        onMint={() => {
          dispatch(modalsActions.openModal('mint'))
        }}
        onWithdraw={() => {
          dispatch(modalsActions.openModal('withdraw'))
        }}
        onBurn={(address: PublicKey) => {
          dispatch(modalsActions.openBurn({ tokenAddress: address }))
        }}
      />
    </>
  )
}

export default StakingWrapper
