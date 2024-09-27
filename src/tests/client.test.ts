import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { AssetHubClient } from '../client';
import dotenv from 'dotenv';
dotenv.config();

const MNEMONIC = process.env.MNEMONIC;
const TEST_STATIC_ASSET_ID = 790;
const TEST_ASSET_ID = 791;
const TEST_CREATE_ASSET_ID = 780; //TODO: to create an asset one has to provide id that wasn't used
const TEST_SECONDARY_WALLET =
  '5Hb3L9eU6yaATAzvmiNoNRptikeQP6MLV5gjp4SQMArQbTUt';

describe('Polkadot asset hub client test', () => {
  let client: AssetHubClient, walletAddress: string;

  beforeAll(async () => {
    client = await AssetHubClient.getInstance(
      'wss://asset-hub-westend-rpc.dwellir.com',
      MNEMONIC,
    );
    walletAddress = client.getAccountAddress();
  });

  afterAll(async () => {
    await client.destroyInstance();
  });

  describe('queries', () => {
    test('get account balance for asset', async () => {
      const result = await client.getAccountBalance(
        TEST_STATIC_ASSET_ID,
        walletAddress,
      );

      expect(result.balance.toNumber()).toEqual(1000000000007000);
      expect(result.status.type).toEqual('Liquid');
      expect(result.reason.type).toEqual('Consumer');
    });

    test('get asset details', async () => {
      const result = await client.getAssetDetails(TEST_STATIC_ASSET_ID);

      expect(result.owner.toString()).toEqual(walletAddress);
      expect(result.issuer.toString()).toEqual(walletAddress);
      expect(result.admin.toString()).toEqual(walletAddress);
      expect(result.freezer.toString()).toEqual(walletAddress);
      expect(result.supply.toNumber()).toEqual(1000000000007000);
      expect(result.deposit.toNumber()).toEqual(100000000000);
      expect(result.minBalance.toNumber()).toEqual(10000000000000);
      expect(result.status.type).toEqual('Live');
      expect(result.isSufficient).toEqual(false);
    });

    test('get asset metadata', async () => {
      const result = await client.getAssetMetadata(TEST_STATIC_ASSET_ID);

      expect(result.name.toHuman()).toEqual('TST');
      expect(result.symbol.toHuman()).toEqual('TST');
      expect(result.decimals.toNumber()).toEqual(12);
      expect(result.isFrozen).toEqual(false);
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
        1000,
      );

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can update metadata', async () => {
      const newName = 'Name2';
      const newSymbol = 'NME2';
      const newDecimals = 12;

      const hash = await client.updateMetadata(
        TEST_ASSET_ID,
        newName,
        newSymbol,
        newDecimals,
      );

      expect(hash.substring(0, 2)).toEqual('0x');
      const metadata = await client.getAssetMetadata(TEST_ASSET_ID);
      expect(metadata.name.toHuman()).toEqual(newName);
      expect(metadata.symbol.toHuman()).toEqual(newSymbol);
      expect(metadata.decimals.toNumber()).toEqual(newDecimals);
    });

    test('can mint asset', async () => {
      const hash = await client.mint(TEST_ASSET_ID, walletAddress, 1000);

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can burn asset', async () => {
      const hash = await client.burn(TEST_ASSET_ID, walletAddress, 100);

      expect(hash.substring(0, 2)).toEqual('0x');
    });

    test('can transfer asset', async () => {
      const hash = await client.transfer(
        TEST_ASSET_ID,
        TEST_SECONDARY_WALLET,
        100,
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

    test('can change issuer', async () => {
      const hash = await client.updateTeam(
        TEST_ASSET_ID,
        TEST_SECONDARY_WALLET,
        walletAddress,
        walletAddress,
      );
      expect(hash.substring(0, 2)).toEqual('0x');
      const assetDetails = await client.getAssetDetails(TEST_ASSET_ID);
      expect(assetDetails.issuer.toString()).toEqual(TEST_SECONDARY_WALLET);
      expect(assetDetails.admin.toString()).toEqual(walletAddress);
      expect(assetDetails.freezer.toString()).toEqual(walletAddress);
    });

    test('can change freezer', async () => {
      const hash = await client.updateTeam(
        TEST_ASSET_ID,
        walletAddress,
        walletAddress,
        TEST_SECONDARY_WALLET,
      );
      expect(hash.substring(0, 2)).toEqual('0x');
      const assetDetails = await client.getAssetDetails(TEST_ASSET_ID);
      expect(assetDetails.issuer.toString()).toEqual(walletAddress);
      expect(assetDetails.admin.toString()).toEqual(walletAddress);
      expect(assetDetails.freezer.toString()).toEqual(TEST_SECONDARY_WALLET);
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
