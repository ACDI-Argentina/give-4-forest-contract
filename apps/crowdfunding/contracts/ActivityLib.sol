pragma solidity ^0.4.24;

/**
 * @title Librería de Activity de Milestones.
 * @author ACDI
 * @notice Librería encargada del tratamiento de Milestones.
 */
library ActivityLib {
    /// @dev Estructura que define los datos de una Actividad en un Milestone.
    struct Activity {
        uint256 id; // Identificación del Activity
        uint256 idIndex; // Índice del Id en ActivityIds;
        string infoCid; // IPFS Content ID de las información (JSON) del Item del Milestone.
        address user; // Address del usuario que realiza la actividad.
        uint256 milestoneId; // Id del Milestone al cual pertenece
    }
    struct Data {
        /// @dev Almacena los ids de las Activities para poder iterar
        /// en el iterable mapping de Activities
        uint256[] ids;
        /// @dev Iterable Mapping de Activities
        mapping(uint256 => Activity) activities;
    }
    /// @dev Estructura que define los datos de un Item de Milestone.
    /*struct Item {
        uint256 id; // Identificación del Item
        uint256 idIndex; // Índice del Id en ItemIds;
        string infoCid; // IPFS Content ID de las información (JSON) del Item del Milestone.
        uint256 activityId; // Id del Activity al cual pertenece.
    }*/

    string
        internal constant ERROR_ACTIVITY_NOT_EXISTS = "CROWDFUNDING_ACTIVITY_NOT_EXIST";

    /**
     * @notice Inserta una nueva Activity al Milestone.
     */
    function insert(
        Data storage self,
        string _activityInfoCid,
        address _user,
        uint256 _milestoneId
    ) public returns (uint256 id) {
        id = self.ids.length + 1; // Generación del Id único por activity.
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Activity memory activity;
        activity.id = id;
        activity.idIndex = idIndex;
        activity.infoCid = _activityInfoCid;
        activity.user = _user;
        activity.milestoneId = _milestoneId;
        self.activities[id] = activity;
    }

    /**
     * @notice Obtiene la activity `_id`
     * @return Activity cuya identificación coincide con la especificada.
     */
    function getActivity(Data storage self, uint256 _id)
        public
        view
        returns (Activity storage)
    {
        require(self.activities[_id].id != 0, ERROR_ACTIVITY_NOT_EXISTS);
        return self.activities[_id];
    }
}
