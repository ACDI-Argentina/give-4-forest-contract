# Crowdfunding Smart Contract

Smart contract de Crowdfunding.

Se utiliza [Buidler](https://buidler.dev) como herramienta de ejecución de las tareas de compilación, testing y despliegue del smart contract.

En la sección [Architectural Decision Log](docs/adr/index.md) se encuentran los registros de decisiones de arquitectura que han sido tomadas.

## Requisitos sobre sistema operativo

### Windows

Instalar Python.

## Instalación de dependencias

Primero deben instalarse las dependencias del proyecto con el siguiente comando:

```
npm install
```

## Compilación

Para compilar el smart contract, debe ejecutarse el siguiente comando.

```
npm run compile
```

Se requiere mantener reducido el bytecode generado por el smart contract para no superar la restricción [EIP 170](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-170.md). El siguiente comando mide la cantidad de bytes generados para cada contrato compilado.

```
grep \"bytecode\" artifacts/* | awk '{print $1 " " length($3)/2}'
```

> La primera vez la compilación falla al no encontrar algunos smart contracts de Aragon, por ejemplo, es posible encontrarse con el siguiente error: *Error: BDLR700: Artifact for contract "Kernel" not found.* En este caso ejecutamos ```npm start```. Esto último a menudo muestra algún error, pero lo que nos interesa es que compile los smart contracts faltantes. Una vez hecho esto volver a ejecutar ```npm run compile```.

> Workaround: dado que la aplicación funciona con Node v10, se requiere importar los siguientes componentes en algunas librerías tras los errores de compilación. `var globalThis = require('globalthis')();` y `const { TextEncoder, TextDecoder } = require("util");`.

## Testing

Para ejecutar los tests del smart contract, debe ejecutarse el siguiente comando.

```
npm run test
```

Los test se ejecutan por defecto sobre la blockchain *buidlerevm*.

## Publicar en NPM

Para que el módulo quede públicamente accecible y pueda utilizarse por los demás módulos de la aplicación, es necesario publicarlo de la siguiente manera:

```
npm login
npm publish --access public
```

El módulo se publica con el scope de la organización **@acdi**.

## Despliegue

Para desplegar el smart contract sobre la blockchain de RSK, debe ejecutarse el comando descrito según el ambiente.

Junto con el smart contract de Crowdfunding se despliegan los smart contract de Aragon y librerías por lo que este proceso puede demandar algunos minutos.

Las direcciones que aparecen en el log deben utilizarse para configurar la aplicación de Crowdfunding.

### Desarrollo

Si el entorno de desarrollo es Windows, instalar `win-node-env`.

```
npm install -g win-node-env
```

En desarrollo se utiliza un nodo local de **RSK Regtest** accesible desde *http://localhost:4444*.

```
npm run rsk-regtest:deploy
```

Opcionalmente, puede especificarse qué *DAO*, *Admin* o *Exchange Rate Provider* utilizar en el deploy:

```
$env:DAO_CONTRACT_ADDRESS="..."
$env:ADMIN_CONTRACT_ADDRESS="..."
$env:EXCHANGE_RATE_PROVIDER_CONTRACT_ADDRESS="..."
npm run rsk-regtest:deploy
```

- DAO_CONTRACT_ADDRESS es la dirección del Aragon DAOdisponible desde el deploy inicial según la red.
- ADMIN_CONTRACT_ADDRESS es la dirección del smart contract de administración.
- EXCHANGE_RATE_PROVIDER_CONTRACT_ADDRESS es la dirección del *Exchange Rate Provider* a utilizar.

### Testing

En testing se utiliza el nodo público de **RSK Testnet** accesible desde *https://public-node.testnet.rsk.co*.

```
$env:DAO_CONTRACT_ADDRESS="..."
$env:ADMIN_CONTRACT_ADDRESS="..."
$env:EXCHANGE_RATE_PROVIDER_CONTRACT_ADDRESS="..."
npm run rsk-testnet:deploy
```
- DAO_CONTRACT_ADDRESS es la dirección del Aragon DAOdisponible desde el deploy inicial según la red.
- ADMIN_CONTRACT_ADDRESS es la dirección del smart contract de administración.
- EXCHANGE_RATE_PROVIDER_CONTRACT_ADDRESS es la dirección del *Exchange Rate Provider* a utilizar.

## Actualizar smart contract

Para actualizar el smart contract debe ejecutarse el siguiente script, especificando los parámetros:

```
$env:BUIDLER_NETWORK="..."
$env:DAO_CONTRACT_ADDRESS="..."
node .\scripts\upgrade.js
```

- BUIDLER_NETWORK = rskRegtest | rskTestnet | rskMainnet
- DAO_CONTRACT_ADDRESS es la dirección del Aragon DAOdisponible desde el deploy inicial según la red.

Este scrtip es genérico para una actualización. Las actualización generalmente siguen scrtip específicos según los cambios en la versión. A continuación se lista los upgrades.

### v1.1.0

```
$env:BUIDLER_NETWORK="..."
$env:CROWDFUNDING_ADDRESS="..."
node .\scripts\upgrade-v1.1.0.js
```

- BUIDLER_NETWORK = rskRegtest | rskTestnet | rskMainnet
- CROWDFUNDING_ADDRESS es la dirección del smart contract de Crowdfunding (proxy).

## Otorgar permisos

Para otorgar permisos debe ejecutarse el siguiente script, especificando los parámetros:

```
$env:BUIDLER_NETWORK="..."
$env:DAO_CONTRACT_ADDRESS="..."
$env:CROWDFUNDING_ADDRESS="..."
$env:ACCOUNT_ADDRESS="..."
$env:ROLE="..."
node .\scripts\grant-permission.js
```
- BUIDLER_NETWORK = rskRegtest | rskTestnet | rskMainnet
- DAO_CONTRACT_ADDRESS es la dirección del Aragon DAO disponible desde el deploy inicial según la red.
- CROWDFUNDING_ADDRESS es la dirección del smart contract de Crowdfunding.
- ACCOUNT_ADDRESS es la dirección pública de la cuenta a la cual se otorga el permiso.
- ROLE = GIVER_ROLE | DELEGATE_ROLE | CAMPAIGN_MANAGER_ROLE | CAMPAIGN_REVIEWER_ROLE | MILESTONE_MANAGER_ROLE | MILESTONE_REVIEWER_ROLE | RECIPIENT_ROLE | SET_EXCHANGE_RATE_PROVIDER_ROLE | ENABLE_TOKEN_ROLE

## Principios de desarrollo

Para el desarrollo del smart contract se deben seguir los siguientes principios:

- Seguir la [guía de estilos](https://solidity.readthedocs.io/en/v0.6.11/style-guide.html) de desarrollo de Solidity.
- El orden los metodos debe ser: *external*, *public*, *internal* y *private*; Deben seguir un orden de relevancia.
- Siempre que sea posible, el tratamiento sobre las entidades debe delegarse en las librerías para mantener el bytecode del smart contract reducido.
- Sebe realizarse testing automático de las funcionalidades expuestas al exterior.