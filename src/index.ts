import { cryptoWaitReady } from '@polkadot/util-crypto';

import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from '@polkadot/extension-dapp';
import { ApiPromise, WsProvider } from '@polkadot/api';

async function enableExtension() {
  await web3Enable('My Polkadot App');
  return await web3Accounts();
}

const mintToWallet = async () => {
  await cryptoWaitReady();
  const accounts = await enableExtension();
  console.log('Accounts:', accounts);

  const account = accounts[0];
  const injector = await web3FromAddress(account.address);
  const api = await ApiPromise.create({
    provider: new WsProvider('wss://asset-hub-westend-rpc.dwellir.com'),
    throwOnConnect: true,
    noInitWarn: true,
  });
  console.log('Minting to:', account.address);
  const hash = await api.tx.assets
    .mint(791, account.address, 100)
    .signAndSend(account.address, { signer: injector.signer, nonce: -1 });
  console.log('Transaction sent with hash', hash.toHex());
};

window.onload = () => {
  const mintButton = document.getElementById('mintButton');
  if (mintButton) {
    mintButton.addEventListener('click', mintToWallet);
  }
};
