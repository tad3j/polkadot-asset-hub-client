# Polkadot Asset Hub Client and Demo

https://wiki.polkadot.network/docs/learn-assets

## client.ts
Polkadot Asset Hub client which abstracts Polkadot SDK and provides methods for interacting with Asset Hub.

## tests/client.test.ts
Tests for client methods

### Note
- running tests results in transactions on testnet
- tests may start failing if transactions change blockchain state

## index.ts and index.html
Example for Asset Hub interaction from browser

## Moonbase Asset Hub

Tests and Web App interact with AssetHub on Moonbase

Queries (chain state):

https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fqco-moon-rpc-2-moonbase-sm-rpc-1.moonbase.ol-infra.network#/chainstate

Transactions (extrinsics):

https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fqco-moon-rpc-2-moonbase-sm-rpc-1.moonbase.ol-infra.network#/extrinsics


