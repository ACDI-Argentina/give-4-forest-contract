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
        uint256 budgetId; // Identificación del presupuesto al cual está asignada la donación.
        Status status;
    }
    struct Data {
        /// @dev Almacena los ids de las donaciones para poder iterar
        /// en el iterable mapping de donaciones.
        uint256[] ids;
        /// @dev Iterable Mapping de Donaciones
        mapping(uint256 => Donation) donations;
    }

    string
        internal constant ERROR_DONATION_NOT_EXISTS = "CROWDFUNDING_DONATION_NOT_EXIST";

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
