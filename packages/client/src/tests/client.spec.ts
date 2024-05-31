import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { AssetHubClient } from '../client';
import * as dotenv from 'dotenv';
import { startFromWorker } from 'polkadot-api/smoldot/from-worker';
import { Worker } from 'worker_threads';
import { chainSpec } from 'polkadot-api/chains/polkadot';
import {
  entropyToMiniSecret,
  mnemonicToEntropy,
} from '@polkadot-labs/hdkd-helpers';
import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import { getPolkadotSigner } from '@polkadot-api/signer';

dotenv.config();

const MNEMONIC = process.env.MNEMONIC;
const TEST_STATIC_ASSET_ID = 790;
const TEST_ASSET_ID = 791;
const TEST_CREATE_ASSET_ID = 780; //TODO: to create an asset one has to provide id that wasn't used
const TEST_SECONDARY_WALLET =
  '5Hb3L9eU6yaATAzvmiNoNRptikeQP6MLV5gjp4SQMArQbTUt';

function getSigner(path: string) {
  const entropy = mnemonicToEntropy(MNEMONIC);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);
  const keypair = derive(path);
  return getPolkadotSigner(keypair.publicKey, 'Sr25519', keypair.sign);
}

describe('Polkadot asset hub client test', () => {
  let client: AssetHubClient, walletAddress: string, worker: Worker;

  beforeAll(async () => {
    // TODO: bad worker
    worker = new Worker(new URL('', ''));
    const smoldot = startFromWorker(worker);
    const chain = await smoldot.addChain({ chainSpec });
    const signer = getSigner('//Alice');
    client = await AssetHubClient.getInstance(
      chain,
      signer,
      '5CcMjFPRuWzs7ijRoRLuWbE8ki2GWhEwc9RrhwhzjWgMNpAa',
    );
    walletAddress = client.getSignerAddress();
  });

  afterAll(async () => {
    await worker.terminate();
  });

  describe('queries', () => {
    test('get account balance for asset', async () => {
      const result = await client.getAccountBalance(
        TEST_STATIC_ASSET_ID,
        walletAddress,
      );

      expect(result.balance).toEqual(1000000000007000);
      expect(result.status.type).toEqual('Liquid');
      expect(result.reason.type).toEqual('Consumer');
    });

    test('get asset details', async () => {
      const result = await client.getAssetDetails(TEST_STATIC_ASSET_ID);

      expect(result.owner.toString()).toEqual(walletAddress);
      expect(result.issuer.toString()).toEqual(walletAddress);
      expect(result.admin.toString()).toEqual(walletAddress);
      expect(result.freezer.toString()).toEqual(walletAddress);
      expect(result.supply).toEqual(1000000000007000);
      expect(result.deposit).toEqual(100000000000);
      expect(result.min_balance).toEqual(10000000000000);
      expect(result.status.type).toEqual('Live');
      expect(result.is_sufficient).toEqual(false);
    });

    test('get asset metadata', async () => {
      const result = await client.getAssetMetadata(TEST_STATIC_ASSET_ID);

      expect(result.name.asText()).toEqual('TST');
      expect(result.symbol.asText()).toEqual('TST');
      expect(result.decimals).toEqual(12);
      expect(result.is_frozen).toEqual(false);
    });
  });

  describe('transactions', () => {
    test('can create asset', async () => {
      const hash = await client.createAsset(
        walletAddress,
        TEST_CREATE_ASSET_ID,
        'Name',
        'NME',
        12,
        BigInt(1000),
      );

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can mint asset', async () => {
      const hash = await client.mint(
        TEST_ASSET_ID,
        walletAddress,
        BigInt(1000),
      );

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can burn asset', async () => {
      const hash = await client.burn(TEST_ASSET_ID, walletAddress, BigInt(100));

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can transfer asset', async () => {
      const hash = await client.transfer(
        TEST_ASSET_ID,
        TEST_SECONDARY_WALLET,
        BigInt(100),
      );

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can freeze asset of wallet', async () => {
      const hash = await client.freeze(TEST_ASSET_ID, TEST_SECONDARY_WALLET);

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can thaw asset of wallet', async () => {
      const hash = await client.thaw(TEST_ASSET_ID, TEST_SECONDARY_WALLET);

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can freeze asset class', async () => {
      const hash = await client.freezeAsset(TEST_ASSET_ID);
      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can thaw asset class', async () => {
      const hash = await client.thawAsset(TEST_ASSET_ID);

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can transfer ownership of asset class', async () => {
      const hash = await client.transferOwnership(
        TEST_ASSET_ID,
        TEST_SECONDARY_WALLET,
      );

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can transfer asset class ownership', async () => {
      const hash = await client.thaw(TEST_ASSET_ID, TEST_SECONDARY_WALLET);

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can revoke ownership of asset class', async () => {
      const hash = await client.revokeOwnership(TEST_CREATE_ASSET_ID);

      expect(hash.substring(0, 2)).toEqual('0x');
    });
  });
});
