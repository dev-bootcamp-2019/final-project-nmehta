App = {
    web3Provider: null,
    contracts: {},
    storeIds: [],

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

        console.log('isStoreOwner');

        let accounts = web3.eth.accounts;
        let account = accounts[0];

        $('#user-address').text(account);

        let mp_contract = await App.contracts.Marketplace.deployed();

        let is_so = await mp_contract.isStoreOwner();
        let is_admin = await mp_contract.isAdministrator();

        if (!is_so && !is_admin) {

            $('#user-greeting').text("Hello Customer");
            $('#user-address').text(account);

            let mp_contract = await App.contracts.Marketplace.deployed();
            let storeIds = await mp_contract.getAllStoreIds();
            App.storeIds = storeIds;

            await App.showStoreView();
        }
        else {
            alert("You are not a customer.")
            window.location.href = '/';
        }

    },

    showStoreView: async function () {
        console.log("in store view");

        let mp_contract = await App.contracts.Marketplace.deployed();

        $("#storefront-view").show();

        $("#sf-list tbody").html('');
        for (let i = 0; i < App.storeIds.length; i++) {

            let sf = await mp_contract.getStore(App.storeIds[i]);
            let sales_ether = web3.fromWei(sf[4], "ether");

            let row =
                `<tr>
                     <th scope="row">${i}</th>
                     <td>${sf[2]}</td>
                     <td>${sf[5]}</td>
                      <td>
                          <button type="button"  class="btn btn-info" onclick="App.browseItems(${sf[1]})">
                              Browse Items
                          </button>
                      </td>
                    </tr>`;

            $("#sf-list tbody").append(row);
        }
    },

    browseItems: async function (contract_index) {
        window.location.href = "/customeritems.html?store-idx=" + contract_index;
    },
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});