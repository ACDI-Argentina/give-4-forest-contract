pragma solidity ^0.4.24;

/**
 * @title Librería de Milestones.
 * @author ACDI
 * @notice Librería encargada del tratamiento de Milestones.
 */
library MilestoneLib {
    enum Status {
        Active,
        Cancelled,
        Completed, // Fue marcado completado.
        Approved, // Se aprobó una vez completado. Listo para el retiro de fondos.
        Rejected, // Se rechazó una vez completado. Debe volver a completarse.
        Paid // Se finalizó y se retiraron los fondos.
    }
    /// @dev Estructura que define los datos de una Milestone.
    struct Milestone {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en MilestoneIds;
        string infoCid; // IPFS Content ID de las información (JSON) del Milestone.
        uint256 fiatAmountTarget; // Cantidad de dinero Fiat necesario para el Milestone medido en centavos.
        address manager;
        address reviewer;
        address recipient;
        address campaignReviewer;
        uint256 campaignId; // Id de las campaign relacionada.
        uint256[] activityIds; // Ids de las actividades del milestone.
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
        uint256 id, //entityId
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

    function update(
        Data storage self,
        uint256 id, //entityId
        string _infoCid,
        uint256 _campaignId,
        uint256 _fiatAmountTarget,
        address _manager,
        address _reviewer,
        address _recipient,
        address _campaignReviewer
    ) public {
        //self.ids.push(id);  ya existe
        //uint256 idIndex = self.ids.length - 1; inmutable
        Milestone storage milestone = self.milestones[id];
        //milestone.id = id; inmutable
        //milestone.idIndex = idIndex; inmutable
        milestone.infoCid = _infoCid;
        milestone.fiatAmountTarget = _fiatAmountTarget;
        //milestone.manager = _manager;  //el manager no se va a cambiar por el msg sender
        milestone.reviewer = _reviewer;
        milestone.recipient = _recipient;
        milestone.campaignReviewer = _campaignReviewer;
        //milestone.status = Status.Active; inmutable
        // Asociación entre Campaign y Milestone
        //milestone.campaignId = _campaignId;
        //self.milestones[id] = milestone;
    }


    function save(
        Data storage self,
        uint256 id, //entityId
        string _infoCid,
        uint256 _campaignId,
        uint256 _fiatAmountTarget,
        address _manager,
        address _reviewer,
        address _recipient,
        address _campaignReviewer,
        uint256 _milestoneId
    ) public {
        if(_milestoneId == 0 ){ //new 
            return insert(self,id,_infoCid,_campaignId,_fiatAmountTarget,_manager,_reviewer,_recipient,_campaignReviewer);
        } else {
            getMilestone(self,_milestoneId); //check if exists
            return update(self,id,_infoCid,_campaignId,_fiatAmountTarget,_manager,_reviewer,_recipient,_campaignReviewer);
        }
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
