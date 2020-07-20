# Crowdfunding Smart Contract

Smart contract de Crowdfunding.

Se utiliza [Buidler](https://buidler.dev) como herramienta de ejecución de las tareas de compilación, testing y despliegue del smart contract.

En la sección [Architectural Decision Log](docs/adr/index.md) se encuentran los registros de decisiones de arquitectura que han sido tomadas.

## Compilación

Para compilar el smart contract, debe ejecutarse el siguiente comando.

```
npm run compile
```

Se requiere mantener reducido el bytecode generado por el smart contract para no superar la restricción [EIP 170](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-170.md). El siguiente comando mide la cantidad de bytes generados para cada contrato compilado.

```
grep \"bytecode\" artifacts/* | awk '{print $1 " " length($3)/2}'
```

## Testing

Para ejecutar los tests del smart contract, debe ejecutarse el siguiente comando.

```
npm run test
```

Los test se ejecutan por defecto sobre la blockchain *buidlerevm*.

## Publicar en NPM

Para que el módulo quede públicamente accecible y pueda utilizarse por los demás módulos de la aplicación, es necesario publicar de la siguiente manera:

```
npm login
npm publish --access public
```

El módulo se publica con el scope de la organización **@acdi**.

## Despliegue

Para desplegar el smart contract sobre la blockchain de RSK, debe ejecutarse el siguiente comando con el nodo RSK accesible desde *http://localhost:4444*.

```
npm run deploy:rsk
```

Junto con el smart contract de Crowdfunding se despliegan los smart contract de Aragon y librerías por lo que este proceso puede demandar algunos minutos.

Las direcciones que aparecen en el log deben utilizarse para configurar la aplicación de Crowdfunding.

## Principios de desarrollo

Para el desarrollo del smart contract se deben seguir los siguientes principios:

- Seguir la [guía de estilos](https://solidity.readthedocs.io/en/v0.6.11/style-guide.html) de desarrollo de Solidity.
- El orden los metodos debe ser: *external*, *public*, *internal* y *private*; Deben seguir un orden de relevancia.
- Siempre que sea posible, el tratamiento sobre las entidades debe delegarse en las librerías para mantener el bytecode del smart contract reducido.
- Sebe realizarse testing automático de las funcionalidades expuestas al exterior.

## Running your app

To run the app in a browser with frontend and contract hot-reloading, simply run `npm start`.

1. Add code quality tools, like JS and contract linting. You may also want to check existing [buidler plugins](https://buidler.dev/plugins/).
2. Develop your [AragonApp contract](https://hack.aragon.org/docs/aragonos-building)
3. Develop your [frontend](https://ui.aragon.org/getting-started/)
4. [Publish](https://hack.aragon.org/docs/guides-publish)!

## What's in this boilerplate?

### npm Scripts

- **postinstall**: Runs after installing dependencies.
- **build-app**: Installs front end project (app/) dependencies.
- **start** Runs your app inside a DAO.
- **compile**: Compiles the smart contracts.
- **test**: Runs tests for the contracts.
- **publish:major**: Releases a major version to aragonPM.
- **publish:minor**: Releases a minor version to aragonPM.
- **publish:patch**: Releases a patch version to aragonPM.

### Hooks

These hooks are called by the Aragon Buidler plugin during the start task's lifecycle. Use them to perform custom tasks at certain entry points of the development build process, like deploying a token before a proxy is initialized, etc.

Link them to the main buidler configuration file (buidler.config.js) in the `aragon.hooks` property.

All hooks receive two parameters: 1) A params object that may contain other objects that pertain to the particular hook. 2) A "bre" or BuidlerRuntimeEnvironment object that contains environment objects like web3, Truffle artifacts, etc.

```
// Called before a dao is deployed.
preDao: async ({ log }, { web3, artifacts }) => {},

// Called after a dao is deployed.
postDao: async ({ dao, _experimentalAppInstaller, log }, { web3, artifacts }) => {},

// Called after the app's proxy is created, but before it's initialized.
preInit: async ({ proxy, _experimentalAppInstaller, log  }, { web3, artifacts }) => {},

// Called after the app's proxy is initialized.
postInit: async ({ proxy, _experimentalAppInstaller, log  }, { web3, artifacts }) => {},

// Called when the start task needs to know the app proxy's init parameters.
// Must return an array with the proxy's init parameters.
getInitParams: async ({ log }, { web3, artifacts }) => {
  return []
}
```

If you want an example of how to use these hooks, please see the [plugin's own tests for an example project](https://github.com/aragon/buidler-aragon/blob/master/test/projects/token-wrapper/scripts/hooks.js).

## Structure

This boilerplate has the following structure:

```md
root
├── app
├ ├── src
├ └── package.json
├── contracts
├ └── CounterApp.sol
├── test
├── arapp.json
├── manifest.json
├── buidler.config.js
└── package.json
```

- **app**: Frontend folder. Completely encapsulated: has its own package.json and dependencies.
  - **src**: Source files.
  - [**package.json**](https://docs.npmjs.com/creating-a-package-json-file): Frontend npm configuration file.
- **contracts**: Smart contracts folder.
  - `CounterApp.sol`: AragonApp contract example.
- **test**: Tests folder.
- [**arapp.json**](https://hack.aragon.org/docs/cli-global-confg#the-arappjson-file): Aragon configuration file. Includes Aragon-specific metadata for your app.
- [**manifest.json**](https://hack.aragon.org/docs/cli-global-confg#the-manifestjson-file): Aragon configuration file. Includes web-specific configuration.
- [**buidler.config.js**](https://buidler.dev/config/): Buidler configuration file.
- [**package.json**](https://docs.npmjs.com/creating-a-package-json-file): Main npm configuration file.

### Libraries

- [**@aragon/os**](https://github.com/aragon/aragonos): AragonApp smart contract interfaces.
- [**@aragon/api**](https://github.com/aragon/aragon.js/tree/master/packages/aragon-api): Aragon client application API.
- [**@aragon/ui**](https://github.com/aragon/aragon-ui): Aragon UI components (in React).
- [**@aragon/buidler-aragon**](https://github.com/aragon/buidler-aragon): Aragon Buidler plugin.