const Marketplace = artifacts.require("Marketplace");
const truffleAssert = require('truffle-assertions');

contract('Marketplace', function (accounts) {

    it("add administrator", async () => {

        let mp = await Marketplace.deployed();

        let tx = await mp.addAdministrator(accounts[1], {from: accounts[0]});
        truffleAssert.eventEmitted(tx, 'AdministratorAdded', (ev) => {
            return ev.admin === accounts[1];
        });

        // Verify added address is admin
        let is_admin = await mp.isAdministrator({from: accounts[1]});
        assert.equal(is_admin.valueOf(), true);

        // Check for event
        await truffleAssert.reverts(mp.addAdministrator(accounts[2], {from: accounts[1]}));
    });

    it("create storeowner", async () => {

        let mp = await Marketplace.deployed();

        let tx = await mp.addStoreOwner(accounts[2], {from: accounts[1]});
        truffleAssert.eventEmitted(tx, 'StoreOwnerAdded', (ev) => {
            return ev.storeOwner == accounts[2] &&
                   ev.administrator == accounts[1];
        });

        let store_owners = await mp.getStoreOwners();
        assert.equal(store_owners.includes(accounts[2]), true);

        await truffleAssert.reverts(mp.addStoreOwner(accounts[2], {from: accounts[1]}));
    });


    it("create/get stores", async () => {

        let mp = await Marketplace.deployed();

        await mp.createStore("First Store", {from: accounts[2]});
        let tx = await mp.createStore("Second Store", {from: accounts[2]});

        let store_ids = await mp.getOwnersStoreIds({from: accounts[2]});
        assert.equal(store_ids.length, 2);

        truffleAssert.eventEmitted(tx, 'StoreCreated', (ev) => {
            return ev.storeOwner === accounts[2] &&
                   ev.storeId == store_ids[1];
        });

        let store = await mp.getStore(store_ids[0]);
        assert.equal(store[2], "First Store");
        assert.equal(store[3], accounts[2]);

        store = await mp.getStore(store_ids[1]);
        assert.equal(store[2], "Second Store");
        assert.equal(store[3], accounts[2]);

        let all_store_ids = await mp.getAllStoreIds();
        assert.equal(all_store_ids.length, 2);

        await truffleAssert.reverts(mp.createStore("First Store", {from: accounts[3]}));
    });

    it("create/get/update/remove items", async () => {

        let mp = await Marketplace.deployed();

        let store_ids = await mp.getOwnersStoreIds({from: accounts[2]});

        await mp.createItem(store_ids[0], "First Item", "This is a cool item", 500, 10, {from: accounts[2]});
        let tx = await mp.createItem(store_ids[0], "Second Item", "This is another cool item", 650, 400, {from: accounts[2]});

        let item_ids = await mp.getStoreItemIds(store_ids[0]);
        assert.equal(item_ids.length, 2);

        truffleAssert.eventEmitted(tx, 'ItemCreated', (ev) => {
            return ev.storeId == store_ids[0] &&
                   ev.name == "Second Item" &&
                   ev.descr == "This is another cool item" &&
                   ev.priceWei == 650 &&
                   ev.qty == 400;
        });

        let item =  await mp.getItem(item_ids[0]);
        assert.equal(item[0], item_ids[0]);
        assert.equal(item[1], 0);
        assert.equal(item[2], "First Item");
        assert.equal(item[3], "This is a cool item");
        assert.equal(item[4], 500);
        assert.equal(item[5], 10);

        item =  await mp.getItem(item_ids[1]);
        assert.equal(item[0], item_ids[1]);
        assert.equal(item[1], 1);
        assert.equal(item[2], "Second Item");
        assert.equal(item[3], "This is another cool item");
        assert.equal(item[4], 650);
        assert.equal(item[5], 400);

        await mp.updateItemPrice(store_ids[0], item_ids[0], 200, {from: accounts[2]});
        await mp.updateItemQuantity(store_ids[0], item_ids[0], 300, {from: accounts[2]});
        item =  await mp.getItem(item_ids[0]);
        assert.equal(item[0], item_ids[0]);
        assert.equal(item[4], 200);
        assert.equal(item[5], 300);

        await mp.removeItem(store_ids[0], item_ids[0], {from: accounts[2]});
        await truffleAssert.reverts(mp.getItem(item_ids[0]));

        item_ids = await mp.getStoreItemIds(store_ids[0]);
        assert.equal(item_ids.length, 1);

        item = await mp.getItem(item_ids[0]);
        assert.equal(item[0], item_ids[0]);
        assert.equal(item[1], 0);
        assert.equal(item[2], "Second Item");
        assert.equal(item[3], "This is another cool item");
        assert.equal(item[4], 650);
        assert.equal(item[5], 400);

        await mp.removeItem(store_ids[0], item_ids[0], {from: accounts[2]});
        item_ids = await mp.getStoreItemIds(store_ids[0]);
        assert.equal(item_ids.length, 0);
    });

    it("item purchase / store withdrawal", async () => {

        let mp = await Marketplace.deployed();

        let store_ids = await mp.getOwnersStoreIds({from: accounts[2]});

        let item_price = web3.utils.toWei("1");

        await mp.createItem(store_ids[0], "First Item", "This is a cool item", item_price, 10, {from: accounts[2]});
        await mp.createItem(store_ids[0], "Second Item", "This is another cool item", 650, 400, {from: accounts[2]});

        let item_ids = await mp.getStoreItemIds(store_ids[0]);
        let tx = await mp.purchaseItem(store_ids[0], item_ids[0], 5, {from: accounts[5], value: 5 * item_price});
        truffleAssert.eventEmitted(tx, 'ItemPurchased', (ev) => {
            return ev.storeId == store_ids[0] &&
                   ev.itemId == item_ids[0] &&
                   ev.qty == 5;
        });

        let store = await mp.getStore(store_ids[0]);
        assert.equal(store[4], (5 * item_price));

        let item = await mp.getItem(item_ids[0]);
        assert.equal(item[5], 10-5);

        // Check that revert occurs when sender is not store owner
        await truffleAssert.reverts(mp.purchaseItem(store_ids[0], item_ids[0], 6, {from: accounts[5], value: 6 * item_price}));

        // Check that revert occurs when value is less than purchase price
        await truffleAssert.reverts(mp.purchaseItem(store_ids[0], item_ids[0], 4, {from: accounts[5], value: item_price}));

        // Verify that withdrawal is added to account and more than original balance
        // Not doing an equals so as not to worry about cost of gas
        let original_balance = await web3.eth.getBalance(accounts[2]);
        tx = await mp.withdrawSalesFromStore(store_ids[0], {from: accounts[2]});
        let new_balance = await web3.eth.getBalance(accounts[2]);

        assert.isAbove(Number(new_balance), Number(original_balance));

        truffleAssert.eventEmitted(tx, 'SalesWithdrawnFromStore', (ev) => {
            return ev.storeId == store_ids[0] &&
                   ev.amount == 5 * item_price;
        });

        // Verify that store balance is 0
        store = await mp.getStore(store_ids[0]);
        assert.equal(store[4], 0);

    });

});
