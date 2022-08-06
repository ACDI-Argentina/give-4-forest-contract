pragma solidity ^0.4.24;

/**
 * @title Array Library
 * @author ACDI
 * @notice Librería encargada de mantener utilidades sobre Arrays.
 */
library ArrayLib {
    /**
     * @dev Determina si una arreglo contiene un elemento o no.
     * @param _array arreglo de elementos
     * @param _element elemento a determinar si se encuentra dentro del arreglo o no.
     * @return si elemento existe o no dentro del arreglo.
     */
    function contains(uint256[] _array, uint256 _element)
        public
        pure
        returns (bool)
    {
        return indexOf(_array, _element) >= 0;
    }

    /**
     * @dev Obtiene el índice del _element en el _array. Devuelve -1 si el elemento
     *  no es encontrado.
     * @param _array arreglo de elementos
     * @param _element elemento a determinar el indice
     * @return índice del elemento dentro del arreglo. -1 si el elemento
     *  no es encontrado.
     */
    function indexOf(uint256[] _array, uint256 _element)
        public
        pure
        returns (int256)
    {
        for (uint256 i = 0; i < _array.length; i++) {
            if (_array[i] == _element) {
                return int256(i);
            }
        }
        return -1;
    }

    /**
     * @dev Elimina el elemento del _array cuyo íncice coincide con el especificado.
     * @param _array arreglo de elementos
     * @param _index índice del elemento a eliminar.
     * @return arreglo con el elemento eliminado.
     */
    function remove(uint256[] storage _array, uint256 _index) public {
        if (_index >= _array.length) {
            return;
        }
        for (uint256 i = _index; i < _array.length - 1; i++) {
            _array[i] = _array[i + 1];
        }
        delete _array[_array.length - 1];
        _array.length--;
    }

    /**
     * @dev Elimina el _element del _array. Solamente elimina el primer elemento encontrado.u
     * @param _array arreglo de elementos
     * @param _element elemento a eliminar.
     * @return arreglo con el elemento eliminado.
     */
    function removeElement(uint256[] storage _array, uint256 _element) public {
        int256 index = indexOf(_array, _element);
        if (index < 0) {
            return;
        }
        remove(_array, uint256(index));
    }
}
