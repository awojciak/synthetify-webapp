import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { assets, exchangeAccount, state } from '@selectors/exchange'
import { status } from '@selectors/solanaConnection'
import { actions } from '@reducers/exchange'
import { Status } from '@reducers/solanaConnection'
import { DEFAULT_PUBLICKEY } from '@consts/static'
import { getCurrentExchangeProgram } from '@web3/programs/exchange'
import { getOracleProgram } from '@web3/programs/oracle'
import { parseTokenAccountData } from '@web3/data'

const ExhcangeEvents = () => {
  const dispatch = useDispatch()
  const networkStatus = useSelector(status)
  const exchangeState = useSelector(state)
  const userAccount = useSelector(exchangeAccount)
  const allAssets = useSelector(assets)
  const exchangeProgram = getCurrentExchangeProgram()
  React.useEffect(() => {
    if (
      userAccount.address.equals(DEFAULT_PUBLICKEY) ||
      !exchangeProgram ||
      networkStatus !== Status.Initalized
    ) {
      return
    }
    const connectEvents = () => {
      exchangeProgram.onAccountChange(userAccount.address, a => {
        dispatch(
          actions.setExchangeAccount({
            address: userAccount.address,
            collateralShares: a.collateralShares,
            debtShares: a.debtShares
          })
        )
      })
    }
    connectEvents()
  }, [dispatch, userAccount.address.toString(), exchangeProgram, networkStatus])

  React.useEffect(() => {
    if (!exchangeProgram || networkStatus !== Status.Initalized) {
      return
    }
    const connectEvents = () => {
      exchangeProgram.onStateChange(state => {
        dispatch(actions.setState(state))
      })
    }
    connectEvents()
  }, [dispatch, exchangeProgram, networkStatus])

  React.useEffect(() => {
    if (!exchangeProgram || networkStatus !== Status.Initalized) {
      return
    }
    const connectEvents = () => {
      exchangeProgram.connection.onAccountChange(exchangeState.collateralAccount, accountInfo => {
        const parsedData = parseTokenAccountData(accountInfo.data)
        dispatch(actions.setCollateralAccountBalance(parsedData.amount))
      })
    }
    connectEvents()
  }, [dispatch, exchangeState.collateralAccount.toString(), networkStatus])

  React.useEffect(() => {
    const oracleProgram = getOracleProgram()

    if (
      Object.values(allAssets).length === 0 ||
      !oracleProgram ||
      networkStatus !== Status.Initalized
    ) {
      return
    }
    const connectEvents = () => {
      for (const asset of Object.values(allAssets)) {
        oracleProgram.account.priceFeed
          .subscribe(asset.feedAddress, 'singleGossip')
          .on('change', a => {
            dispatch(actions.setAssetPrice({ token: asset.assetAddress, price: a.price }))
          })
      }
    }
    connectEvents()
  }, [dispatch, Object.values(allAssets).length, networkStatus])

  return null
}

export default ExhcangeEvents
