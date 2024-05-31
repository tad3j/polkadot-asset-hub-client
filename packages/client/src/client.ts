import { assetHub, MultiAddress } from '@polkadot-api/descriptors';
import {
  Binary,
  createClient,
  Enum,
  PolkadotClient,
  TxEvent,
  TxFinalized,
  TypedApi,
} from 'polkadot-api';
import { getSmProvider } from 'polkadot-api/sm-provider';
import { PolkadotSigner } from '@polkadot-api/polkadot-signer';
import { Chain } from 'smoldot';
import { Observable } from 'rxjs';

export class AssetHubClient {
  private static instance: AssetHubClient;

  private readonly api: TypedApi<typeof assetHub>;
  private readonly client: PolkadotClient;
  private readonly signer: PolkadotSigner;
  private readonly signerAddress: string;

  static async getInstance(
    chain: Chain,
    signer: PolkadotSigner,
    signerAddress: string,
  ) {
    if (!AssetHubClient.instance) {
      AssetHubClient.instance = new AssetHubClient(
        chain,
        signer,
        signerAddress,
      );
    }
    return AssetHubClient.instance;
  }

  private constructor(
    chain: Chain,
    signer: PolkadotSigner,
    signerAddress: string,
  ) {
    this.client = createClient(getSmProvider(chain));
    this.api = this.client.getTypedApi(assetHub);
    this.signer = signer;
    this.signerAddress = signerAddress;
  }

  private async waitForFinalized(
    observable: Observable<TxEvent>,
  ): Promise<TxFinalized> {
    return await new Promise((resolve, reject) => {
      observable.subscribe((txEvent) => {
        console.log(txEvent);
        if (txEvent.type === 'finalized') {
          return txEvent.ok ? resolve(txEvent) : reject(txEvent);
        } else if (txEvent.type === 'txBestBlocksState') {
          if (txEvent.found === true) {
            if (!txEvent.ok) {
              return reject(txEvent);
            }
          } else {
            if (!txEvent.isValid) {
              return reject(txEvent);
            }
          }
        }
      });
    });
  }

  async getRuntime() {
    const runtime = await this.api.runtime.latest();
    console.log('runtime', runtime);
    const versionSync = this.api.constants.System.Version(runtime);
    console.log('versionSync', versionSync);
  }

  getSignerAddress() {
    return this.signerAddress;
  }

  // QUERIES
  async getAccountBalance(id: number, address: string) {
    // return await this.query(this.api.query.Assets.Account, {id, address})
    return await this.api.query.Assets.Account.getValue(id, address);
  }

  async getAssetMetadata(id: number) {
    return await this.api.query.Assets.Metadata.getValue(id);
  }

  async getAssetDetails(id: number) {
    return await this.api.query.Assets.Asset.getValue(id);
  }

  // TRANSACTIONS
  async createAsset(
    admin: string,
    id: number,
    name: string,
    symbol: string,
    decimals: number,
    minBalance: bigint,
  ) {
    const createTx = this.api.tx.Assets.create({
      id,
      admin: MultiAddress.Id(admin),
      min_balance: minBalance,
    });
    // TODO: fees?
    // const createFees = await this.getEstimatedFees(createTx);
    const metadataTx = this.api.tx.Assets.set_metadata({
      id,
      name: Binary.fromText(name),
      symbol: Binary.fromText(symbol),
      decimals,
    });
    const tx = this.api.tx.Utility.batch_all({
      calls: [createTx.decodedCall, metadataTx.decodedCall],
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async mint(id: number, beneficiary: string, amount: bigint) {
    const method = this.api.tx.Assets.mint;
    if (!(await method.isCompatible())) {
      throw new Error(
        `Transaction ${method} is not compatible with current runtime.`,
      );
    }
    const tx = method({
      id,
      beneficiary: MultiAddress.Id(beneficiary),
      amount,
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  // TODO: can be removed, only for test
  async mint2(id: number, beneficiary: string, amount: bigint) {
    const method = this.api.tx.Assets.mint;
    const tx = method({
      id,
      beneficiary: MultiAddress.Id(beneficiary),
      amount,
    });

    // TODO: we need to create Transaction object from hex
    // const encodedData = await tx.getEncodedData();
    // const hex = encodedData.asHex();
    const signedTx = await tx.sign(this.signer);
    const result = await this.client.submit(signedTx);

    return result.txHash.toString();
  }

  async burn(id: number, who: string, amount: bigint) {
    const tx = this.api.tx.Assets.burn({
      id,
      who: MultiAddress.Id(who),
      amount,
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async transfer(id: number, target: string, amount: bigint) {
    const tx = this.api.tx.Assets.transfer({
      id,
      target: MultiAddress.Id(target),
      amount,
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async freeze(id: number, who: string) {
    const tx = this.api.tx.Assets.freeze({
      id,
      who: MultiAddress.Id(who),
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async thaw(id: number, who: string) {
    const tx = this.api.tx.Assets.thaw({
      id,
      who: MultiAddress.Id(who),
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async freezeAsset(id: number) {
    const tx = this.api.tx.Assets.freeze_asset({
      id,
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async thawAsset(id: number) {
    const tx = this.api.tx.Assets.thaw_asset({
      id,
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async transferOwnership(id: number, owner: string) {
    const tx = this.api.tx.Assets.transfer_ownership({
      id,
      owner: MultiAddress.Id(owner),
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }

  async revokeOwnership(id: number) {
    // create proxy
    const createResult = this.api.tx.Proxy.create_pure({
      proxy_type: Enum('Any'),
      delay: 0,
      index: 0,
    }).signSubmitAndWatch(this.signer);

    const createPureProxyResult = await this.waitForFinalized(createResult);
    const proxyCreatedEvents = this.api.event.Proxy.PureCreated.filter(
      createPureProxyResult.events,
    );
    const proxyCreatedEvent =
      proxyCreatedEvents.length > 0 ? proxyCreatedEvents[0] : null;
    if (!proxyCreatedEvent) {
      throw new Error(
        'Failed to create pure proxy: PureCreated event not found.',
      );
    }
    const pureProxyAddress = MultiAddress.Id(proxyCreatedEvent.pure);

    const blockHeader = await this.client.getBlockHeader(
      createPureProxyResult.block.hash,
    );

    // transfer asset ownership to proxy created above
    const tx = this.api.tx.Utility.batch_all({
      calls: [
        this.api.tx.Balances.transfer_keep_alive({
          dest: pureProxyAddress,
          value: BigInt(1000000000),
        }).decodedCall,
        this.api.tx.Assets.set_team({
          id,
          issuer: pureProxyAddress,
          admin: pureProxyAddress,
          freezer: pureProxyAddress,
        }).decodedCall,
        this.api.tx.Assets.transfer_ownership({ id, owner: pureProxyAddress })
          .decodedCall,
        this.api.tx.Proxy.proxy({
          real: pureProxyAddress,
          force_proxy_type: Enum('Any'),
          call: this.api.tx.Proxy.kill_pure({
            spawner: MultiAddress.Id(this.getSignerAddress()),
            proxy_type: Enum('Any'),
            index: 0,
            height: blockHeader.number,
            ext_index: createPureProxyResult.block.index,
          }).decodedCall,
        }).decodedCall,
      ],
    });
    const observable = tx.signSubmitAndWatch(this.signer);
    const result = await this.waitForFinalized(observable);

    return result.txHash.toString();
  }
}
