## How to start localhost
### Preparation
Create a docker image named `geth` and `docker-compose.yml`.

The docker container uses
* 18545 as HTTP RPC port
* 18546 as WebSocket port
* /data as datadir
* /solidity as WETH sources dir

### Init the network

```
$ docker run -it --rm --name geth_sample -v `pwd`/data:/data gethd /bin/bash
# geth --datadir /data init /data/genesis.json
# geth attach /data/geth.ipc
>
```

### Start with docker-compose

```
$ docker-compose up
# geth attach rpc:http://localhost:18545
>
```

### Deploy WETH

1. Open `localhost/solidity/WETH.abi` and copy abi body (from `[` to `]`) in clipboard.

```
> abi=//paste here
```

Note that it must not be a string. So do not enclose in quotes.

2. Open `localhost/solidity/WETH.bin`  and copy bin body in clipboard

```
> bin='0x//paste here'
```

Note that the hex value must be put in `'0x'` format.

3. Deploy

```
> cnt = eth.contract(abi).new({from: eth.accounts[0], data: bin})
> cnt
...
```

Check the contract address

### Deploy ghost nouns 
1. Send ETH to deploy account

```
> eth.sendTransaction({from: eth.accounts[0], to: 'DEPLOY_ADDRESS', value: web3.toWei(10, "ether")})
```

2. Deploy

```
$ yarn task:deploy-and-configure --network localhost --start-auction --weth WETH_ADDRESS --noundersdao SOME_ADDRESS 
```
