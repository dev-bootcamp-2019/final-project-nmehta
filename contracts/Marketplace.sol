pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

/*
* @title Marketplace
*
* @dev This contract respresents basic marketplace where
*
* Administrators can add owners.
* Owners can create storefronts, add/edit/update/remove items to/from
* a store front.
* Customers can browse and purchase items.
*
* Store owner can also withdraw sales from a store.
*
*/
contract Marketplace is Ownable, Pausable {

    using SafeMath for uint;

    /**
    * @dev represents a product item
    */
    struct Item {
        bytes32 id;
        uint index;

        string name;
        string description;
        uint priceWei;
        uint quantity;

        bool exists;
    }

    /**
    * @dev represents a store, maintains sales balance
    */
    struct Store {
        bytes32 id;
        uint index;

        string name;
        address owner;
        uint salesWei;
        bool exists;
    }

    /**
    * @dev item lookup and array of items keyed by store id
    */
    mapping (bytes32 => Item) itemIdToItem;
    mapping (bytes32 => bytes32[]) private storeIdToItemIds;

    /**
    * @dev array of storIds, and mapping from id to store struct
    */
    bytes32[] private storeIds;
    mapping (bytes32 => Store) private storeIdToStore;

    /**
    * @dev array of storIds, and mapping from store owner to store id
    * Also maintain status on if an address is a store owner.
    */
    address[] private storeOwners;
    mapping (address => bytes32[]) private storeOwnerToStoreIds;
    mapping (address => bool) private storeOwnerStatus;

    /**
    * @dev array of admins and status by address
    * If true, address is an admin
    */
    address[] private administrators;
    mapping (address => bool) private administratorStatus;

    /**
    * @dev List if events.
    */
    event AdministratorAdded(address admin);
    event StoreOwnerAdded(address storeOwner, address administrator);
    event StoreCreated(address storeOwner, bytes32 storeId);
    event ItemCreated(bytes32 storeId, string name, string descr, uint priceWei, uint qty);
    event ItemPriceUpdated(bytes32 storeId, bytes32 itemId, uint priceWei);
    event ItemQuantityUpdated(bytes32 storeId, bytes32 itemId, uint qty);
    event ItemRemoved(bytes32 storeId, bytes32 itemId);
    event ItemPurchased(bytes32 storeId, bytes32 itemId, uint qty);
    event SalesWithdrawnFromStore(bytes32 storeId, uint amount);

    /**
    * @dev modifiers that restrict access
    * For admin only functions, functions for store owners, and functions only for owner of
    * a specific store.
    */
    modifier onlyAdministrator() {require (administratorStatus[msg.sender] == true, "   Not an admin"); _;}
    modifier onlyStoreOwner() {require (storeOwnerStatus[msg.sender] == true, "Not an owner"); _;}
    modifier onlyOwnerOfStore(bytes32 id) {require(storeIdToStore[id].owner == msg.sender, "Does not own store"); _;}

    /**
    * @dev add owner of contract as default admin.
    */
    constructor() public {
        administratorStatus[msg.sender] = true;
        administrators.push(msg.sender);
    }

    /**
    * @dev adds msg.sender as administrator.  Only owner of contract can do this.
	*/
    function addAdministrator(address _address) public onlyOwner whenNotPaused {

        require(administratorStatus[_address] == false, "User is already an administrator");

        administratorStatus[_address] = true;
        administrators.push(_address);

        emit AdministratorAdded(_address);

    }

    /**
    * @dev checks if msg.sender is an admin
	* @return true if admin, else false
	*/
    function isAdministrator() public view returns (bool) {

        return administratorStatus[msg.sender];
    }

    /**
    * @dev get list of admin addresses
	* @return array of admins
	*/
    function getAdministrators() public view returns (address[] memory) {
        return administrators;
    }

    /**
    * @dev add given address as a store owner (only admins can do this)
	* @param _address to add
	*/
    function addStoreOwner(address _address) public onlyAdministrator whenNotPaused {

        require(storeOwnerStatus[_address] == false, "User is already a store owner");

        storeOwners.push(_address);
        storeOwnerStatus[_address] = true;

        emit StoreOwnerAdded(_address, msg.sender);
    }

    /**
    * @dev checks if msg.sender is a store owner
	* @return true if store owner
	*/
    function isStoreOwner() public view returns (bool) {

        return storeOwnerStatus[msg.sender];
    }

     /**
    * @dev get list of store owner ids
	* @return array of owner ids (bytes32)
	*/
    function getStoreOwners() public view returns (address[] memory) {
        return storeOwners;
    }

    /**
    * @dev create a new store
    * @param _name of store
	* @return returns id of created store (bytes32)
	*/
    function createStore(string memory _name) public onlyStoreOwner whenNotPaused returns (bytes32) {

        bytes32 _id = keccak256(abi.encodePacked(msg.sender, _name, now));
        storeIdToStore[_id].id = _id;
        storeIdToStore[_id].index = storeIds.push(_id) - 1;
        storeIdToStore[_id].name = _name;
        storeIdToStore[_id].owner = msg.sender;
        storeIdToStore[_id].exists = true;

        storeOwnerToStoreIds[msg.sender].push(_id);

        emit StoreCreated(msg.sender, _id);

        return _id;
    }

    /**
    * @dev Owner of store can withdraws sales balance from a given store
	* @param _storeId id of store
	* @return none
	*/
    function withdrawSalesFromStore(bytes32 _storeId) public onlyOwnerOfStore(_storeId) whenNotPaused {

		require(storeIdToStore[_storeId].exists, "Store does not exist");
        require(storeIdToStore[_storeId].salesWei > 0, "No sales amount ot withdraw");

        uint amount = storeIdToStore[_storeId].salesWei;
        storeIdToStore[_storeId].salesWei = 0;
		msg.sender.transfer(amount);

        emit SalesWithdrawnFromStore(_storeId, amount);
	}

    /**
    * @dev Given id, return store struct
	* @param _id of store
	* @return tuple of store attributes
	*/
    function getStore(bytes32 _id) public view returns (bytes32, uint, string memory, address, uint, uint) {

        require(storeIdToStore[_id].exists, "Store does not exist");

        Store memory s = storeIdToStore[_id];

        return (s.id, s.index, s.name, s.owner, s.salesWei, storeIdToItemIds[_id].length);
    }

    /**
    * @dev given index of storeId in storeIds, return store
	* @param _index of store
	* @return store struct
	*/
    function getStoreByIndex(uint _index) public view returns (bytes32, uint, string memory, address, uint, uint) {

        require(_index >= 0 && _index < storeIds.length, "Invalid index");

        return this.getStore(storeIds[_index]);
    }

    /**
    * @dev get list of store_ids managed by specific store owner
	* @return array of storeIds [bytes32]
	*/
    function getOwnersStoreIds() public view onlyStoreOwner returns (bytes32[] memory) {
        return storeOwnerToStoreIds[msg.sender];
    }

    /**
    * @dev get array of all created storeIds
	* @return array of storeIds [bytes32]
	*/
    function getAllStoreIds() public view returns (bytes32[] memory) {
        return storeIds;
    }

    /**
    * @dev create a new product item in store
	* @param _storeId   id of store
	* @param _name      name of item
	* @param _descr     description of item
	* @param _priceWei  price of item in wei
	* @param _qty       # units
	*
	* @return _id of created item (bytes32
	*/
    function createItem(bytes32 _storeId, string memory _name, string memory _descr, uint _priceWei, uint _qty)
        public
        onlyOwnerOfStore(_storeId)
        whenNotPaused
        returns (bytes32) {

        bytes32 _id = keccak256(abi.encodePacked(msg.sender, _name, now));
        itemIdToItem[_id].id = _id;
        itemIdToItem[_id].index = storeIdToItemIds[_storeId].push(_id) - 1;
        itemIdToItem[_id].name = _name;
        itemIdToItem[_id].description = _descr;
        itemIdToItem[_id].priceWei = _priceWei;
        itemIdToItem[_id].quantity = _qty;
        itemIdToItem[_id].exists = true;

        emit ItemCreated(_storeId, _name, _descr, _priceWei, _qty);

        return _id;
    }

    /**
    * @dev for a created item, update the price
	* @param _storeId id of store,
	* @param _itemId id of item
	* @param _priceWei new price to set
	*/
    function updateItemPrice(bytes32 _storeId, bytes32 _itemId, uint _priceWei)
        public
        onlyOwnerOfStore(_storeId)
        whenNotPaused {

        require(itemIdToItem[_itemId].exists, "Item does not exist");

        itemIdToItem[_itemId].priceWei = _priceWei;

        emit ItemPriceUpdated(_storeId, _itemId, _priceWei);
    }

    /**
    * @dev for a created item, update the quantity
	* @param _storeId id of store,
	* @param _itemId id of item,
	* @param _qty new unit quantity
	*/
    function updateItemQuantity(bytes32 _storeId, bytes32 _itemId, uint _qty)
        public
        onlyOwnerOfStore(_storeId)
        whenNotPaused {

        require(itemIdToItem[_itemId].exists, "Item does not exist");

        itemIdToItem[_itemId].quantity = _qty;

        emit ItemQuantityUpdated(_storeId, _itemId, _qty);
    }

     /**
    * @dev removes an item from various structs.
	* @param _storeId id of store,
	* @param _itemId id of item to be removed
	*/
    function removeItem(bytes32 _storeId, bytes32 _itemId)
        public
        onlyOwnerOfStore(_storeId)
        whenNotPaused {

        require(itemIdToItem[_itemId].exists, "Item does not exist");

        // Swaps the last item with index of the item to be removed and shortens array.
        if (storeIdToItemIds[_storeId].length > 1) {

            Item storage itemToDelete = itemIdToItem[_itemId];

            bytes32 lastItemId = storeIdToItemIds[_storeId][storeIdToItemIds[_storeId].length - 1];
            Item storage lastItem = itemIdToItem[lastItemId];

            storeIdToItemIds[_storeId][itemToDelete.index] = lastItemId;
            lastItem.index = itemToDelete.index;

            storeIdToItemIds[_storeId][storeIdToItemIds[_storeId].length - 1] = _itemId;
        }

        delete itemIdToItem[_itemId];
        storeIdToItemIds[_storeId].pop();

        emit ItemRemoved(_storeId, _itemId);
    }

    /**
    * @dev  customer purchases an item from store
	* @param _storeId id of store,
	* @param _itemId id of store,
	* @param _qty units purchased
	*/
    function purchaseItem(bytes32 _storeId, bytes32 _itemId, uint _qty) public payable whenNotPaused {

        require(storeIdToStore[_storeId].exists, "Store does not exist");
        require(itemIdToItem[_itemId].exists, "Item does not exist");
        require(_qty > 0, "Purchase quantity must be greater than 0");

		Item storage item = itemIdToItem[_itemId];

        require(item.quantity >= _qty, "Insufficient quantity");

		uint total = item.priceWei.mul(_qty);
		require(msg.value >= total, "Insufficient funds");

		item.quantity = item.quantity.sub(_qty);
		storeIdToStore[_storeId].salesWei = storeIdToStore[_storeId].salesWei.add(total);

        emit ItemPurchased(_storeId, _itemId, _qty);
	}

    /**
    * @dev get item details via itemId
	* @param _itemId id of item
	* @return tuple of item attributes
	*/
    function getItem(bytes32 _itemId) public view returns (bytes32, uint, string memory, string memory, uint, uint) {

        require(itemIdToItem[_itemId].exists, "Item does not exist");

        return (
            itemIdToItem[_itemId].id,
            itemIdToItem[_itemId].index,
            itemIdToItem[_itemId].name,
            itemIdToItem[_itemId].description,
            itemIdToItem[_itemId].priceWei,
            itemIdToItem[_itemId].quantity);
    }

    /**
    * @dev given a storeId return all itemIds belonging to store
	* @param _storeId id of store
	* @return array of item ids
	*/
    function getStoreItemIds(bytes32 _storeId) public view returns (bytes32[] memory) {

        require(storeIdToStore[_storeId].exists, "Store does not exist");

        return storeIdToItemIds[_storeId];
    }

    /**
    * @dev get balance for address owning contract
	* @return balance in wei
	*/
    function getBalance() public view returns (uint) {
		return address(this).balance;
	}

}