pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

/**
 * @title Entity Library
 * @author Mauricio Coronel
 * @notice Librería encargada de la realización de operaciones sobre las Entities.
 */
library EntityLib {
    enum EntityType {Dac, Campaign, Milestone}

    /// @dev Estructura que define la base de una entidad.
    struct Entity {
        uint256 id; // Identificación de la entidad
        uint256 idIndex; // Índice del Id en entityIds;
        EntityType entityType;
    }

    struct Data {
        /**
         * @dev Almacena los ids de la entities para poder iterar en el iterable mapping de Entities.
         * Desde esta variable son generados todos los identificadores de entidades.
         */
        uint256[] ids;
        /// @dev Iterable Mapping de Entities
        mapping(uint256 => Entity) entities;
    }

    /**
     * @notice Crea una entidad base del tipo `entityType`.
     * @param self contenedor con los datos de las entidades.
     * @param entityType tipo de la entidad a crear.
     * @return identificador de la entidad creada.
     */
    function createEntity(Data storage self, EntityType entityType)
        internal
        returns (uint256 entityId)
    {
        entityId = self.ids.length + 1; // Generación del Id único por entidad.
        self.ids.push(entityId);
        uint256 idIndex = self.ids.length - 1;
        self.entities[entityId] = Entity(entityId, idIndex, entityType);
    }

    /**
     * @notice Obtiene todas las Entities.
     * @dev Dado que no puede retornarse un mapping, las Entities son convertidas primeramente en una lista.
     * @param self contenedor con los datos de las entidades.
     * @return Lista con todas las Entities.
     */
    function getAll(Data storage self) public view returns (Entity[] memory) {
        Entity[] memory result = new Entity[](self.ids.length);
        for (uint256 i = 0; i < self.ids.length; i++) {
            result[i] = self.entities[self.ids[i]];
        }
        return result;
    }
}
