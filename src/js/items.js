App = {
    web3Provider: null,
    contracts: {},
    storeId: null,
    storeIndex: null,
    itemIds: [],

    get_url_params: function () {
        let vars = {};
        let parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    },

    init: async function () {
        return App.initWeb3();
    },

    initWeb3: async function () {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();

            }
            catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }

        return App.initContract();
    },

    initContract: function () {
        $.when(
            $.getJSON('Marketplace.json', function (data) {
                var MarketplaceArtifact = data;
                App.contracts.Marketplace = TruffleContract(MarketplaceArtifact);
                App.contracts.Marketplace.setProvider(App.web3Provider);
            }),
        ).then(function () {
            return App.isStoreOwner();
        });

        return App.bindEvents();
    },

    bindEvents: function () {
        window.ethereum.on('accountsChanged', function (accounts) {
            window.location.href='/';
        })
    },

    isStoreOwner: async function () {
        let accounts = web3.eth.accounts;
        let account = accounts[0];

        $('#user-address').text(account);

        let mp_contract = await App.contracts.Marketplace.deployed();

        let is_so = await mp_contract.isStoreOwner();

        let store_idx = App.get_url_params()['store-idx'];
        App.storeIndex = store_idx;

        if (is_so) {

            $('#user-greeting').text("Hello Store Owner");
            $('#user-address').text(account);

            if (store_idx != undefined && store_idx != '') {

                let sf = await mp_contract.getStoreByIndex(store_idx);
                App.storeId = sf[0];

                await App.showItemsView();
            }
            else {
                alert("No Store Id");
                window.location.href = '/';
            }
        }
        else {
            alert("You are not as store owner");
            window.location.href = '/';
        }
    },

    showItemsView: async function () {

        $("#items-list tbody").html('');
        $("#item-name-to-add").val('');
        $("#item-descr-to-add").val('');
        $("#item-price-to-add").val('');
        $("#item-qty-to-add").val('');

        let mp_contract = await App.contracts.Marketplace.deployed();

        let items_ids = await mp_contract.getStoreItemIds(App.storeId);
        App.itemIds = items_ids;


        for (let i=0; i < App.itemIds.length; i++) {

            let item = await mp_contract.getItem(items_ids[i]);
            let price_ether = web3.fromWei(item[4], "ether");

            let row =
                `<tr>
                     <th scope="row">${i}</th>
                     <td>${item[2]}</td>
                     <td>${item[3]}</td>
                     <td>
                        <input id="item-price-${i}" type="number" class="form-control"  value="${price_ether}" style="width: 100px;">
                        <a  href="#" onclick="App.updateItemPrice(${i})">Update</a>
                     </td>
                     <td>
                        <input id="item-qty-${i}" type="number" class="form-control"  value="${item[5]}" style="width: 100px;">
                        <a  href="#" onclick="App.updateItemQty(${i})">Update</a>
                     </td>
                     <td>
                         <button type="button" class="btn btn-info" onclick="App.deleteItem(${i})">
                             Delete
                          </button>
                     </td>
                    </tr>`;

            $("#items-list tbody").append(row);
        }
    },

    updateItemPrice: async function (item_idx) {

        event.preventDefault();

        let price = $('#item-price-' + item_idx).val();

        if (price == '' || price == undefined || price == 0.0) {
            alert("Price not specified or set to 0");
            return;
        }

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.updateItemPrice(App.storeId, App.itemIds[item_idx], web3.toWei(price, 'ether'));

        App.showItemsView();
    },

    updateItemQty: async function (item_idx) {

        event.preventDefault();

        let qty = $('#item-qty-' + item_idx).val();

        if (qty == '' || qty == undefined || qty == 0.0) {
            alert("Quantity not specified or set to 0");
            return;
        }

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.updateItemQuantity(App.storeId, App.itemIds[item_idx], qty);

        App.showItemsView();
    },

    deleteItem: async function (item_idx) {

        event.preventDefault();

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.removeItem(App.storeId, App.itemIds[item_idx]);

        App.showItemsView();
    },

    addItem: async function (event) {

        event.preventDefault();

        let name = $("#item-name-to-add").val();
        let descr = $("#item-descr-to-add").val();
        let price = $("#item-price-to-add").val();
        let qty = $("#item-qty-to-add").val();

        if (name == '' || name == undefined) {
            alert("Name not specified");
            return;
        }

        if (descr == '' || descr == undefined) {
            alert("Description not specified");
            return;
        }

        if (price == '' || price == undefined || price == 0.0) {
            alert("Price not specified or set to 0");
            return;
        }

        if (qty == '' || qty == undefined || qty == 0.0) {
            alert("Quantity not specified or set to 0");
            return;
        }

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.createItem(
            App.storeId,
            name,
            descr,
            web3.toWei(price, 'ether'),
            qty);

        App.showItemsView();
    },
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});