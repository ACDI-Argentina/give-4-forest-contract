pragma solidity ^0.4.24;

/**
 * @title Librería de Entities.
 * @author Mauricio Coronel
 * @notice Librería encargada del tratamiento de Entities.
 */
library EntityLib {
    enum EntityType {Dac, Campaign, Milestone}
    /// @dev Estructura que define la base de una entidad.
    struct Entity {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en entityIds;
        EntityType entityType;
        uint256[] budgetIds; // Ids de los presupuestos.
    }

    struct Data {
        /**
         * @dev Almacena los ids de la entities para poder iterar
         *  en el iterable mapping de Entities.
         * Desde esta variable son generados todos los identificadores de entidades.
         */
        uint256[] ids;
        /// @dev Iterable Mapping de Entities
        mapping(uint256 => Entity) entities;
    }

    string
        internal constant ERROR_ENTITY_NOT_EXISTS = "CROWDFUNDING_ENTITY_NOT_EXIST";

    /**
     * @dev Crea una entidad base del tipo `_entityType`.
     * @param _entityType tipo de la entidad a crear.
     * @return identificador de la entidad creada.
     */
    function insert(Data storage self, EntityType _entityType)
        public
        returns (uint256 id)
    {
        id = self.ids.length + 1; // Generación del Id único por entidad.
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Entity memory entity;
        entity.id = id;
        entity.idIndex = idIndex;
        entity.entityType = _entityType;
        self.entities[id] = entity;
    }

    /**
     * @notice Obtiene el Entity `_id`
     * @return Entity cuya identificación coincide con la especificada.
     */
    function getEntity(Data storage self, uint256 _id)
        public
        view
        returns (
            //entityExists(_id)
            Entity storage
        )
    {
        require(self.entities[_id].id != 0, ERROR_ENTITY_NOT_EXISTS);
        return self.entities[_id];
    }
}
