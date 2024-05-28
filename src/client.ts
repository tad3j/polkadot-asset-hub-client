import {
  ApiPromise,
  Keyring,
  SubmittableResult,
  WsProvider,
} from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { TxHandler } from './helpers';
import '@polkadot/api-augment';
import '@polkadot/types-augment';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { SpRuntimeDispatchError } from '@polkadot/types/lookup';

export class AssetHubClient {
  private static instance: AssetHubClient;

  private api: ApiPromise;
  private readonly account: KeyringPair;

  private constructor(api: ApiPromise, account: KeyringPair) {
    this.api = api;
    this.account = account;
  }

  static async getInstance(rpcEndpoint: string, mnemonic: string) {
    if (!AssetHubClient.instance) {
      const api = await ApiPromise.create({
        provider: new WsProvider(rpcEndpoint),
        throwOnConnect: true,
        noInitWarn: true,
      });
      const keyring = new Keyring({ type: 'sr25519' });
      const account = keyring.addFromMnemonic(mnemonic);

      AssetHubClient.instance = new AssetHubClient(api, account);
    }
    return AssetHubClient.instance;
  }

  async destroyInstance() {
    if (AssetHubClient.instance) {
      await this.api.disconnect();
      AssetHubClient.instance = null;
    }
  }

  getAccountAddress() {
    return typeof this.account === 'string'
      ? this.account
      : this.account.address;
  }

  private async signAndSend(tx: SubmittableExtrinsic<'promise'>) {
    const signedTx = await tx.signAsync(this.account, {
      nonce: -1,
    });

    return await TxHandler.handle(signedTx);
  }

  // QUERIES
  async getAccountBalance(id: number, address: string) {
    const result = await this.api.query.assets.account(id, address);

    return result.isEmpty ? null : result.unwrap();
  }

  async getAssetMetadata(id: number) {
    return await this.api.query.assets.metadata(id);
  }

  async getAssetDetails(id: number) {
    const result = await this.api.query.assets.asset(id);

    return result.isEmpty ? null : result.unwrap();
  }

  // TRANSACTIONS

  async createAsset(
    admin: string,
    id: number,
    name: string,
    symbol: string,
    decimals: number,
    minBalance: number,
  ) {
    const createTx = this.api.tx.assets.create(id, admin, minBalance);
    const metadataTx = this.api.tx.assets.setMetadata(
      id,
      name,
      symbol,
      decimals,
    );
    const result = await this.signAndSend(
      this.api.tx.utility.batchAll([createTx, metadataTx]),
    );

    return result.txHash.toHex();
  }

  async mint(id: number, beneficiary: string, amount: number) {
    const result = await this.signAndSend(
      this.api.tx.assets.mint(id, beneficiary, amount),
    );

    return result.txHash.toHex();
  }

  async burn(id: number, who: string, amount: number) {
    const result = await this.signAndSend(
      this.api.tx.assets.burn(id, who, amount),
    );

    return result.txHash.toHex();
  }

  async transfer(id: number, target: string, amount: number) {
    const result = await this.signAndSend(
      this.api.tx.assets.transfer(id, target, amount),
    );

    return result.txHash.toHex();
  }

  async freeze(id: number, who: string) {
    const result = await this.signAndSend(this.api.tx.assets.freeze(id, who));

    return result.txHash.toHex();
  }

  async thaw(id: number, who: string) {
    const result = await this.signAndSend(this.api.tx.assets.thaw(id, who));

    return result.txHash.toHex();
  }

  async freezeAsset(id: number) {
    const result = await this.signAndSend(this.api.tx.assets.freezeAsset(id));

    return result.txHash.toHex();
  }

  async thawAsset(id: number) {
    const result = await this.signAndSend(this.api.tx.assets.thawAsset(id));

    return result.txHash.toHex();
  }

  async transferOwnership(id: number, who: string) {
    const result = await this.signAndSend(
      this.api.tx.assets.transferOwnership(id, who),
    );

    return result.txHash.toHex();
  }

  async revokeOwnership(id: number) {
    const createPureProxyResult = await this.signAndSend(
      this.api.tx.proxy.createPure('Any', 0, 0),
    );
    const pureEvent = createPureProxyResult.events.find(
      (event) => event.event.method === 'PureCreated',
    );
    if (!pureEvent) {
      throw new Error(
        'Failed to create pure proxy: PureCreated event not found.',
      );
    }
    const pureProxyAddress = pureEvent.event.data['pure'].toString();
    const createPureProxyBlockNumber =
      createPureProxyResult.blockNumber.toNumber();
    const createPureProxyBlocExtrinsicIndex = createPureProxyResult.txIndex;
    // const pureProxyAddress = '5EUsTjLnb5epxTZ2TbD4LjyWWhfu9XWPJivoAaqfU7PqxRLa';
    // const createPureProxyBlockNumber = 7612416;
    // const createPureProxyBlocExtrinsicIndex = 2;

    const r1 = await this.signAndSend(
      this.api.tx.assets.setTeam(
        id,
        pureProxyAddress,
        pureProxyAddress,
        pureProxyAddress,
      ),
    );

    const r2 = await this.signAndSend(
      this.api.tx.balances.transfer(pureProxyAddress, 0.01),
    );
    const r3 = await this.signAndSend(
      this.api.tx.assets.transferOwnership(id, pureProxyAddress),
    );

    const r4 = await this.signAndSend(
      this.api.tx.proxy.killPure(
        this.account.address,
        'Any',
        0,
        createPureProxyBlockNumber,
        createPureProxyBlocExtrinsicIndex,
      ),
    );

    // const result = await this.signAndSend(
    //   this.api.tx.utility.batchAll([
    //     this.api.tx.assets.setTeam(
    //       id,
    //       pureProxyAddress,
    //       pureProxyAddress,
    //       pureProxyAddress,
    //     ),
    //     this.api.tx.assets.transferOwnership(id, pureProxyAddress),
    //     this.api.tx.proxy.killPure(
    //       this.account.address,
    //       'Any',
    //       0,
    //       createPureProxyBlockNumber,
    //       createPureProxyBlocExtrinsicIndex,
    //     ),
    //   ]),
    // );

    return r3.txHash.toHex();
  }
}
