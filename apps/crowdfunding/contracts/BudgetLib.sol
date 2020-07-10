pragma solidity ^0.4.24;

/**
 * @title Librería de Presupuestos.
 * @author Mauricio Coronel
 * @notice Librería encargada del tratamiento de Presupuestos.
 */
library BudgetLib {
    enum Status {
        Budgeted, // Los fondos del presupuesto están comprometidos.
        Paying, // No utilizado por el momento. Se utiliza si se utiliza una aprobación de pago antes de hacerlo efectivo-
        Closed, // EL presupuesto se cierra sin realizarse el pago.
        Paid // El presupuesto fue pagado.
    }

    /// @dev Estructura que define los datos de un Presupuesto para una Entidad.
    struct Budget {
        uint256 id; // Identificación del presupuesto.
        uint256 idIndex; // Índice del Id en butguIds;
        uint256 entityId; // Identificación de la entidad al cual está destinado el presupuesto.
        address token; // Token del presupuesto.
        uint256 amount; // Monto del presupuesto.
        uint256[] donationIds; // Ids de las donaciones del presupuesto.
        Status status;
    }

    struct Data {
        /// @dev Almacena los ids de las presupuestos para poder iterar
        /// en el iterable mapping de presupuestos.
        uint256[] ids;
        /// @dev Iterable Mapping de Presupuesto
        mapping(uint256 => Budget) budgets;
    }

    string
        internal constant ERROR_BUDGET_NOT_EXISTS = "CROWDFUNDING_BUDGET_NOT_EXIST";

    function insert(
        Data storage self,
        uint256 _entityId,
        address _token
    ) public returns (uint256 id) {
        id = self.ids.length + 1; // Generación del Id único por presupuesto.
        self.ids.push(id);
        uint256 idIndex = self.ids.length - 1;
        Budget memory budget;
        //budget = self.budgets[id];
        budget.id = id;
        budget.idIndex = idIndex;
        budget.entityId = _entityId;
        budget.token = _token;
        // El presupuesto se inicializa en 0 tokens.
        budget.amount = 0;
        budget.status = Status.Budgeted;
        self.budgets[id] = budget;
        // Se asocia el presupuesto a la entidad
        //entityData.entities[_entityId].budgetIds.push(budgetId);
    }

    /**
     * @notice Obtiene el presupuesto `_id`
     * @return Presupuesto cuya identificación coincide con la especificada.
     */
    function getBudget(Data storage self, uint256 _id)
        public
        view
        returns (
            //budgetExists(_id)
            Budget storage
        )
    {
        require(self.budgets[_id].id != 0, ERROR_BUDGET_NOT_EXISTS);
        return self.budgets[_id];
    }
}
