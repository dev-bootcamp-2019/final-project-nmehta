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
            return App.isCustomer();
        });

        return App.bindEvents();
    },

    bindEvents: function () {

        window.ethereum.on('accountsChanged', function (accounts) {
            window.location.href='/';
        })
    },

    isCustomer: async function () {

        let accounts = web3.eth.accounts;
        let account = accounts[0];

        $('#user-address').text(account);

        let mp_contract = await App.contracts.Marketplace.deployed();

        let is_so = await mp_contract.isStoreOwner();
        let is_admin = await mp_contract.isAdministrator();

        let store_idx = App.get_url_params()['store-idx'];
        App.storeIndex = store_idx;

        if (!is_so && !is_admin) {

            $('#user-greeting').text("Hello Customer");
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
            alert("You are not a customer");
            window.location.href = '/';
        }

    },

    showItemsView: async function () {

        $("#items-list tbody").html('');

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
                     <td>${price_ether}</td>
                     <td>${item[5]}</td>
                     <td>
                         <input id="item-buy-qty-${i}" type="number" class="form-control" placeholder="Qty to Buy">
                     </td>
                     <td>
                         <button type="button" class="btn btn-info" onclick="App.buyItem(${i}, ${item[5]}, ${item[4]})">Buy</button>
                     </td>
                   </tr>`;

            $("#items-list tbody").append(row);
        }
    },

    buyItem: async function (item_idx, avail_qty, price_wei) {

        event.preventDefault();

        let qty_to_buy = $('#item-buy-qty-' + item_idx).val();

        if (qty_to_buy == '' || qty_to_buy == undefined || qty_to_buy == 0) {
            alert("Quantity to buy is not specified or set to 0");
            return;
        }

        if (avail_qty == 0) {
            alert("No quantity available to purchase");
            return;
        }

        if (qty_to_buy > avail_qty) {
            alert("Quantity to buy exceeds available quantity");
            return;
        }

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.purchaseItem(App.storeId, App.itemIds[item_idx], qty_to_buy, {value: qty_to_buy*price_wei});

        App.showItemsView();
    },
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});