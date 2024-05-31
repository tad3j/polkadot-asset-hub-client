import { startFromWorker } from 'polkadot-api/smoldot/from-worker';
import { AssetHubClient } from 'polkadot-asset-hub-client';
import { chainSpec as westendChainSpecs } from 'polkadot-api/chains/westend2';
import { chainSpec } from 'polkadot-api/chains/westend2_asset_hub';
import {
  connectInjectedExtension,
  getInjectedExtensions,
} from 'polkadot-api/pjs-signer';

async function getInjectedAccount() {
  const extensions: string[] = getInjectedExtensions();
  const selectedExtension = await connectInjectedExtension(extensions[0]);
  const accounts = selectedExtension.getAccounts();

  return accounts[0];
}

async function mintToWallet() {
  const injectedAccount = await getInjectedAccount();
  const worker = new Worker(
    new URL('@polkadot-api/smoldot/worker', import.meta.url),
  );
  const smoldot = startFromWorker(worker);
  const relayChain = await smoldot.addChain({ chainSpec: westendChainSpecs });
  const chain = await smoldot.addChain({
    chainSpec,
    potentialRelayChains: [relayChain],
  });
  const client = await AssetHubClient.getInstance(
    chain,
    injectedAccount.polkadotSigner,
    injectedAccount.address,
  );
  await client.getRuntime();

  console.log('Minting to:', client.getSignerAddress());
  // const hash = await client.mint2(791, injectedAccount.address, BigInt(100));
  const hash = await client.revokeOwnership(97);
  // const hash = await client.createAsset(
  //   injectedAccount.address,
  //   97,
  //   'pdapi',
  //   'PDAPI',
  //   12,
  //   BigInt(10000),
  // );
  console.log('Transaction sent with hash', hash);
  // TODO: which one to call?
  worker.terminate();
  await smoldot.terminate();
}

window.onload = () => {
  const mintButton = document.getElementById('mintButton');
  if (mintButton) {
    mintButton.addEventListener('click', mintToWallet);
  }
};
