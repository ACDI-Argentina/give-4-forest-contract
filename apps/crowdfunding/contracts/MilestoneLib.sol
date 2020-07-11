pragma solidity ^0.4.24;

/**
 * @title Librería de Milestones.
 * @author Mauricio Coronel
 * @notice Librería encargada del tratamiento de Milestones.
 */
library MilestoneLib {
    enum Status {
        Active,
        Cancelled,
        Completed, // Fue marcado completado.
        Approved, // Se aprobó una vez completado. Listo para el retiro de fondos.
        Rejected, // Se rechazó una vez completado. Debe volver a completarse.
        Finished // Se finalizó y se retiraron los fondos.
    }
    /// @dev Estructura que define los datos de una Milestone.
    struct Milestone {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en MilestoneIds;
        string infoCid; // IPFS Content ID de las información (JSON) del Milestone.
        uint256 fiatAmountTarget; // Cantidad de dinero Fiat necesario para el Milestone.
        address manager;
        address reviewer;
        address recipient;
        address campaignReviewer;
        uint256 campaignId; // Id de las campaign relacionada.
        // TODO Agregar Items
        Status status;
    }
    struct Data {
        /// @dev Almacena los ids de la Milestones para poder iterar
        /// en el iterable mapping de Milestones
        uint256[] ids;
        /// @dev Iterable Mapping de Milestones
        mapping(uint256 => Milestone) milestones;
    }

    string
        internal constant ERROR_MILESTONE_NOT_EXISTS = "CROWDFUNDING_MILESTONE_NOT_EXIST";

    /**
     * @notice Inserta un nuevo Milestone.
     */
    function insert(
        Data storage self,
        uint256 id,
        string _infoCid,
        uint256 _campaignId,
        uint256 _fiatAmountTarget,
        address _manager,
        address _reviewer,
        address _recipient,
        address _campaignReviewer
    ) public {
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Milestone memory milestone;
        milestone.id = id;
        milestone.idIndex = idIndex;
        milestone.infoCid = _infoCid;
        milestone.fiatAmountTarget = _fiatAmountTarget;
        milestone.manager = _manager;
        milestone.reviewer = _reviewer;
        milestone.recipient = _recipient;
        milestone.campaignReviewer = _campaignReviewer;
        milestone.status = Status.Active;
        // Asociación entre Campaign y Milestone
        milestone.campaignId = _campaignId;
        self.milestones[id] = milestone;
    }

    /**
     * @notice Obtiene el Milestone `_id`
     * @return Milestone cuya identificación coincide con la especificada.
     */
    function getMilestone(Data storage self, uint256 _id)
        public
        view
        returns (Milestone storage)
    {
        require(self.milestones[_id].id != 0, ERROR_MILESTONE_NOT_EXISTS);
        return self.milestones[_id];
    }
}
