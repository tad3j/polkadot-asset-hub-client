import { SubmittableExtrinsic } from '@polkadot/api/types';
import { SubmittableResult } from '@polkadot/api';

export class TxHandler {
  static async handle(
    transaction: SubmittableExtrinsic<'promise'>,
    waitForFinalization = true,
  ): Promise<SubmittableResult> {
    function submit(): Promise<SubmittableResult> {
      return new Promise((resolve, reject) => {
        timeout(
          async () => {
            await transaction
              .send((result, extra) => {
                // console.log('result', result.status.toString());
                if (result.status.isInBlock) {
                  for (const e of result.events) {
                    const {
                      event: { data, method, section },
                    } = e;
                    if (section === 'system' && method === 'ExtrinsicFailed') {
                      return reject(result);
                    }
                  }
                  if (!waitForFinalization) {
                    return resolve(result);
                  }
                }
                if (result.status.isFinalized) {
                  return resolve(result);
                }
                if (result.status.isInvalid) {
                  return reject(result);
                }
                if (result.status.isDropped) {
                  return reject(result);
                }
                if (result.status.isUsurped) {
                  return reject(result);
                }
                if (result.status.isRetracted) {
                  return reject(result);
                }
                if (result.isError) {
                  return reject(result);
                }
              })
              .catch((e) => reject(e));
          },
          60_000,
          { message: 'error inside timeout' },
        ).catch((e) => reject(e));
      });
    }

    for (let i = 0; i < 200; ++i) {
      try {
        return await submit();
      } catch (e) {
        const msg =
          typeof e == 'string'
            ? e.toLowerCase()
            : e?.message
              ? e?.message.toString().toLowerCase()
              : String(e);
        if (msg.includes('priority is too low')) {
          await sleep(50);
          continue;
        } else if (msg.includes('transaction is outdated')) {
          continue;
        } else if (msg.includes('timeout')) {
          i += 9;
          continue;
        }

        throw e;
      }
    }

    throw new Error('Could not execute extrinsic');
  }
}

function timeout(
  callback: () => Promise<any>,
  timeLimit: number,
  options: { message: string },
) {
  options = {
    message: 'Timeout',
    ...options,
  };

  return new Promise(async (resolve, reject) => {
    const _timeout = setTimeout(
      () => reject(new Error(options.message)),
      timeLimit,
    );

    try {
      const result = await callback();

      clearTimeout(_timeout);
      resolve(result);
    } catch (e) {
      clearTimeout(_timeout);
      reject(e);
    }
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
