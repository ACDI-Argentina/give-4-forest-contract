pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

/**
 * @title Milestone Library
 * @author Mauricio Coronel
 * @notice Librería encargada de la realización de operaciones sobre los Milestones.
 */
library MilestoneLib {
    enum Status {Active, Cancelled}
    /// @dev Estructura que define los datos de una Milestone.
    struct Milestone {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en MilestoneIds;
        string infoCid; // IPFS Content ID de las información (JSON) del Milestone.
        uint256 maxAmount;
        address manager;
        address reviewer;
        address recipient;
        address campaignReviewer;
        uint256 campaignId; // Id de las campaign relacionada.
        // TODO Agregar Items
        Status status;
    }

    struct Data {
        /// @dev Almacena los ids de la Milestones para poder iterar en el iterable mapping de Milestones
        uint256[] ids;
        /// @dev Iterable Mapping de Milestones
        mapping(uint256 => Milestone) milestones;
    }

    /**
     * @notice Crea el Milestone `title`. Quien envía la transacción es el manager del Milestone.
     * @param self Contenedor con los datos de los Milestones.
     * @param id Id del Milestone.
     * @param infoCid Content ID de los datos (JSON) del Milestone. IPFS Cid.
     * @param campaignId Id de la Campaign a la cual pertenece el Milestone.
     * @param maxAmount Monto máximo para financiar el Milestone.
     * @param reviewer address del Milestone Reviewer
     * @param recipient address del Milestone Recipient
     * @param campaignReviewer address del Campaign Reviewer del Milestone
     */
    function createMilestone(
        Data storage self,
        uint256 id,
        string infoCid,
        uint256 campaignId,
        uint256 maxAmount,
        address reviewer,
        address recipient,
        address campaignReviewer
    ) internal {
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Milestone memory milestone;
        milestone.id = id;
        milestone.idIndex = idIndex;
        milestone.infoCid = infoCid;
        milestone.maxAmount = maxAmount;
        milestone.manager = msg.sender;
        milestone.reviewer = reviewer;
        milestone.recipient = recipient;
        milestone.campaignReviewer = campaignReviewer;
        milestone.status = Status.Active;
        // Asociación entre Campaign y Milestone
        milestone.campaignId = campaignId;
        self.milestones[id] = milestone;
    }

    /**
     * @notice Obtiene todas los Milestones.
     * @dev Dado que no puede retornarse un mapping, los Milestones son convertidas primeramente en una lista.
     * @param self contenedor con los datos de los Milestones.
     * @return Lista con todos los Milestones.
     */
    function getAll(Data storage self)
        public
        view
        returns (Milestone[] memory)
    {
        Milestone[] memory result = new Milestone[](self.ids.length);
        for (uint256 i = 0; i < self.ids.length; i++) {
            result[i] = self.milestones[self.ids[i]];
        }
        return result;
    }
}
