import { Address, AddressType, HashType, Script, SnakeScript } from '@lay2/pw-core'
const { core, normalizer } = require('./godwoken')
import { Reader as CKBReader } from 'ckb-js-toolkit'

import genesis from './genesis.json'
import scriptsDeployResult from './scripts-deploy-result.json'

const gwPolyjuiceETHAccountLockCodeHash = scriptsDeployResult.eth_account_lock.script_type_hash
const gwRollupTypeHash = genesis.rollup_type_hash
const gwDepositLockCodeHash = scriptsDeployResult.deposit_lock.script_type_hash

interface DepositLockArgs {
  owner_lock_hash: string
  layer2_lock: SnakeScript
  cancel_timeout: string
}

function generateETHAccountLockScript(ethAddr: string): SnakeScript {
  return {
      code_hash: gwPolyjuiceETHAccountLockCodeHash,
      hash_type: HashType.type,
      args: `${gwRollupTypeHash}${ethAddr.toLowerCase().slice(2)}`,
    }
}

function getDepositLockArgs(
  ownerLockHash: string,
  layer2_lock: SnakeScript,
  cancelTimeout = '0xc00000000002a300'
): DepositLockArgs {
  const depositLockArgs: DepositLockArgs = {
      owner_lock_hash: ownerLockHash,
      layer2_lock,
      cancel_timeout: cancelTimeout, // relative timestamp, 2 days
    }
  return depositLockArgs
}

function serializeArgs(args: DepositLockArgs): string {
  const serializedDepositLockArgs: ArrayBuffer = core.SerializeDepositLockArgs(
    normalizer.NormalizeDepositLockArgs(args)
  )

  const depositLockArgsStr = new CKBReader(serializedDepositLockArgs).serializeJson()

  return `${gwRollupTypeHash}${depositLockArgsStr.slice(2)}`
}

function generateDepositLockScript(args: string): SnakeScript {
  return {
    code_hash: gwDepositLockCodeHash,
    hash_type: HashType.type,
    args,
  }
}

function ethAddrToDepositAddr(ethAddr: string): Address {
  const pwETHAddr = new Address(ethAddr, AddressType.eth)
  const ownerLockHash = pwETHAddr.toLockScript().toHash()

  const ethAccountLock = generateETHAccountLockScript(ethAddr)

  const depositLockArgs = getDepositLockArgs(ownerLockHash, ethAccountLock)
  const serializedArgs = serializeArgs(depositLockArgs)
  const depositLock = generateDepositLockScript(serializedArgs)

  const depositLockPW = new Script(depositLock.code_hash, depositLock.args, depositLock.hash_type)

  return depositLockPW.toAddress()
}

ethAddrToDepositAddr("0xE9058a6685fB99b1dDA6a8aab2865b59f7095C3d")
