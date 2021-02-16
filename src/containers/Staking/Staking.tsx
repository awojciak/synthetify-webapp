import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'
import Staking from '@components/Staking/Staking'
import { balance, address, accountsArray } from '@selectors/solanaWallet'
import { actions } from '@reducers/solanaWallet'
import { network } from '@selectors/solanaConnection'
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
        tokens={userTokens}
        onSend={(address: PublicKey) => {
          dispatch(modalsActions.openSend({ tokenAddress: address }))
        }}
      />
    </>
  )
}

export default StakingWrapper
