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

        let mp_contract = await App.contracts.Marketplace.deployed();

        let is_so = await mp_contract.isStoreOwner();

        if (is_so) {

            $('#user-greeting').text("Hello Store Owner");
            $('#user-address').text(account);
            await App.updateOwnerBalance(account);

            let mp_contract = await App.contracts.Marketplace.deployed();
            let storeIds = await mp_contract.getOwnersStoreIds();
            App.storeIds = storeIds;

            await App.showStoreView();
        }
        else {
            alert("You are not as store owner.")
            window.location.href = '/';
        }

    },

    showStoreView: async function () {
        let mp_contract = await App.contracts.Marketplace.deployed();

        $("#sf-name-to-add").val('');

        // populate list of store fronts
        $("#sf-list tbody").html('');
        for (let i = 0; i < App.storeIds.length; i++) {

            let sf = await mp_contract.getStore(App.storeIds[i]);
            let sales_ether = web3.fromWei(sf[4], "ether");

            let row =
                `<tr>
                     <th scope="row">${i}</th>
                     <td>${sf[2]}</td>
                     <td>${sales_ether}</td>
                     <td>${sf[5]}</td>
                     <td>
                         <button type="button" class="btn btn-info" onclick="App.withdrawSales(${i}, ${sf[4]})">
                             Withdraw Sales
                          </button>
                     </td>
                      <td>
                          <button type="button"  class="btn btn-info" onclick="App.manageItems(${sf[1]})">
                              Manage Items
                          </button>
                      </td>
                    </tr>`;

            $("#sf-list tbody").append(row);
        }
    },

    withdrawSales: async function (index, sales_balance) {
        let sf = App.storeIds[index];

        if (sales_balance == 0) {

            alert("Unable to withdraw.  Store has 0 ETH in sales");
            return;
        }

        // let sales_ether = web3.fromWei(sf[4], "ether");
        let accounts = web3.eth.accounts;
        let account = accounts[0];

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.withdrawSalesFromStore(sf, {from: account});

        await App.showStoreView();

        App.updateOwnerBalance(account);

    },

    manageItems: async function (contract_index) {
        window.location.href = "/items.html?store-idx=" + contract_index;
    },

    addStoreFront: async function (event) {
        event.preventDefault();

        let sf_to_add = $("#sf-name-to-add").val();

        if (sf_to_add == '' || sf_to_add == undefined) {
            alert("Name not specified")
            return;
        }

        let mp_contract = await App.contracts.Marketplace.deployed();
        await mp_contract.createStore(sf_to_add);

        App.showStoreView();
    },

    updateOwnerBalance: async function(account) {
        web3.eth.getBalance(account, function (error, result) {

            if (!error) {
                let balance = web3.fromWei(result.valueOf(), "ether");
                $('#user-balance').text("Your Balance: " +  Number(balance).toFixed(2) + " ETH");
            } else {
                console.error(error);
            }
        });
    }
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});