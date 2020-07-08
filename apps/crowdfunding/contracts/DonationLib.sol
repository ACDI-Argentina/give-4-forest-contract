pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

/**
 * @title Librería de Donaciones.
 * @author Mauricio Coronel
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
        donation.entityId = _entityId;
        donation.status = Status.Available;
        self.donations[id] = donation;
    }

    /**
     * @notice Obtiene todas las Donaciones.
     * @return Lista con todas las Donaciones.
     */
    function toArray(Data storage self)
        public
        view
        returns (Donation[] memory result)
    {
        result = new Donation[](self.ids.length);
        for (uint256 i = 0; i < self.ids.length; i++) {
            result[i] = self.donations[self.ids[i]];
        }
    }
}
