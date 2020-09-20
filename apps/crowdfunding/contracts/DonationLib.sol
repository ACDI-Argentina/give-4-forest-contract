pragma solidity ^0.4.24;

/**
 * @title Librería de Donaciones.
 * @author ACDI
 * @notice Librería encargada del tratamiento de Donaciones.
 */
library DonationLib {
    enum Status {Available, Spent, Returned}
    /// @dev Estructura que define los datos de una Donación.
    struct Donation {
        uint256 id; // Identificación de la donación
        uint256 idIndex; // Índice del Id en donationIds;
        address giver; // Address del donante.
        address token; // Token donado.
        uint256 amount; // Monto donado.
        uint256 amountRemainding; // Monto donado restante de consumir.
        uint256 createdAt; // Fecha y hora de la donación.
        uint256 entityId; // Identificación de la entidad a la cual se destinó el fondo inicialmente.
        uint256 budgetEntityId; // Identificación de la entidad de la cual forma parte de su presupuesto.
        Status status;
    }
    struct Data {
        /// @dev Almacena los tokens de las donaciones para poder iterar
        /// en el iterable mapping.
        address[] tokens;
        /// @dev Almacena los ids de las donaciones para poder iterar
        /// en el iterable mapping de donaciones.
        uint256[] ids;
        /// @dev Iterable Mapping de Donaciones.
        mapping(uint256 => Donation) donations;
    }

    string
        internal constant ERROR_DONATION_NOT_EXISTS = "CROWDFUNDING_DONATION_NOT_EXIST";

    /**
     * @notice Determina si token `_token` está habilitado para recibir donaciones.
     * @param _token Token a determina si está habilitado o no.
     * @return true si está habilitado. false si no está habilitado.
     */
    function isTokenEnabled(Data storage self, address _token)
        public
        returns (bool isEnabled)
    {
        isEnabled = false;
        for (uint256 i = 0; i < self.tokens.length; i++) {
            if (self.tokens[i] == _token) {
                // El token está habilitado.
                isEnabled = true;
                break;
            }
        }
    }

    /**
     * @notice Inserta un token permitido para realizar donaciones.
     * @return Identificador de la Donación.
     */
    function insertToken(Data storage self, address _token) public {
        if (isTokenEnabled(self, _token)) {
            // El token ya se encuentra habilitado.
            return;
        }
        self.tokens.push(_token);
    }

    /**
     * @notice Inserta una nueva Donación.
     * @return Identificador de la Donación.
     */
    function insert(
        Data storage self,
        uint256 _entityId,
        address _token,
        uint256 _amount,
        address _giver
    ) public returns (uint256 id) {
        id = self.ids.length + 1;
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Donation memory donation;
        donation.id = id;
        donation.idIndex = idIndex;
        donation.giver = _giver;
        donation.token = _token;
        donation.amount = _amount;
        donation.amountRemainding = _amount;
        donation.createdAt = block.timestamp;
        donation.entityId = _entityId;
        donation.budgetEntityId = _entityId;
        donation.status = Status.Available;
        self.donations[id] = donation;
    }

    /**
     * @notice Obtiene la donación `_id`
     * @return Donación cuya identificación coincide con la especificada.
     */
    function getDonation(Data storage self, uint256 _id)
        public
        view
        returns (Donation storage)
    {
        require(self.donations[_id].id != 0, ERROR_DONATION_NOT_EXISTS);
        return self.donations[_id];
    }
}
