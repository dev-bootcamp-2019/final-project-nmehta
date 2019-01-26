App = {
    web3Provider: null,
    contracts: {},
    admins: [],
    storeOwners: [],

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
            return App.isAdmin();
        });
    },

    isAdmin: function () {

        let mp_contract;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            let account = accounts[0];
            $('#user-address').text(account);

            App.contracts.Marketplace.deployed().then(function (instance) {
                mp_contract = instance;
                return mp_contract.isAdministrator();

            }).then(function (is_admin) {

                if (is_admin) {
                    window.location.href = '/admin.html';
                }
                else {
                    return App.isStoreOwner();
                }
            });
        });
    },

    isStoreOwner: function () {

        let mp_contract;

        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                console.log(error);
            }

            let account = accounts[0];
            $('#user-address').text(account);

            App.contracts.Marketplace.deployed().then(function (instance) {
                mp_contract = instance;
                return mp_contract.isStoreOwner();

            }).then(function (is_so) {

                if (is_so) {
                    window.location.href = '/storeowner.html';
                }
                else {
                    window.location.href = '/customerstores.html';
                }
            });
        });
    },
};


$(function () {
    $(window).load(function () {
        App.init();
    });
});